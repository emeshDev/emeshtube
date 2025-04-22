import { db } from "@/db";
import { users, videos } from "@/db/schema";
import { mux } from "@/lib/mux";
import { updateThumbnailSchema, updateVideoSchema } from "@/lib/schema/video";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  deleteThumbnailFile,
  deleteThumbnailByUrl,
} from "@/lib/uploadthing-server";

// Gunakan Map untuk melacak ID video yang baru saja dilihat untuk menghindari double count
const recentViews = new Map<string, Set<string>>();

// Bersihkan data yang lebih lama dari 30 menit secara berkala
setInterval(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

  for (const [videoId, viewers] of recentViews.entries()) {
    if (viewers.size === 0) {
      recentViews.delete(videoId);
    }
  }
}, 10 * 60 * 1000); // Bersihkan setiap 10 menit

export const videosRouter = createTRPCRouter({
  getById: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { id } = input;
      try {
        // get video with creator information
        const result = await db
          .select({
            video: videos,
            creator: {
              id: users.id,
              name: users.name,
              imageUrl: users.imageUrl,
            },
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .where(eq(videos.id, id))
          .limit(1);

        if (!result.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found",
          });
        }

        return result[0];
      } catch (error) {
        console.error("Error fetching video:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch video",
        });
      }
    }),

  getHomeVideos: baseProcedure
    .input(
      z.object({
        categoryId: z.string().uuid().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(16),
      })
    )
    .query(async ({ input }) => {
      const { categoryId, cursor, limit } = input;

      try {
        // Build query conditions
        const conditions = [eq(videos.visibility, "public")];

        if (categoryId) {
          conditions.push(eq(videos.categoryId, categoryId));
        }

        if (cursor) {
          const cursorVideo = await db
            .select({ createdAt: videos.createdAt })
            .from(videos)
            .where(eq(videos.id, cursor))
            .limit(1);

          if (cursorVideo.length > 0) {
            conditions.push(
              sql`(${videos.createdAt},${videos.id})<(${cursorVideo[0].createdAt},${cursor})`
            );
          }
        }

        // Get videos with creators
        const videosWithCreators = await db
          .select({
            video: {
              id: videos.id,
              title: videos.title,
              thumbnailUrl: videos.thumbnailUrl,
              createdAt: videos.createdAt,
              viewCount: videos.viewCount,
              duration: videos.duration,
              visibility: videos.visibility,
              userId: videos.userId,
              categoryId: videos.categoryId,
            },
            creator: {
              id: users.id,
              name: users.name,
              imageUrl: users.imageUrl,
            },
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(videos.createdAt), desc(videos.id))
          .limit(limit + 1); // Fetch one extra to determine if there are more

        // Filter out any items with null creators (in case there are orphaned videos)
        const validVideos = videosWithCreators.filter(
          (item) => item.creator && item.creator.id !== null
        );

        const hasNextPage = validVideos.length > limit;
        const videosList = hasNextPage
          ? videosWithCreators.slice(0, limit)
          : videosWithCreators;

        const nextCursor =
          hasNextPage && videosList.length > 0
            ? videosList[videosList.length - 1].video.id
            : undefined;

        return {
          videos: videosList,
          nextCursor,
        };
      } catch (error) {
        console.error("Error fetching home videos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch home videos",
        });
      }
    }),
  // Procedure terpisah untuk increment view count
  incrementViewCount: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        viewerId: z.string().optional(), // ID opsional untuk mengidentifikasi viewer
      })
    )
    .mutation(async ({ input }) => {
      const { videoId, viewerId } = input;

      try {
        // Jika tidak ada viewerId, selalu increment (untuk pengguna yang tidak login)
        if (!viewerId) {
          await db
            .update(videos)
            .set({ viewCount: sql`${videos.viewCount}+1` })
            .where(eq(videos.id, videoId));
          return { success: true };
        }

        // Periksa apakah pengguna ini sudah dihitung untuk video ini
        if (!recentViews.has(videoId)) {
          recentViews.set(videoId, new Set());
        }

        const viewers = recentViews.get(videoId)!;

        // Jika user belum dihitung sebagai view dalam 30 menit terakhir
        if (!viewers.has(viewerId)) {
          // Tambahkan view count
          await db
            .update(videos)
            .set({ viewCount: sql`${videos.viewCount}+1` })
            .where(eq(videos.id, videoId));

          // Tandai user ini sudah melihat video dalam 30 menit terakhir
          viewers.add(viewerId);

          // Set timeout untuk menghapus user dari daftar setelah 30 menit
          setTimeout(() => {
            const viewersSet = recentViews.get(videoId);
            if (viewersSet) {
              viewersSet.delete(viewerId);
            }
          }, 30 * 60 * 1000); // 30 menit
        }

        return { success: true };
      } catch (error) {
        console.error("Error incrementing view count:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update view count",
        });
      }
    }),
  // Get related videos procedure (same category, excluding current video)
  getRelated: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        categoryId: z.string().uuid().optional(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ input }) => {
      const { videoId, categoryId, limit } = input;

      try {
        // Build query conditions
        const conditions = [sql`${videos.id} != ${videoId}`];
        if (categoryId) {
          conditions.push(eq(videos.categoryId, categoryId));
        }

        // Get related videos with creator info
        const relatedVideos = await db
          .select({
            video: videos,
            creator: {
              id: users.id,
              name: users.name,
              imageUrl: users.imageUrl,
            },
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(videos.createdAt))
          .limit(limit);

        return relatedVideos;
      } catch (error) {
        console.error("Error fetching related videos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch related videos",
        });
      }
    }),
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const { id: userId } = ctx.user;

    try {
      // Coba buat upload di Mux
      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          passthrough: userId,
          playback_policy: ["public"],
          video_quality: "basic",
          input: [
            {
              generated_subtitles: [
                {
                  language_code: "en",
                  name: "English",
                },
              ],
            },
          ],
        },
        cors_origin: "*",
      });

      // Jika upload berhasil, buat entri video di database
      const [video] = await db
        .insert(videos)
        .values({ userId, title: "Untitled", muxUploadId: upload.id })
        .returning();

      return {
        video: video,
        url: upload.url,
      };
    } catch (error) {
      // Log error untuk debugging
      console.error("Failed to create Mux upload:", error);

      // Beri respons error yang sesuai berdasarkan jenis kesalahan
      if (error instanceof Error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create video upload: ${error.message}`,
          cause: error,
        });
      }

      // Generic error jika tipe error tidak dikenali
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred while creating the video upload",
      });
    }
  }),

  generateTitle: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { videoId } = input;
      const { user } = ctx;

      try {
        // Cek apakah video milik user
        const videoExists = await db
          .select({
            id: videos.id,
            subtitleContent: videos.subtitleContent,
          })
          .from(videos)
          .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
          .limit(1);

        if (!videoExists.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found or you don't have permission",
          });
        }

        // Cek apakah subtitle tersedia
        if (!videoExists[0].subtitleContent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No subtitle available for this video",
          });
        }

        // Trigger workflow untuk generate title
        const { triggerTitleGeneration } = await import("@/lib/workflow");
        const result = await triggerTitleGeneration(videoId, user.id);

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to trigger title generation: ${result.error}`,
          });
        }

        return {
          success: true,
          message: "Title generation started in background",
          workflowRunId: result.workflowRunId,
        };
      } catch (error) {
        console.error("Error triggering title generation:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to generate title",
        });
      }
    }),

  generateDescription: protectedProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { videoId } = input;
      const { user } = ctx;

      try {
        // Cek apakah video milik user
        const videoExists = await db
          .select({
            id: videos.id,
            subtitleContent: videos.subtitleContent,
          })
          .from(videos)
          .where(and(eq(videos.id, videoId), eq(videos.userId, user.id)))
          .limit(1);

        if (!videoExists.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found or you don't have permission",
          });
        }

        // Cek apakah subtitle tersedia
        if (!videoExists[0].subtitleContent) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No subtitle available for this video",
          });
        }

        // Trigger workflow untuk generate description
        const { triggerDescriptionGeneration } = await import("@/lib/workflow");
        const result = await triggerDescriptionGeneration(videoId, user.id);

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to trigger description generation: ${result.error}`,
          });
        }

        return {
          success: true,
          message: "Description generation started in background",
          workflowRunId: result.workflowRunId,
        };
      } catch (error) {
        console.error("Error triggering description generation:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate description",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { user } = ctx;

      try {
        const videoToDelete = await db
          .select({
            id: videos.id,
            muxAssetId: videos.muxAssetId,
            thumbnailUrl: videos.thumbnailUrl,
          })
          .from(videos)
          .where(and(eq(videos.id, id), eq(videos.userId, user.id)))
          .limit(1);

        if (!videoToDelete.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Video not found or you don't have permission to delete it",
          });
        }

        const video = videoToDelete[0];

        // deleting custom thumbnail from uploadthing
        if (video.thumbnailUrl && video.thumbnailUrl.includes("utfs.io")) {
          console.log(
            `Deleting thumbnail for video ${id}: ${video.thumbnailUrl}`
          );
          await deleteThumbnailByUrl(video.thumbnailUrl);
        }

        if (video.muxAssetId) {
          await mux.video.assets.delete(video.muxAssetId);
          return { success: true };
          // delete db will handle by webhook
        } else {
          const result = await db
            .delete(videos)
            .where(eq(videos.id, id))
            .returning({ id: videos.id });

          if (!result.length) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to delete video",
            });
          }
          return { success: true };
        }
      } catch (error) {
        console.error("Error deleting video:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete video",
        });
      }
    }),

  update: protectedProcedure
    .input(updateVideoSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;
      const { user } = ctx;

      try {
        const videoExists = await db
          .select({ id: videos.id })
          .from(videos)
          .where(and(eq(videos.id, id), eq(videos.userId, user.id)))
          .limit(1);

        if (!videoExists.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found or you dont have permission to update it",
          });
        }

        const [updatedVideo] = await db
          .update(videos)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, id))
          .returning();

        if (!updatedVideo) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update video",
          });
        }

        return updatedVideo;
      } catch (error) {
        console.error("Error deleting video:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete video",
        });
      }
    }),

  updateThumbnail: protectedProcedure
    .input(updateThumbnailSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, thumbnailUrl } = input;
      const { user } = ctx;

      try {
        const videoExists = await db
          .select({ id: videos.id, currentThumbnailUrl: videos.thumbnailUrl })
          .from(videos)
          .where(and(eq(videos.id, id), eq(videos.userId, user.id)))
          .limit(1);

        if (!videoExists.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found or you dont have permission to update it",
          });
        }

        // if there is currentThumbnailUrl, delete it from uploadthing
        if (
          videoExists[0].currentThumbnailUrl &&
          videoExists[0].currentThumbnailUrl.includes("utfs.io") &&
          videoExists[0].currentThumbnailUrl !== thumbnailUrl
        ) {
          console.log(
            `Deleting previous thumbnail: ${videoExists[0].currentThumbnailUrl}`
          );
          await deleteThumbnailByUrl(videoExists[0].currentThumbnailUrl);
        }

        const [updatedVideo] = await db
          .update(videos)
          .set({
            thumbnailUrl,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, id))
          .returning();

        if (!updatedVideo) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update thumbnail",
          });
        }

        return updatedVideo;
      } catch (error) {
        console.error("Error updating thumbnail:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update thumbnail",
        });
      }
    }),

  deleteThumbnail: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        fileKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, fileKey } = input;
      const { user } = ctx;

      try {
        // first, get video data with thumbnailUrl
        const video = await db
          .select({
            id: videos.id,
            thumbnailUrl: videos.thumbnailUrl,
          })
          .from(videos)
          .where(and(eq(videos.id, id), eq(videos.userId, user.id)))
          .limit(1);

        if (!video.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found or you dont have permission to update it",
          });
        }

        const currentVideo = video[0];

        if (fileKey) {
          await deleteThumbnailFile(fileKey);
        } else if (
          currentVideo.thumbnailUrl &&
          currentVideo.thumbnailUrl.includes("utfs.io")
        ) {
          await deleteThumbnailByUrl(currentVideo.thumbnailUrl);
        }

        const [updatedVideo] = await db
          .update(videos)
          .set({
            thumbnailUrl: null,
            updatedAt: new Date(),
          })
          .where(eq(videos.id, id))
          .returning();

        if (!updatedVideo) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete thumbnail",
          });
        }

        return updatedVideo;
      } catch (error) {
        console.error("Error deleting thumbnail:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete thumbnail",
        });
      }
    }),
});
