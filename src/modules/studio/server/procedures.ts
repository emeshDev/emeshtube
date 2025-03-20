import { db } from "@/db";
import { videos } from "@/db/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";

export const studioRouter = createTRPCRouter({
  // procedure biasa
  getMany: baseProcedure.query(async () => {
    const data = await db.select().from(videos);

    return data;
  }),

  // Procedure untuk infinite query videos studio (protected)
  infiniteVideos: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z
          .object({
            id: z.string().uuid(),
            updatedAt: z.date(),
          })
          .nullish(),
        categoryId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { limit, cursor, categoryId } = input;
      const { user } = ctx;

      // Buat conditions array
      const conditions = [eq(videos.userId, user.id)];

      // Tambahkan filter categoryId jika ada
      if (categoryId) {
        conditions.push(eq(videos.categoryId, categoryId));
      }

      // Tambahkan filter cursor jika ada
      if (cursor) {
        // Gunakan cursor.createdAt langsung tanpa perlu query database lagi
        conditions.push(lt(videos.updatedAt, cursor.updatedAt));
      }

      // Eksekusi query dengan semua conditions yang diperlukan
      const items = await db
        .select()
        .from(videos)
        .where(and(...conditions))
        .orderBy(desc(videos.updatedAt), desc(videos.id))
        .limit(limit + 1);

      let nextCursor: typeof cursor | undefined = undefined;

      // if (items.length > limit) {
      //   const nextItem = items.pop();
      //   // Buat cursor untuk halaman berikutnya
      //   if (nextItem) {
      //     nextCursor = {
      //       id: nextItem.id,
      //       updatedAt: nextItem.updatedAt,
      //     };
      //   }
      // }

      const hasMore = items.length > limit;
      const newItems = hasMore ? items.slice(0, -1) : items;

      const lastItems = newItems[newItems.length - 1];
      nextCursor = hasMore
        ? { id: lastItems.id, updatedAt: lastItems.updatedAt }
        : null;

      return {
        items: newItems,
        nextCursor,
      };
    }),
});
