import { db } from "@/db";
import { videos } from "@/db/schema";
import { mux } from "@/lib/mux";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

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
});
