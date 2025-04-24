import { db } from "@/db";
import { redis } from "@/lib/redis";
import { safeRedisGet, safeRedisSet, safeRedisDelete } from "@/lib/redis-utils";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const trendingRouter = createTRPCRouter({
  getTrendingVideos: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.number().optional(), // menggunakan score sebagai cursor
        timeRange: z.enum(["day", "week", "month", "all"]).default("week"),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, timeRange } = input;

      try {
        // Buat cache key berdasarkan parameter
        const cacheKey = `trending:${timeRange}:${limit}:${cursor || 0}`;

        // Default response untuk digunakan jika cache gagal
        const defaultResponse = {
          videos: [],
          nextCursor: undefined,
        };

        // Coba ambil data dari cache dengan helper function
        const cachedData = await safeRedisGet(cacheKey, defaultResponse);

        // Jika ada data valid di cache, gunakan
        if (cachedData.videos && cachedData.videos.length > 0) {
          console.log(
            `[CACHE HIT] Returning cached trending videos for ${cacheKey}`
          );
          return cachedData;
        }

        console.log(`[CACHE MISS] Fetching trending videos for ${cacheKey}`);

        // Tentukan filter waktu berdasarkan timeRange
        let timeFilter = "";

        switch (timeRange) {
          case "day":
            timeFilter = `AND v."created_at" > NOW() - INTERVAL '1 day'`;
            break;
          case "week":
            timeFilter = `AND v."created_at" > NOW() - INTERVAL '7 days'`;
            break;
          case "month":
            timeFilter = `AND v."created_at" > NOW() - INTERVAL '30 days'`;
            break;
          case "all":
          default:
            timeFilter = "";
            break;
        }

        // Buat query SQL untuk trending videos
        // Menggabungkan jumlah views, likes, dan comments dengan bobot
        const query = `
          WITH video_stats AS (
            SELECT 
              v.id,
              v.title,
              v.thumbnail_url,
              v.created_at,
              v.view_count,
              v.duration,
              v.visibility,
              v.user_id,
              v.category_id,
              v.mux_playback_id,
              COALESCE(COUNT(DISTINCT c.id), 0) AS comment_count,
              COALESCE(COUNT(DISTINCT CASE WHEN vl.is_like = true THEN vl.user_id END), 0) AS like_count,
              -- Skor trending = 1*views + 5*likes + 10*comments
              (v.view_count + (COALESCE(COUNT(DISTINCT CASE WHEN vl.is_like = true THEN vl.user_id END), 0) * 5) + 
              (COALESCE(COUNT(DISTINCT c.id), 0) * 10)) AS trending_score
            FROM videos v
            LEFT JOIN comments c ON v.id = c.video_id
            LEFT JOIN video_likes vl ON v.id = vl.video_id
            WHERE v.visibility = 'public' ${timeFilter}
            GROUP BY v.id
            ${
              cursor
                ? `HAVING (v.view_count + (COALESCE(COUNT(DISTINCT CASE WHEN vl.is_like = true THEN vl.user_id END), 0) * 5) + 
            (COALESCE(COUNT(DISTINCT c.id), 0) * 10)) < ${cursor}`
                : ""
            }
            ORDER BY trending_score DESC, v.created_at DESC
            LIMIT ${limit + 1}
          )
          SELECT 
            vs.*,
            u.id as creator_id,
            u.name as creator_name,
            u.image_url as creator_image_url
          FROM video_stats vs
          JOIN users u ON vs.user_id = u.id
        `;

        // Jalankan query raw
        const result = await db.execute(query);
        const videos = result.rows;

        // Format hasil query nya
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedVideos = videos.map((row: any) => ({
          video: {
            id: row.id,
            title: row.title,
            thumbnailUrl: row.thumbnail_url,
            createdAt: row.created_at,
            viewCount: row.view_count,
            duration: row.duration,
            visibility: row.visibility,
            userId: row.user_id,
            categoryId: row.category_id,
            muxPlaybackId: row.mux_playback_id,
            commentCount: parseInt(row.comment_count),
            likeCount: parseInt(row.like_count),
            trendingScore: parseInt(row.trending_score),
          },
          creator: {
            id: row.creator_id,
            name: row.creator_name,
            imageUrl: row.creator_image_url,
          },
        }));

        // Periksa apakah ada lebih banyak item
        const hasNextPage = formattedVideos.length > limit;
        const videoList = hasNextPage
          ? formattedVideos.slice(0, limit)
          : formattedVideos;

        const nextCursor =
          hasNextPage && videoList.length > 0
            ? videoList[videoList.length - 1].video.trendingScore
            : undefined;

        // Buat hasil response
        const response = {
          videos: videoList,
          nextCursor,
        };

        const cacheTTL =
          timeRange === "day"
            ? 600 // 10 menit
            : timeRange === "week"
            ? 1800 // 30 menit
            : timeRange === "month"
            ? 3600 // 1 jam
            : 10800; // 3 jam untuk "all"

        const cacheSuccess = await safeRedisSet(cacheKey, response, cacheTTL);
        if (cacheSuccess) {
          console.log(
            `[CACHE SET] Trending videos cached for ${timeRange} with TTL ${cacheTTL}s`
          );
        }

        return response;
      } catch (error) {
        console.error("Error fetching trending videos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch trending videos",
        });
      }
    }),

  // Procedure untuk manual reset cache trending
  resetTrendingCache: baseProcedure
    .input(
      z.object({
        timeRange: z
          .enum(["day", "week", "month", "all", "all-ranges"])
          .default("all-ranges"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        let deletedCount = 0;

        if (input.timeRange === "all-ranges") {
          // Hapus semua cache trending dengan pattern
          deletedCount = await safeRedisDelete("trending:*");

          // Reset meta key
          await safeRedisSet("meta:trending-keys", []);
        } else {
          // Hapus cache untuk timeRange tertentu
          deletedCount = await safeRedisDelete(`trending:${input.timeRange}:*`);

          // Update meta key
          try {
            const trendingKeysMetaKey = "meta:trending-keys";
            const existingKeys = await safeRedisGet<string[]>(
              trendingKeysMetaKey,
              []
            );

            const updatedKeys = existingKeys.filter(
              (key) => !key.startsWith(`trending:${input.timeRange}:`)
            );
            await safeRedisSet(trendingKeysMetaKey, updatedKeys);
          } catch (metaError) {
            console.error(
              "[CACHE META ERROR] Failed to update trending keys meta during reset:",
              metaError
            );
          }
        }

        // Catat waktu terakhir invalidasi
        await redis.set("trending:last_invalidation", new Date().toISOString());

        return {
          success: true,
          message: `Cleared ${deletedCount} trending cache entries`,
          timeRange: input.timeRange,
        };
      } catch (error) {
        console.error("Error resetting trending cache:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset trending cache",
        });
      }
    }),
});
