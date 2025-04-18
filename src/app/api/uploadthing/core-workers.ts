/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/uploadthing/core-workers.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
// Gunakan "uploadthing" bukan "uploadthing/server"
import { createUploadthing, type FileRouter } from "uploadthing/next";

// Note: Karena @/lib/clerk-auth belum dibuat, kita akan menggunakan auth dari Next.js
// untuk saat ini. Kalau sudah siap migrasi ke Workers, baru buat implementasi penuh.
import { auth } from "@clerk/nextjs/server";

// Membuat instance uploadthing untuk Cloudflare Workers
const f = createUploadthing();

// Definisikan type untuk parameter middleware dan onUploadComplete
interface MiddlewareParams {
  req: Request;
}

interface OnUploadCompleteParams {
  metadata: {
    videoId: string;
    user: any; // Tipe user sesuai dengan struktur database Anda
  };
  file: {
    url: string;
    name: string;
    size: number;
    key: string;
    // Tambahkan properti lain yang diperlukan
  };
}

// FileRouter untuk Workers implementation
export const ourFileRouter = {
  thumbnailUploader: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }: MiddlewareParams) => {
      // Get videoId from the request header
      const videoId = req.headers.get("x-video-id");

      // Untuk saat ini, gunakan auth dari Next.js
      // Nanti saat migrasi, ganti dengan implementasi Cloudflare Workers
      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) {
        throw new Error("Unauthorized: No user ID found");
      }

      // Ambil user dari database berdasarkan Clerk userId
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkUserId));

      if (!user) {
        throw new Error("User not found in database");
      }

      if (!videoId) {
        throw new Error("Video ID is required");
      }

      return { user, videoId };
    })
    .onUploadComplete(async ({ metadata, file }: OnUploadCompleteParams) => {
      console.log("Thumbnail upload complete for videoId:", metadata.videoId);
      console.log("Thumbnail URL:", file.url);

      return {
        videoId: metadata.videoId,
        thumbnailUrl: file.url,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

/**
 * Catatan untuk migrasi ke Cloudflare Workers:
 *
 * 1. Buat file lib/clerk-auth.ts dengan implementasi yang sesuai untuk Workers
 * 2. Ganti import auth dari @clerk/nextjs/server dengan implementasi Workers
 * 3. Pastikan parameter dan return type sesuai dengan API UploadThing
 * 4. Perhatikan bahwa di Workers, properti file mungkin berbeda (url vs ufsUrl)
 */
