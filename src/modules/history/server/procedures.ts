// modules/history/server/procedures.ts
import { db } from "@/db";
import { users, videos, watchHistory } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export const historyRouter = createTRPCRouter({
  // Menambahkan video ke history
  addToHistory: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { videoId } = input;
      const { user } = ctx;

      console.log("📌 addToHistory called with:", { videoId, userId: user.id });

      try {
        // Cek apakah video ada
        const videoExists = await db
          .select({ id: videos.id })
          .from(videos)
          .where(eq(videos.id, videoId))
          .limit(1);

        console.log("📌 Video exists check:", videoExists);

        if (!videoExists.length) {
          console.log("❌ Video not found:", videoId);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Video not found",
          });
        }

        // Cek apakah entry sudah ada di history
        const existingEntry = await db
          .select({ id: watchHistory.id })
          .from(watchHistory)
          .where(
            and(
              eq(watchHistory.userId, user.id),
              eq(watchHistory.videoId, videoId)
            )
          )
          .limit(1);

        console.log("📌 Existing entry check:", existingEntry);

        if (existingEntry.length) {
          console.log("📌 Updating existing history entry");
          // Update timestamp dari entry yang sudah ada
          await db
            .update(watchHistory)
            .set({ updatedAt: new Date() })
            .where(eq(watchHistory.id, existingEntry[0].id));

          return { success: true, message: "Watch history updated" };
        }

        console.log("📌 Creating new history entry");
        // Buat entry baru di history
        const result = await db.insert(watchHistory).values({
          userId: user.id,
          videoId,
        });

        console.log("📌 Insert result:", result);

        return { success: true, message: "Added to watch history" };
      } catch (error) {
        console.error("❌ Error adding to watch history:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add to watch history",
        });
      }
    }),

  // Mengambil riwayat tontonan pengguna
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor } = input;
      const { user } = ctx;

      console.log("📌 getHistory called for user:", user.id);

      try {
        // Buat kondisi query
        const conditions = [eq(watchHistory.userId, user.id)];

        // Tambahkan pagination dengan cursor
        if (cursor) {
          const cursorEntry = await db
            .select({ updatedAt: watchHistory.updatedAt })
            .from(watchHistory)
            .where(eq(watchHistory.id, cursor))
            .limit(1);

          if (cursorEntry.length > 0) {
            conditions.push(
              sql`${watchHistory.updatedAt} < ${cursorEntry[0].updatedAt}`
            );
          }
        }

        // Dapatkan history dengan informasi video dan creator
        const historyItems = await db
          .select({
            history: {
              id: watchHistory.id,
              createdAt: watchHistory.createdAt,
              updatedAt: watchHistory.updatedAt,
            },
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
          .from(watchHistory)
          .leftJoin(videos, eq(watchHistory.videoId, videos.id))
          .leftJoin(users, eq(videos.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(watchHistory.updatedAt))
          .limit(limit + 1);

        console.log(`📌 Found ${historyItems.length} history items`);

        // Periksa apakah ada lebih banyak item
        const hasNextPage = historyItems.length > limit;
        const historyList = hasNextPage
          ? historyItems.slice(0, limit)
          : historyItems;

        const nextCursor =
          hasNextPage && historyList.length > 0
            ? historyList[historyList.length - 1].history.id
            : undefined;

        return {
          items: historyList,
          nextCursor,
        };
      } catch (error) {
        console.error("❌ Error fetching watch history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch watch history",
        });
      }
    }),

  // Menghapus item dari history
  removeFromHistory: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { videoId } = input;
      const { user } = ctx;

      try {
        await db
          .delete(watchHistory)
          .where(
            and(
              eq(watchHistory.userId, user.id),
              eq(watchHistory.videoId, videoId)
            )
          );

        return { success: true, message: "Removed from watch history" };
      } catch (error) {
        console.error("Error removing from watch history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove from watch history",
        });
      }
    }),

  // Menghapus semua riwayat menonton
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    try {
      await db.delete(watchHistory).where(eq(watchHistory.userId, user.id));

      return { success: true, message: "Watch history cleared" };
    } catch (error) {
      console.error("Error clearing watch history:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to clear watch history",
      });
    }
  }),
});
