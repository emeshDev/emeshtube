"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useClerk, useUser } from "@clerk/nextjs";
import { BellIcon, CheckIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SubscribeButtonProps {
  creatorId: string;
  className?: string;
}

export const SubscribeButton = ({
  creatorId,
  className,
}: SubscribeButtonProps) => {
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const utils = trpc.useUtils();

  // Fetch subscription status
  const { data: subscriptionData, isLoading: isSubscriptionLoading } =
    trpc.subscriptions.getStatus.useQuery(
      {
        creatorId,
        subscriberId: isSignedIn ? user?.id : undefined,
      },
      {
        refetchOnWindowFocus: false,
      }
    );

  // Subscribe/unsubscribe mutation
  const subscriptionMutation =
    trpc.subscriptions.toggleSubscription.useMutation({
      onSuccess: () => {
        utils.subscriptions.getStatus.invalidate({
          creatorId,
          subscriberId: user?.id,
        });
      },
      onError: (error) => {
        toast.error(`Subscription failed: ${error.message}`);
      },
    });

  // Toggle notifications mutation
  const notificationsMutation =
    trpc.subscriptions.toggleNotifications.useMutation({
      onSuccess: () => {
        utils.subscriptions.getStatus.invalidate({
          creatorId,
          subscriberId: user?.id,
        });
      },
      onError: (error) => {
        toast.error(`Failed to update notifications: ${error.message}`);
      },
    });

  // Handle subscribe/unsubscribe
  const handleToggleSubscription = () => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    subscriptionMutation.mutate({ creatorId });
  };

  // Handle toggle notifications
  const handleToggleNotifications = () => {
    if (!isSignedIn || !subscriptionData?.isSubscribed) return;

    notificationsMutation.mutate({ creatorId });
  };

  if (isSubscriptionLoading) {
    return (
      <Button disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  const isSubscribed = subscriptionData?.isSubscribed || false;
  const notificationsEnabled = subscriptionData?.notificationsEnabled || false;
  const subscribersCount = subscriptionData?.subscribersCount || 0;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isSubscribed ? "outline" : "default"}
        onClick={handleToggleSubscription}
        disabled={subscriptionMutation.isPending}
        className={className}
      >
        {subscriptionMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <CheckIcon className="mr-1 h-4 w-4" />
        ) : null}

        {isSubscribed ? "Subscribed" : "Subscribe"}

        {!isSubscribed && subscribersCount > 0 && (
          <span className="ml-2 text-xs">{subscribersCount}</span>
        )}
      </Button>

      {isSubscribed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleNotifications}
          className={notificationsEnabled ? "text-primary" : undefined}
          title={
            notificationsEnabled
              ? "Turn off notifications"
              : "Turn on notifications"
          }
        >
          <BellIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
