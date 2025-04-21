import { db } from "@/db";
import { comments, users } from "@/db/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";

export const commentsRouter = createTRPCRouter({
  getByVideoId: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
        cursor: z
          .object({
            id: z.string().uuid(),
            createdAt: z.date(),
          })
          .nullish(),
      })
    )
    .query(async ({ input }) => {
      const { videoId, limit, cursor } = input;

      //   Build query conditions
      const conditions = [eq(comments.videoId, videoId)];

      //   Add cursor condition if provided
      if (cursor) {
        conditions.push(lt(comments.createdAt, cursor.createdAt));
      }

      try {
        // Get total count for this video (useful for UI display)
        const [countResult] = await db
          .select({ count: count() })
          .from(comments)
          .where(eq(comments.videoId, videoId));

        const totalCount = Number(countResult?.count || 0);

        // Query comments with user information
        const commentsWithUsers = await db
          .select({
            comment: comments,
            user: {
              id: users.id,
              name: users.name,
              imageUrl: users.imageUrl,
            },
          })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(comments.createdAt))
          .limit(limit + 1);

        let nextCursor: typeof cursor | null = null;
        const hasMore = commentsWithUsers.length > limit;
        const items = hasMore
          ? commentsWithUsers.slice(0, -1)
          : commentsWithUsers;

        if (hasMore && items.length > 0) {
          const lastItem = items[items.length - 1];
          nextCursor = {
            id: lastItem.comment.id,
            createdAt: lastItem.comment.createdAt,
          };
        }

        return {
          items,
          nextCursor,
          totalCount,
        };
      } catch (error) {
        console.error("Error fetching comments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments",
        });
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        content: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { videoId, content } = input;
      const { user } = ctx;

      try {
        const [comment] = await db
          .insert(comments)
          .values({
            videoId,
            userId: user.id,
            content,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return comment;
      } catch (error) {
        console.error("Error creating comment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create comment",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { user } = ctx;

      try {
        // Fetch comment with its owner info
        const commentResult = await db
          .select({
            comment: comments,
            user: {
              id: users.id,
              clerkId: users.clerkId,
            },
          })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          .where(eq(comments.id, id))
          .limit(1);

        if (!commentResult.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Comment not found",
          });
        }

        const commentData = commentResult[0];

        // Check if user is authorized to delete the comment
        // Allow deletion if it's the user's own comment
        if (commentData.comment.userId !== user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this comment",
          });
        }

        // Proceed with deletion
        await db.delete(comments).where(eq(comments.id, id));

        return { success: true };
      } catch (error) {
        console.error("Error deleting comment:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete comment",
        });
      }
    }),
});
