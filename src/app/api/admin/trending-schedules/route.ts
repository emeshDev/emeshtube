/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/admin/trending-schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  setupTrendingCacheInvalidationSchedule,
  checkTrendingCacheInvalidationSchedules,
  removeTrendingCacheInvalidationSchedule,
} from "@/lib/scheduler";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  // Check for API key authentication
  const apiKey = req.headers.get("x-api-key");
  const adminApiKey = process.env.INTERNAL_API_KEY; // Set this in your .env

  // Check Clerk auth first (keep your existing auth)
  const { userId } = await auth();

  // Allow access if either Clerk auth OR API key is valid
  if (!userId && apiKey !== adminApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Setup jadwal invalidasi cache trending
    const result = await setupTrendingCacheInvalidationSchedule();
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error setting up trending cache invalidation schedules:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to set up trending cache invalidation schedules",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Verifikasi admin
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Cek status jadwal invalidasi cache trending
    const result = await checkTrendingCacheInvalidationSchedules();

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error checking trending cache invalidation schedules:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to check trending cache invalidation schedules",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Verifikasi admin
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request untuk mendapatkan scheduleId
  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");

  if (!scheduleId) {
    return NextResponse.json(
      { error: "Schedule ID is required" },
      { status: 400 }
    );
  }

  try {
    // Hapus jadwal invalidasi cache trending
    const result = await removeTrendingCacheInvalidationSchedule(scheduleId);

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      `Error removing trending cache invalidation schedule ${scheduleId}:`,
      error
    );
    return NextResponse.json(
      {
        error: `Failed to remove trending cache invalidation schedule ${scheduleId}`,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
