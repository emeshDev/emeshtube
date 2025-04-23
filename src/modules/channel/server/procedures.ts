import { db } from "@/db";
import { subscriptions, users, videos } from "@/db/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export const channelRouter = createTRPCRouter({
  getChannelById: baseProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        clerkId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { channelId, clerkId } = input;

      // Cari user berdasarkan clerkId jika ada
      let currentUserId: string | undefined = undefined;
      if (clerkId) {
        const [currentUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if (currentUser) {
          currentUserId = currentUser.id;
        }
      }

      try {
        // Get channel (user) info
        const [channel] = await db
          .select({
            id: users.id,
            name: users.name,
            imageUrl: users.imageUrl,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, channelId))
          .limit(1);

        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel not found",
          });
        }
        // Count subscribers
        const [subscriberCount] = await db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(subscriptions)
          .where(eq(subscriptions.creatorId, channelId));

        //   Check if current user is subscribed
        let isSubscribed = false;
        let notificationsEnabled = false;

        if (currentUserId) {
          const [subscription] = await db
            .select({
              subscriberId: subscriptions.subscriberId,
              notificationsEnabled: subscriptions.notificationsEnabled,
            })
            .from(subscriptions)
            .where(
              and(
                eq(subscriptions.creatorId, channelId),
                eq(subscriptions.subscriberId, currentUserId)
              )
            )
            .limit(1);

          if (subscription) {
            isSubscribed = true;
            notificationsEnabled = !!subscription.notificationsEnabled;
          }
        }

        // check if this is the user's own channel
        const isOwner = currentUserId === channelId;

        return {
          ...channel,
          subscriberCount: subscriberCount.count || 0,
          isSubscribed,
          notificationsEnabled,
          isOwner,
        };
      } catch (error) {
        console.error("Error fetching channel:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch channel",
        });
      }
    }),

  getChannelVideos: baseProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        clerkId: z.string().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(12),
        visibility: z.enum(["public", "private"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const { channelId, clerkId, cursor, limit, visibility } = input;

      // Cari user berdasarkan clerkId jika ada
      let currentUserId: string | undefined = undefined;
      if (clerkId) {
        const [currentUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, clerkId))
          .limit(1);

        if (currentUser) {
          currentUserId = currentUser.id;
        }
      }

      try {
        const conditions = [eq(videos.userId, channelId)];

        // for non owners, only show public videos
        if (currentUserId !== channelId) {
          conditions.push(eq(videos.visibility, "public"));
        }
        // for owner with visibility filter
        else if (visibility) {
          conditions.push(eq(videos.visibility, visibility));
        }

        // Add cursor pagination
        if (cursor) {
          const cursorVideo = await db
            .select({ createdAt: videos.createdAt })
            .from(videos)
            .where(eq(videos.id, cursor))
            .limit(1);

          if (cursorVideo.length > 0) {
            conditions.push(
              sql`(${videos.createdAt},${videos.id}<(${cursorVideo[0].createdAt},${cursor}))`
            );
          }
        }

        // Get videos with creator info
        const videoWithCreators = await db
          .select({
            video: videos,
            creator: {
              id: users.id,
              name: users.name,
              imageUrl: users.imageUrl,
            },
          })
          .from(videos)
          .leftJoin(users, eq(videos.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(videos.createdAt), desc(videos.id))
          .limit(limit + 1);
        //   Determine if there's a next page
        const hasNextPage = videoWithCreators.length > limit;
        const videosList = hasNextPage
          ? videoWithCreators.slice(0, limit)
          : videoWithCreators;
        //   Get the next cursor
        const nextCursor =
          hasNextPage && videosList.length > 0
            ? videosList[videosList.length - 1].video.id
            : undefined;

        return {
          videos: videosList,
          nextCursor,
        };
      } catch (error) {
        console.error("Error fetching channel videos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch channel videos",
        });
      }
    }),
  // subscribe to channel
  subscribe: protectedProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        enableNotifications: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { channelId, enableNotifications } = input;
      const { user } = ctx;

      try {
        // check if channel exists
        const [channel] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, channelId))
          .limit(1);

        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel not found",
          });
        }

        //   cant subscribe to own channel
        if (channelId === user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot subscribe to your own channel",
          });
        }

        // check if already subscribed
        const [existingSubscription] = await db
          .select({
            subscriberId: subscriptions.subscriberId,
            creatorId: subscriptions.creatorId,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.creatorId, channelId),
              eq(subscriptions.subscriberId, user.id)
            )
          )
          .limit(1);

        if (existingSubscription) {
          // already subscribed, so unsubscribe
          await db
            .delete(subscriptions)
            .where(
              and(
                eq(subscriptions.creatorId, channelId),
                eq(subscriptions.subscriberId, user.id)
              )
            );
          return { subscribed: false };
        } else {
          // not subscribed, so subscribe
          await db.insert(subscriptions).values({
            creatorId: channelId,
            subscriberId: user.id,
            notificationsEnabled: enableNotifications,
          });
          return { subscribed: true };
        }
      } catch (error) {
        console.error("Error subscribing to channel:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to subscribe to channel",
        });
      }
    }),
  // toggle notifications
  toggleNotifications: protectedProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { channelId } = input;
      const { user } = ctx;

      try {
        // Get current subscription
        const [subscription] = await db
          .select({
            notificationsEnabled: subscriptions.notificationsEnabled,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.creatorId, channelId),
              eq(subscriptions.subscriberId, user.id)
            )
          )
          .limit(1);

        if (!subscription) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You are not subscribed to this channel",
          });
        }

        // Toggle notifications status
        const newStatus = !subscription.notificationsEnabled;

        // Update subscription
        await db
          .update(subscriptions)
          .set({ notificationsEnabled: newStatus })
          .where(
            and(
              eq(subscriptions.creatorId, channelId),
              eq(subscriptions.subscriberId, user.id)
            )
          );

        return { notificationsEnabled: newStatus };
      } catch (error) {
        console.error("Error toggling notifications:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to toggle notifications",
        });
      }
    }),
});
