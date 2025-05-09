import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";

// For error handling in middleware
// Use the Error class directly since UploadThingError might not be exported
// from the correct location in your current version

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  thumbnailUploader: f({
    image: {
      maxFileSize: "2MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // Simplifikasi: tanpa auth untuk mengetahui apakah masalah auth atau kode form
      // Get videoId from the request header
      const headers = new Headers(req.headers);
      const videoId = headers.get("x-video-id");

      const { userId: clerkUserId } = await auth();

      if (!clerkUserId) {
        throw new Error("Unauthorized: No user ID found");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.clerkId, clerkUserId));

      if (!user) throw new Error("Unauthorized");

      if (!videoId) {
        // Use standard Error instead of UploadThingError
        throw new Error("Video ID is required");
      }

      // Gunakan fake userId untuk testing
      return { user, videoId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Thumbnail upload complete for videoId:", metadata.videoId);
      console.log("Thumbnail URL:", file.ufsUrl);

      return {
        videoId: metadata.videoId,
        thumbnailUrl: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
