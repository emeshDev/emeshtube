import { db } from "@/db";
import { videos } from "@/db/schema";
import { mux } from "@/lib/mux";
import { updateThumbnailSchema, updateVideoSchema } from "@/lib/schema/video";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  deleteThumbnailFile,
  deleteThumbnailByUrl,
} from "@/lib/uploadthing-server";

export const videosRouter = createTRPCRouter({
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
