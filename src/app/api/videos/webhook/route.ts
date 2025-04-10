// src/api/videos/webhook/route.ts

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  VideoAssetCreatedWebhookEvent,
  VideoAssetErroredWebhookEvent,
  VideoAssetReadyWebhookEvent,
  VideoAssetTrackReadyWebhookEvent,
  VideoUploadCreatedWebhookEvent,
} from "@mux/mux-node/resources/webhooks";
import { mux } from "@/lib/mux";
import { db } from "@/db";
import { videos } from "@/db/schema";

const SIGNING_SECRET = process.env.MUX_WEBHOOK_SECRET!;

type WebhookEvent =
  | VideoUploadCreatedWebhookEvent
  | VideoAssetCreatedWebhookEvent
  | VideoAssetReadyWebhookEvent
  | VideoAssetErroredWebhookEvent
  | VideoAssetTrackReadyWebhookEvent;

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
        let duration = null;
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
          duration?: number | null;
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
    }

    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("Webhook verification failed", error);
    return new Response("Webhook verification failed", { status: 401 });
  }
};
