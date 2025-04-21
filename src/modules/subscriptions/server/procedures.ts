import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

// Helper function to get subscribers count
async function getSubscribersCount(creatorId: string): Promise<number> {
  const [result] = await db
    .select({
      count: count(),
    })
    .from(subscriptions)
    .where(eq(subscriptions.creatorId, creatorId));

  return Number(result?.count || 0);
}

export const subscriptionsRouter = createTRPCRouter({
  getStatus: baseProcedure
    .input(
      z.object({
        creatorId: z.string().uuid(),
        subscriberId: z.string().optional(), // jika ada login clerk
      })
    )
    .query(async ({ input }) => {
      const { creatorId, subscriberId } = input;

      try {
        const [totalResult] = await db
          .select({ count: count() })
          .from(subscriptions)
          .where(eq(subscriptions.creatorId, creatorId));

        const subscribersCount = Number(totalResult?.count || 0);

        // jika tidak ada subscriberId, kembalikan count saja
        if (!subscriberId) {
          return {
            isSubscribed: false,
            notificationsEnabled: false,
            subscribersCount,
          };
        }

        // cari subscriber berdasarkan clerk ID
        const subscriberRecord = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, subscriberId))
          .limit(1);

        if (subscriberRecord.length === 0) {
          return {
            isSubscribed: false,
            notificationsEnabled: false,
            subscribersCount,
          };
        }

        const dbSubscriberId = subscriberRecord[0].id;

        // cek user sudah subscribe
        const subscriptionRecord = await db
          .select({
            notificationEnabled: subscriptions.notificationsEnabled,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.creatorId, creatorId),
              eq(subscriptions.subscriberId, dbSubscriberId)
            )
          )
          .limit(1);

        const isSubscribed = subscriptionRecord.length > 0;
        const notificationsEnabled = isSubscribed
          ? subscriptionRecord[0].notificationEnabled
          : false;

        return {
          isSubscribed,
          notificationsEnabled,
          subscribersCount,
        };
      } catch (error) {
        console.error("Error getting subscription status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get subscription status",
        });
      }
    }),

  // subscribe/unsubscribe
  toggleSubscription: protectedProcedure
    .input(
      z.object({
        creatorId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { creatorId } = input;
      const { user } = ctx;

      try {
        // Tidak bisa subscribe ke diri sendiri
        if (creatorId === user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot subscribe to yourself",
          });
        }

        // Cek apakah creator ada
        const creatorExists = await db
          .select({
            id: users.id,
          })
          .from(users)
          .where(eq(users.id, creatorId))
          .limit(1);

        if (creatorExists.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Creator not found",
          });
        }

        // Cek status subscription saat ini
        const currentSubscription = await db
          .select({
            subscriberId: subscriptions.subscriberId,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.creatorId, creatorId),
              eq(subscriptions.subscriberId, user.id)
            )
          )
          .limit(1);

        const isCurrentlySubscribed = currentSubscription.length > 0;

        // Toggle subscription
        if (isCurrentlySubscribed) {
          // Unsubscribe
          await db
            .delete(subscriptions)
            .where(
              and(
                eq(subscriptions.creatorId, creatorId),
                eq(subscriptions.subscriberId, user.id)
              )
            );

          return {
            status: "unsubscribed",
            subscribersCount: await getSubscribersCount(creatorId),
          };
        } else {
          // Subscribe
          await db.insert(subscriptions).values({
            creatorId,
            subscriberId: user.id,
            notificationsEnabled: false,
            createdAt: new Date(),
          });

          return {
            status: "subscribed",
            subscribersCount: await getSubscribersCount(creatorId),
          };
        }
      } catch (error) {
        console.error("Error toggling subscription:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update subscription",
        });
      }
    }),
  // Toggle notifications
  toggleNotifications: protectedProcedure
    .input(
      z.object({
        creatorId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { creatorId } = input;
      const { user } = ctx;

      try {
        // Cek subscription saat ini
        const currentSubscription = await db
          .select({
            notificationsEnabled: subscriptions.notificationsEnabled,
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.creatorId, creatorId),
              eq(subscriptions.subscriberId, user.id)
            )
          )
          .limit(1);

        // Jika belum subscribe, error
        if (currentSubscription.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You must be subscribed to enable notifications",
          });
        }

        const isCurrentlyEnabled = currentSubscription[0].notificationsEnabled;

        // Toggle notifications
        await db
          .update(subscriptions)
          .set({
            notificationsEnabled: !isCurrentlyEnabled,
          })
          .where(
            and(
              eq(subscriptions.creatorId, creatorId),
              eq(subscriptions.subscriberId, user.id)
            )
          );

        return {
          notificationsEnabled: !isCurrentlyEnabled,
        };
      } catch (error) {
        console.error("Error toggling notifications:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update notification settings",
        });
      }
    }),
});
