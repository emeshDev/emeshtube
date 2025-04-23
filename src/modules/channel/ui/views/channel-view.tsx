"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/trpc/client";
import { formatNumber } from "@/lib/utils";
import { ChannelVideos } from "../components/channel-videos";
import { Bell, BellOff, CalendarDays, Users2 } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

interface ChannelViewProps {
  channelId: string;
}

export const ChannelView = ({ channelId }: ChannelViewProps) => {
  const utils = trpc.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userId: clerkId } = useAuth();

  const { data: channel, isLoading } = trpc.channel.getChannelById.useQuery({
    channelId,
    clerkId: clerkId || undefined, // Pass current user ID if logged in
  });

  const { mutate: subscribe } = trpc.channel.subscribe.useMutation({
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: (data) => {
      if (data.subscribed) {
        toast.success("Subscribed to channel");
      } else {
        toast.success("Unsubscribed from channel");
      }
      // Invalidate queries to refresh data
      utils.channel.getChannelById.invalidate({
        channelId,
        clerkId: clerkId || undefined,
      });
    },
    onError: (error) => {
      toast.error("Failed to update subscription", {
        description: error.message,
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const { mutate: toggleNotifications } =
    trpc.channel.toggleNotifications.useMutation({
      onSuccess: (data) => {
        const status = data.notificationsEnabled ? "enabled" : "disabled";
        toast.success(`Notifications ${status}`);
        // Invalidate queries to refresh data
        utils.channel.getChannelById.invalidate({
          channelId,
          clerkId: clerkId || undefined,
        });
      },
      onError: (error) => {
        toast.error("Failed to update notification settings", {
          description: error.message,
        });
      },
    });

  const handleSubscribe = () => {
    if (isSubmitting || !clerkId) return;

    subscribe({
      channelId,
      enableNotifications: false,
    });
  };

  const handleToggleNotifications = () => {
    if (!channel?.isSubscribed || !clerkId) return;
    toggleNotifications({ channelId });
  };

  if (isLoading) {
    return <ChannelViewSkeleton />;
  }

  if (!channel) {
    return (
      <div className="container py-10">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-2">Channel not found</h1>
          <p className="text-muted-foreground">
            The channel you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Channel header/banner */}
      <div className="h-32 md:h-48 w-full bg-gradient-to-r from-gray-800 to-gray-600"></div>

      {/* Channel info */}
      <div className="container py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <UserAvatar
            imageUrl={channel.imageUrl}
            name={channel.name}
            size="xl"
          />

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{channel.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Users2 className="h-4 w-4" />
                {formatNumber(channel.subscriberCount)} subscribers
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                Joined {format(new Date(channel.createdAt), "MMMM yyyy")}
              </span>
            </div>
          </div>

          {/* Only show subscription buttons if user is logged in and not on their own channel */}
          {clerkId && !channel.isOwner && (
            <div className="flex-shrink-0 w-full md:w-auto flex gap-2">
              <Button
                className="w-full md:w-auto"
                variant={channel.isSubscribed ? "outline" : "default"}
                onClick={handleSubscribe}
                disabled={isSubmitting}
              >
                {channel.isSubscribed ? "Subscribed" : "Subscribe"}
              </Button>

              {channel.isSubscribed && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleToggleNotifications}
                  title={
                    channel.notificationsEnabled
                      ? "Disable notifications"
                      : "Enable notifications"
                  }
                >
                  {channel.notificationsEnabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Channel content */}
        <Tabs defaultValue="videos">
          <TabsList className="mb-6">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <ChannelVideos channelId={channelId} />
          </TabsContent>

          <TabsContent value="about">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-xl font-medium">About {channel.name}</h2>

              <div className="pt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Stats
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Users2 className="h-4 w-4" />
                    {formatNumber(channel.subscriberCount)} subscribers
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4" />
                    Joined {format(new Date(channel.createdAt), "MMMM d, yyyy")}
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ChannelViewSkeleton = () => (
  <div className="pb-10">
    <div className="h-32 md:h-48 w-full bg-gradient-to-r from-gray-800 to-gray-600"></div>
    <div className="container py-6">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      <Separator className="my-6" />

      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video rounded-xl" />
              <div className="flex space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
