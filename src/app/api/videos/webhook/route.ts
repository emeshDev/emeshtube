// src/api/videos/webhook/route.ts

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  VideoAssetCreatedWebhookEvent,
  VideoAssetDeletedWebhookEvent,
  VideoAssetErroredWebhookEvent,
  VideoAssetReadyWebhookEvent,
  VideoAssetTrackReadyWebhookEvent,
  VideoUploadCreatedWebhookEvent,
} from "@mux/mux-node/resources/webhooks";
import { mux } from "@/lib/mux";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { deleteThumbnailByUrl } from "@/lib/uploadthing-server";
import Pusher from "pusher";

const SIGNING_SECRET = process.env.MUX_WEBHOOK_SECRET!;

type WebhookEvent =
  | VideoUploadCreatedWebhookEvent
  | VideoAssetCreatedWebhookEvent
  | VideoAssetReadyWebhookEvent
  | VideoAssetErroredWebhookEvent
  | VideoAssetTrackReadyWebhookEvent
  | VideoAssetDeletedWebhookEvent;

export const POST = async (request: Request) => {
  if (!SIGNING_SECRET) {
    throw new Error("MUX_WEBHOOK_SECRET is required!!!");
  }

  const headersPayload = await headers();
  const muxSignature = headersPayload.get("mux-signature");

  if (!muxSignature) return new Response("NO Signature FOUND", { status: 401 });

  try {
    const payload = await request.json();
    if (!payload) return new Response("NO PAYLOAD LOADED", { status: 401 });
    const body = JSON.stringify(payload);
    mux.webhooks.verifySignature(
      body,
      { "mux-signature": muxSignature },
      SIGNING_SECRET
    );

    switch (payload.type as WebhookEvent["type"]) {
      case "video.upload.created": {
        const data = payload.data as VideoUploadCreatedWebhookEvent["data"];

        // console.log(
        //   "Full video.asset.created payload:",
        //   JSON.stringify(data, null, 2)
        // );

        const uploadId = data.id;

        if (!uploadId) {
          console.error("No upload ID found in webhook payload", data);
          return new Response("No upload ID found", { status: 400 });
        }

        // console.log("Updating video with Mux upload ID:", uploadId);

        // First check if the record exists
        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.muxUploadId, uploadId))
          .limit(1);

        if (!existingVideo.length) {
          console.error("No video found with Mux upload ID:", uploadId);
          return new Response("No matching video found", { status: 404 });
        }

        // Perform the update
        const result = await db
          .update(videos)
          .set({
            muxStatus: data.status,
            updatedAt: new Date(),
          })
          .where(eq(videos.muxUploadId, uploadId))
          .returning({
            id: videos.id,
            updatedMuxStatus: videos.muxStatus,
          });

        // console.log("Update result:", JSON.stringify(result, null, 2));
        if (!result.length) {
          console.error("Update didn't affect any rows", data);
          return new Response("Update failed", { status: 500 });
        }

        break;
      }

      case "video.asset.created": {
        const data = payload.data as VideoAssetCreatedWebhookEvent["data"];

        if (!data.upload_id) {
          console.error("No upload ID found in webhook payload", data);
          return new Response("No upload ID found", { status: 400 });
        }

        const existingVideo = await db
          .select()
          .from(videos)
          .where(eq(videos.muxUploadId, data.upload_id))
          .limit(1);

        if (!existingVideo.length) {
          console.error("No video found with Mux upload ID:", data.upload_id);
          return new Response("No matching video found", { status: 404 });
        }

        // Define the update object with all possible fields
        const updateData: {
          muxAssetId: string;
          muxStatus: string;
          muxPlaybackId?: string; // Make this optional
          updatedAt: Date;
        } = {
          muxAssetId: data.id,
          muxStatus: data.status,
          updatedAt: new Date(),
        };

        // Add playback ID if available
        if (data.playback_ids && data.playback_ids.length > 0) {
          updateData.muxPlaybackId = data.playback_ids[0].id;
        }

        // Perform the update
        const result = await db
          .update(videos)
          .set(updateData)
          .where(eq(videos.muxUploadId, data.upload_id))
          .returning({
            id: videos.id,
            updatedMuxAssetId: videos.muxAssetId,
            updatedMuxStatus: videos.muxStatus,
            updatedMuxPlaybackId: videos.muxPlaybackId,
          });

        console.log("Update result:", JSON.stringify(result, null, 2));

        if (!result.length) {
          console.error("Update didn't affect any rows", data);
          return new Response("Update failed", { status: 500 });
        }

        break;
      }

      case "video.asset.ready": {
        const data = payload.data as VideoAssetReadyWebhookEvent["data"];

        // Check existing playback ID on db
        const existingVideo = await db
          .select({
            id: videos.id,
            existingPlaybackId: videos.muxPlaybackId,
          })
          .from(videos)
          .where(eq(videos.muxAssetId, data.id))
          .limit(1);

        if (
          existingVideo.length > 0 &&
          existingVideo[0].existingPlaybackId &&
          data.playback_ids &&
          data.playback_ids.length > 0 &&
          existingVideo[0].existingPlaybackId !== data.playback_ids[0].id
        ) {
          console.error("Playback ID mismatch!", {
            existingId: existingVideo[0].existingPlaybackId,
            newId: data.playback_ids[0].id,
          });

          return new Response("Playback ID mismatch detected", { status: 409 });
        }

        const thumbnailUrl = `https://image.mux.com/${data.playback_ids?.[0].id}/thumbnail.jpg`;
        const previewUrl = `https://image.mux.com/${data.playback_ids?.[0].id}/animated.gif`;

        // Get video duration from tracks
        let duration = 0;
        if (data.tracks && data.tracks.length > 0 && data.tracks[0]?.duration) {
          duration = Math.round(data.tracks[0].duration);
        }

        // Define the update object with all fields
        const updateData: {
          muxStatus: string;
          muxPlaybackId?: string;
          muxTrackId?: string;
          muxTrackStatus?: string;
          updatedAt: Date;
          thumbnailUrl?: string;
          previewUrl?: string;
          duration?: number;
        } = {
          muxStatus: data.status,
          updatedAt: new Date(),
        };

        // Add playback ID if available
        if (data.playback_ids && data.playback_ids.length > 0) {
          updateData.muxPlaybackId = data.playback_ids[0].id;
        }

        // Add track information if available
        if (data.tracks && data.tracks.length > 0) {
          // First track (video track)
          if (data.tracks[0] && data.tracks[0].id) {
            updateData.muxTrackId = data.tracks[0].id;
          }

          // Second track (audio track) for status
          if (data.tracks[1] && data.tracks[1].status) {
            updateData.muxTrackStatus = data.tracks[1].status;
          }
        }

        if (!thumbnailUrl) {
          updateData.thumbnailUrl =
            "https://emeshtube.emeshdev.com/placeholder.svg";
        }

        updateData.thumbnailUrl = thumbnailUrl;
        updateData.previewUrl = previewUrl;
        updateData.duration = duration;

        // Update the video by asset ID
        const result = await db
          .update(videos)
          .set(updateData)
          .where(eq(videos.muxAssetId, data.id))
          .returning({
            id: videos.id,
            updatedMuxStatus: videos.muxStatus,
            updatedMuxPlaybackId: videos.muxPlaybackId,
            updatedMuxTrackId: videos.muxTrackId,
            updatedMuxTrackStatus: videos.muxTrackStatus,
            updatedThumbnailUrl: videos.thumbnailUrl,
            updatedPreviewUrl: videos.previewUrl,
            updatedDuration: videos.duration,
          });

        // console.log("Update result:", JSON.stringify(result, null, 2));

        if (!result.length) {
          console.error("Update didn't affect any rows for asset ID:", data.id);

          // Try updating by upload_id as fallback
          if (data.upload_id) {
            console.log(
              "Trying to update by upload_id instead:",
              data.upload_id
            );

            // Check for playback ID mismatch using upload_id
            const fallbackExistingVideo = await db
              .select({
                id: videos.id,
                existingPlaybackId: videos.muxPlaybackId,
              })
              .from(videos)
              .where(eq(videos.muxUploadId, data.upload_id))
              .limit(1);

            if (
              fallbackExistingVideo.length > 0 &&
              fallbackExistingVideo[0].existingPlaybackId &&
              data.playback_ids &&
              data.playback_ids.length > 0 &&
              fallbackExistingVideo[0].existingPlaybackId !==
                data.playback_ids[0].id
            ) {
              console.error("Playback ID mismatch during fallback!", {
                existingId: fallbackExistingVideo[0].existingPlaybackId,
                newId: data.playback_ids[0].id,
              });

              return new Response("Playback ID mismatch detected", {
                status: 409,
              });
            }

            const fallbackResult = await db
              .update(videos)
              .set(updateData)
              .where(eq(videos.muxUploadId, data.upload_id))
              .returning({
                id: videos.id,
                updatedMuxStatus: videos.muxStatus,
                updatedMuxPlaybackId: videos.muxPlaybackId,
                updatedMuxTrackId: videos.muxTrackId,
                updatedMuxTrackStatus: videos.muxTrackStatus,
                updatedThumbnailUrl: videos.thumbnailUrl,
                updatedPreviewUrl: videos.previewUrl,
                updatedDuration: videos.duration,
              });

            console.log(
              "Fallback update result:",
              JSON.stringify(fallbackResult, null, 2)
            );

            if (!fallbackResult.length) {
              return new Response("Update failed - no matching video found", {
                status: 404,
              });
            }
          } else {
            return new Response("Update failed - no matching video found", {
              status: 404,
            });
          }
        }

        break;
      }

      case "video.asset.errored": {
        const data = payload.data as VideoAssetErroredWebhookEvent["data"];
        if (!data.upload_id) {
          console.error("No upload ID found in webhook payload", data);
          return new Response("No upload ID found", { status: 400 });
        }

        await db
          .update(videos)
          .set({ muxStatus: data.status })
          .where(eq(videos.muxUploadId, data.upload_id));

        break;
      }

      case "video.asset.deleted": {
        const data = payload.data as VideoAssetDeletedWebhookEvent["data"];

        if (!data.upload_id) {
          console.error("No upload ID found in webhook payload", data);
          return new Response("No upload ID found", { status: 400 });
        }

        const videoToDelete = await db
          .select({
            id: videos.id,
            thumbnailUrl: videos.thumbnailUrl,
          })
          .from(videos)
          .where(eq(videos.muxUploadId, data.upload_id))
          .limit(1);

        // Delete thumbnail from uploadthing too
        if (
          videoToDelete.length > 0 &&
          videoToDelete[0].thumbnailUrl &&
          videoToDelete[0].thumbnailUrl.includes("utfs.io")
        ) {
          console.log(
            `Deleting thumbnail for video before deletion: ${videoToDelete[0].thumbnailUrl}`
          );
          try {
            await deleteThumbnailByUrl(videoToDelete[0].thumbnailUrl);
          } catch (error) {
            console.error("Error deleting thumbnail:", error);
          }
        }

        const videoId = videoToDelete.length > 0 ? videoToDelete[0].id : null;

        await db.delete(videos).where(eq(videos.muxUploadId, data.upload_id));

        if (videoId) {
          try {
            const pusher = new Pusher({
              appId: process.env.PUSHER_APP_ID!,
              key: process.env.PUSHER_KEY!,
              secret: process.env.PUSHER_SECRET!,
              cluster: process.env.PUSHER_CLUSTER!,
              useTLS: true,
            });

            await pusher.trigger("videos-channel", "video-deleted", {
              videoId,
            });
          } catch (error) {
            console.error("Error triggering Pusher event:", error);
          }
        }

        break;
      }

      case "video.asset.track.ready": {
        const data =
          payload.data as VideoAssetTrackReadyWebhookEvent["data"] & {
            asset_id: string;
          };

        console.log("Track Ready", data);

        const assetId = data.asset_id;
        const trackId = data.id;
        const status = data.status;
        const trackType = data.type;
        const textType = data.text_type;
        const languageCode = data.language_code;

        if (!assetId) {
          return new Response("Missing asset ID", { status: 400 });
        }

        const isEnglishSubtitle =
          trackType === "text" &&
          textType === "subtitles" &&
          languageCode === "en";

        if (isEnglishSubtitle) {
          try {
            const videoInfo = await db
              .select({ id: videos.id, muxPlaybackId: videos.muxPlaybackId })
              .from(videos)
              .where(eq(videos.muxAssetId, assetId))
              .limit(1);

            if (!videoInfo.length || !videoInfo[0].muxPlaybackId) {
              console.error(
                `[Webhook] Video with asset ID ${assetId} not found or missing playback ID`
              );

              await db
                .update(videos)
                .set({
                  muxSubtitleTrackId: trackId,
                  muxSubtitleStatus: status,
                  updatedAt: new Date(),
                })
                .where(eq(videos.muxAssetId, assetId));

              return new Response("Updated track ID only", { status: 200 });
            }

            const { id: videoId, muxPlaybackId } = videoInfo[0];
            const { getSubtitleText, processSubtitleText } = await import(
              "@/lib/mux-subtitle"
            );
            // Tunggu sebentar untuk memastikan transcript tersedia (kadang perlu waktu beberapa detik)
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Ambil konten subtitle dari URL publik
            const rawSubtitleText = await getSubtitleText(
              muxPlaybackId,
              trackId
            );

            // Proses teks subtitle (hapus timestamp dll)
            const subtitleContent = processSubtitleText(rawSubtitleText);

            if (!subtitleContent) {
              console.log(
                `[Webhook] Empty subtitle content for video ${videoId}`
              );

              // Update track ID tapi tanpa konten subtitle
              await db
                .update(videos)
                .set({
                  muxSubtitleTrackId: trackId,
                  muxSubtitleStatus: status,
                  updatedAt: new Date(),
                })
                .where(eq(videos.muxAssetId, assetId));

              return new Response("Updated track ID with empty subtitle", {
                status: 200,
              });
            }

            console.log(
              `[Webhook] Extracted subtitle content (${subtitleContent.length} chars) for video ${videoId}`
            );

            // Update database dengan subtitle track ID dan kontennya
            await db
              .update(videos)
              .set({
                muxSubtitleTrackId: trackId,
                muxSubtitleStatus: status,
                subtitleContent: subtitleContent,
                updatedAt: new Date(),
              })
              .where(eq(videos.muxAssetId, assetId));

            console.log(
              `[Webhook] Updated video ${videoId} with subtitle track ID and content`
            );
          } catch (error) {
            console.error("Error getting subtitle content:", error);

            // Update hanya track ID jika gagal mendapatkan konten
            await db
              .update(videos)
              .set({
                muxSubtitleTrackId: trackId,
                muxSubtitleStatus: status,
                updatedAt: new Date(),
              })
              .where(eq(videos.muxAssetId, assetId));
          }
        } else {
          // Jika track lain (video/audio) atau subtitle bahasa lain, update track ID biasa
          await db
            .update(videos)
            .set({
              muxTrackId: trackId,
              muxTrackStatus: status,
            })
            .where(eq(videos.muxAssetId, assetId));
        }

        break;
      }
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Webhook verification failed", error);
    return new Response("Webhook verification failed", { status: 401 });
  }
};
