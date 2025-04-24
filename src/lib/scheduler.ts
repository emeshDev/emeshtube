// lib/scheduler.ts
import { Client } from "@upstash/qstash";

// Membuat instance QStash client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

/**
 * Setup jadwal untuk invalidasi cache trending secara otomatis
 * Dijalankan saat aplikasi startup atau dari file terpisah
 */
// Setup schedules for different time ranges
export const setupTrendingCacheInvalidationSchedule = async () => {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/invalidate-trending`;

    // Create schedules with different frequencies
    const schedules = await Promise.all([
      // Daily cache - every day at 00:05
      qstashClient.schedules.create({
        destination: webhookUrl,
        body: JSON.stringify({ timeRange: "day" }),
        cron: "5 0 * * *",
        scheduleId: "trending-invalidation-daily",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || "",
          "Content-Type": "application/json",
        },
      }),

      // Weekly cache - every Monday at 00:10
      qstashClient.schedules.create({
        destination: webhookUrl,
        body: JSON.stringify({ timeRange: "week" }),
        cron: "10 0 * * 1",
        scheduleId: "trending-invalidation-weekly",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || "",
          "Content-Type": "application/json",
        },
      }),

      // All ranges - every 6 hours
      qstashClient.schedules.create({
        destination: webhookUrl,
        body: JSON.stringify({ timeRange: "all-ranges" }),
        cron: "0 */6 * * *",
        scheduleId: "trending-invalidation-all-ranges",
        headers: {
          "x-api-key": process.env.INTERNAL_API_KEY || "",
          "Content-Type": "application/json",
        },
      }),
    ]);

    return { success: true, schedules };
  } catch (error) {
    console.error("Failed to setup schedules:", error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Jalankan invalidasi cache trending secara manual
 * @param timeRange rentang waktu yang akan diinvalidasi
 */
export const invalidateTrendingCache = async (
  timeRange: "day" | "week" | "month" | "all" | "all-ranges" = "all-ranges"
) => {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/invalidate-trending`;

    // Menggunakan QStash client untuk mengirim request ke webhook
    const response = await qstashClient.publishJSON({
      url: webhookUrl,
      body: { timeRange },
      headers: {
        "x-api-key": process.env.INTERNAL_API_KEY || "",
      },
    });

    console.log(
      `Trending cache invalidation triggered with message ID: ${response.messageId}`
    );
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error("Failed to trigger trending cache invalidation:", error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Cek status jadwal invalidasi cache trending
 */
export const checkTrendingCacheInvalidationSchedules = async () => {
  try {
    // Dapatkan semua jadwal yang ada
    const schedules = await qstashClient.schedules.list();

    // Filter jadwal yang terkait dengan invalidasi cache trending
    const trendingSchedules = schedules.filter((schedule) =>
      schedule.scheduleId?.includes("trending-invalidation")
    );

    return {
      success: true,
      schedules: trendingSchedules,
    };
  } catch (error) {
    console.error(
      "Failed to check trending cache invalidation schedules:",
      error
    );
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

/**
 * Hapus jadwal invalidasi cache trending
 * @param scheduleId ID jadwal yang akan dihapus
 */
export const removeTrendingCacheInvalidationSchedule = async (
  scheduleId: string
) => {
  try {
    await qstashClient.schedules.delete(scheduleId);
    return {
      success: true,
      message: `Schedule ${scheduleId} deleted successfully`,
    };
  } catch (error) {
    console.error(`Failed to delete schedule ${scheduleId}:`, error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};
