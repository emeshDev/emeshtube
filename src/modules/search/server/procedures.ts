import { db } from "@/db";
import { categories, users, videos } from "@/db/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";

export const searchRouter = createTRPCRouter({
  searchVideos: baseProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      const { query, limit, cursor } = input;

      try {
        // only search public videos
        const conditions = [eq(videos.visibility, "public")];

        // Handle cursor pagination
        if (cursor) {
          const cursorVideo = await db
            .select({ createdAt: videos.createdAt })
            .from(videos)
            .where(eq(videos.id, cursor))
            .limit(1);

          if (cursorVideo.length > 0) {
            conditions.push(
              sql`(${videos.createdAt},${videos.id})<(${cursorVideo[0].createdAt})`
            );
          }
        }

        // Search across video title, description, category name, and user name
        const searchResults = await db
          .select({
            video: {
              id: videos.id,
              title: videos.title,
              thumbnailUrl: videos.thumbnailUrl,
              createdAt: videos.createdAt,
              viewCount: videos.viewCount,
              duration: videos.duration,
              visibility: videos.visibility,
              userId: videos.userId,
              categoryId: videos.categoryId,
            },
            creator: {
              id: users.id,
              name: users.name,
              imageUrl: users.imageUrl,
            },
            category: {
              name: categories.name,
            },
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .leftJoin(categories, eq(videos.categoryId, categories.id))
          .where(
            and(
              ...conditions,
              or(
                sql`lower(${videos.title}) LIKE ${`%${query.toLowerCase()}%`}`,
                sql`lower(${
                  videos.description
                }) LIKE ${`%${query.toLowerCase()}%`}`,
                sql`lower(${users.name}) LIKE ${`%${query.toLowerCase()}%`}`,
                sql`lower(${
                  categories.name
                }) LIKE ${`%${query.toLowerCase()}%`}`
              )
            )
          )
          .orderBy(desc(videos.createdAt), desc(videos.id))
          .limit(limit + 1);

        const hasNextPage = searchResults.length > limit;
        const resultsList = hasNextPage
          ? searchResults.slice(0, limit)
          : searchResults;

        const nextCursor =
          hasNextPage && resultsList.length > 0
            ? resultsList[resultsList.length - 1].video.id
            : undefined;

        return {
          videos: resultsList,
          nextCursor,
        };
      } catch (error) {
        console.error("Error in search query:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform search",
        });
      }
    }),
});
