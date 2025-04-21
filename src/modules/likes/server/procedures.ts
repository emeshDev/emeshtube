import { db } from "@/db";
import { videoLikes, videos, users } from "@/db/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

export const likesRouter = createTRPCRouter({
  toggleLike: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        isLike: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { videoId, isLike } = input;
      const { user } = ctx;

      try {
        const videoExists = await db
          .select({ id: videos.id })
          .from(videos)
          .where(eq(videos.id, videoId))
          .limit(1);

        if (!videoExists.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found",
          });
        }

        const existingReaction = await db
          .select({
            videoId: videoLikes.videoId,
            userId: videoLikes.userId,
            isLike: videoLikes.isLike,
          })
          .from(videoLikes)
          .where(
            and(eq(videoLikes.videoId, videoId), eq(videoLikes.userId, user.id))
          )
          .limit(1);

        //   if same reaction, remove the reaction(toggle off)
        if (existingReaction.length) {
          const currentReaction = existingReaction[0];
          if (currentReaction.isLike === isLike) {
            await db
              .delete(videoLikes)
              .where(
                and(
                  eq(videoLikes.videoId, videoId),
                  eq(videoLikes.userId, user.id)
                )
              );

            return { status: "removed" };
          }
          // if different reaction type, update to new type
          else {
            await db
              .update(videoLikes)
              .set({ isLike })
              .where(
                and(
                  eq(videoLikes.videoId, videoId),
                  eq(videoLikes.userId, user.id)
                )
              );

            return { status: isLike ? "liked" : "disliked" };
          }
        }
        // No existing reaction, make it new one
        else {
          await db.insert(videoLikes).values({
            videoId,
            userId: user.id,
            isLike,
            createdAt: new Date(),
          });

          return { status: isLike ? "liked" : "disliked" };
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update like status",
        });
      }
    }),

  // get likes status counts for a video
  getVideoStats: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        userId: z.string().optional(), // Ubah tipe menjadi string biasa, tidak perlu UUID
      })
    )
    .query(async ({ input }) => {
      const { videoId, userId } = input;

      try {
        // Count likes and dislikes
        const likesCount = await db
          .select({ count: count() })
          .from(videoLikes)
          .where(
            and(eq(videoLikes.videoId, videoId), eq(videoLikes.isLike, true))
          );

        const dislikesCount = await db
          .select({ count: count() })
          .from(videoLikes)
          .where(
            and(eq(videoLikes.videoId, videoId), eq(videoLikes.isLike, false))
          );

        // Check user's reaction if userId is provided
        let userReaction = null;

        if (userId) {
          // Cari dulu user ID di database berdasarkan clerk ID
          const userRecord = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.clerkId, userId))
            .limit(1);

          if (userRecord.length > 0) {
            const dbUserId = userRecord[0].id;

            // Gunakan DB user ID untuk mencari reaction
            const reaction = await db
              .select({ isLike: videoLikes.isLike })
              .from(videoLikes)
              .where(
                and(
                  eq(videoLikes.videoId, videoId),
                  eq(videoLikes.userId, dbUserId)
                )
              )
              .limit(1);

            if (reaction.length) {
              userReaction = reaction[0].isLike ? "like" : "dislike";
            }
          }
        }

        return {
          likes: likesCount[0]?.count || 0,
          dislikes: dislikesCount[0]?.count || 0,
          userReaction,
        };
      } catch (error) {
        console.error("Error getting video stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get video statistics",
        });
      }
    }),
});
