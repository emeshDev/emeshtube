// app/api/webhooks/video-deleted/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { Client } from "@upstash/qstash";
import { Receiver } from "@upstash/qstash";
import Pusher from "pusher";

// QStash signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

// QStash client for sending messages
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

export async function POST(req: NextRequest) {
  try {
    // Log headers for debugging (excluding cookies)
    console.log("Video deleted webhook received:", req.url);
    console.log(
      "Headers:",
      Object.fromEntries(
        [...req.headers.entries()].filter(([k]) => !k.includes("cookie"))
      )
    );

    // First check for API key (for internal calls)
    const apiKey = req.headers.get("x-api-key");
    if (apiKey === process.env.INTERNAL_API_KEY) {
      console.log("Authorized via API key");
      // Continue processing - internal call validated
    }
    // Then check for QStash signature (for scheduled/queued calls)
    else {
      const signature = req.headers.get("upstash-signature");

      if (!signature) {
        console.log("No API key or signature found");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Clone request to read body for verification
      const requestClone = req.clone();
      const rawBody = await requestClone.text();

      try {
        // Use synchronous verify method (returns boolean)
        const isValid = receiver.verify({
          signature,
          body: rawBody,
        });

        if (!isValid) {
          console.log("QStash signature verification failed");
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }

        console.log("QStash signature verified successfully");
      } catch (error) {
        console.error("QStash verification error:", error);
        return NextResponse.json(
          { error: "Signature verification error" },
          { status: 401 }
        );
      }
    }

    // Parse the request body
    let body;
    try {
      const bodyText = await req.text();
      body = JSON.parse(bodyText);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Try to parse as JSON directly
      try {
        body = await req.json();
      } catch (jsonError) {
        console.error("Error parsing request body:", jsonError);
        return NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        );
      }
    }

    const { videoId } = body;
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    // Send Pusher notification for real-time updates
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
      console.log(`Pusher event triggered for deleted video: ${videoId}`);
    } catch (error) {
      console.error("Error triggering Pusher event:", error);
      // Continue with cache invalidation even if Pusher fails
    }

    // Invalidate trending cache
    // 1. Directly clear trending cache via Redis
    try {
      const trendingKeys = await redis.keys("trending:*");
      if (trendingKeys.length) {
        await redis.del(...trendingKeys);
        console.log(
          `Invalidated ${trendingKeys.length} trending cache entries directly`
        );
      }
    } catch (redisError) {
      console.error("Error invalidating trending cache via Redis:", redisError);
    }

    // 2. Send notification to trending invalidation webhook (as backup)
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/invalidate-trending`;
      const response = await qstashClient.publishJSON({
        url: webhookUrl,
        body: {
          timeRange: "all-ranges",
          reason: `video_deleted:${videoId}`,
        },
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || "",
        },
      });
      console.log(
        `Trending cache invalidation triggered via webhook, message ID: ${response.messageId}`
      );
    } catch (webhookError) {
      console.error(
        "Error triggering trending cache invalidation webhook:",
        webhookError
      );
    }

    return NextResponse.json({
      success: true,
      message: `Processed video deletion: ${videoId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing video deletion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
