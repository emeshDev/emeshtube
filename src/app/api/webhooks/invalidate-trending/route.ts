// app/api/webhooks/invalidate-trending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { Receiver } from "@upstash/qstash";

// Rate limiter to prevent abuse
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1m"),
});

// QStash signature verification
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    // Log headers for debugging (excluding cookies)
    console.log("Invalidate trending webhook received:", req.url);
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
    // Then check for QStash signature (for scheduled calls)
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

    // Apply rate limiting
    const { success, limit, reset, remaining } = await ratelimit.limit(
      "trending_cache_invalidation"
    );

    if (!success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit,
          reset,
          remaining,
        },
        { status: 429 }
      );
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      body = {};
    }

    const timeRange = body.timeRange || "all-ranges";
    let keys: string[] = [];

    // Delete all trending cache if timeRange is all-ranges
    if (timeRange === "all-ranges") {
      keys = await redis.keys("trending:*");
      if (keys.length) {
        await redis.del(...keys);
      }
    } else {
      // Delete cache for specific timeRange
      keys = await redis.keys(`trending:${timeRange}:*`);
      if (keys.length) {
        await redis.del(...keys);
      }
    }

    // Record last invalidation time
    await redis.set("trending:last_invalidation", new Date().toISOString());

    console.log(
      `[Cache Invalidation] Cleared ${keys.length} trending cache entries for ${timeRange}`
    );

    return NextResponse.json({
      success: true,
      message: `Cleared ${keys.length} trending cache entries`,
      timeRange,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error invalidating trending cache:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
