import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

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

      if (!videoId) {
        throw new UploadThingError("Video ID is required");
      }

      // Gunakan fake userId untuk testing
      return { userId: "test-user-id", videoId };
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
