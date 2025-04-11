import { db } from "@/db";
import { videos } from "@/db/schema";
import { mux } from "@/lib/mux";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";

export const studioRouter = createTRPCRouter({
  // procedure biasa
  getMany: protectedProcedure.query(async () => {
    const data = await db.select().from(videos);

    return data;
  }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { id: userId } = ctx.user;
      const { id } = input;

      const [video] = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, id), eq(videos.userId, userId)));

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return video;
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

  deleteVideo: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { user } = ctx;

      // Cek apakah video ada dan milik user ini
      const videoToDelete = await db
        .select({
          id: videos.id,
          muxAssetId: videos.muxAssetId,
          muxUploadId: videos.muxUploadId,
        })
        .from(videos)
        .where(and(eq(videos.id, id), eq(videos.userId, user.id)))
        .limit(1);

      if (!videoToDelete.length) {
        throw new Error(
          "Video not found or you don't have permission to delete it"
        );
      }

      const video = videoToDelete[0];

      try {
        // Jika ada Mux Asset ID, hapus dari Mux
        if (video.muxAssetId) {
          try {
            await mux.video.assets.delete(video.muxAssetId);
          } catch (error) {
            console.error("Error deleting Mux asset:", error);
            // Lanjutkan meskipun error di Mux (video masih perlu dihapus dari DB)
          }
        }

        // Jika ada Mux Upload ID, hapus dari Mux Uploads
        if (video.muxUploadId) {
          try {
            await mux.video.uploads.cancel(video.muxUploadId);
          } catch (error) {
            console.error("Error cancelling Mux upload:", error);
            // Lanjutkan meskipun error di Mux (video masih perlu dihapus dari DB)
          }
        }

        // Hapus video dari database
        const result = await db
          .delete(videos)
          .where(eq(videos.id, id))
          .returning({ id: videos.id });

        if (!result.length) {
          throw new Error("Failed to delete video");
        }

        return { success: true };
      } catch (error) {
        console.error("Error deleting video:", error);
        throw new Error(
          "Failed to delete video: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
      }
    }),
});
