"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CHANNEL_VIDEOS_LIMIT } from "@/constants";
import { usePusher } from "@/hooks/usePusher";
import { VideoGrid } from "@/modules/home/ui/views/video-grid";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

interface ChannelVideosProps {
  channelId: string;
}

export const ChannelVideos = ({ channelId }: ChannelVideosProps) => {
  const { deletedVideoIds } = usePusher();
  const [tabFilter, setTabFilter] = useState<"all" | "public" | "private">(
    "all"
  );
  const { userId: clerkId } = useAuth();

  //   get the channel to check if its the current users channel
  const { data: channel } = trpc.channel.getChannelById.useQuery({
    channelId,
    clerkId: clerkId || undefined,
  });

  const {
    data: videosData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = trpc.channel.getChannelVideos.useInfiniteQuery(
    {
      channelId,
      limit: CHANNEL_VIDEOS_LIMIT,
      clerkId: clerkId || undefined, // Pass current user ID if logged in
      visibility: tabFilter !== "all" ? tabFilter : undefined,
    },
    {
      getNextPageParam: (last) => last.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

  //   Flatten video pages for rendering
  const videos =
    videosData?.pages
      .flatMap((page) => page.videos)
      .filter(
        (item) => item.creator !== null && !deletedVideoIds.has(item.video.id)
      ) || [];

  if (isLoading) {
    return <ChannelVideosSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-medium">No Videos</h3>
        <p className="text-muted-foreground mt-2">
          {channel?.isOwner
            ? "You haven't uploaded any videos yet"
            : "This channel hasn't uploaded any videos yet"}
        </p>
      </div>
    );
  }

  // Only show filter tabs if user is the owner of the channel
  // Owner can filter by All/Public/Private
  return (
    <div>
      {channel?.isOwner && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTabFilter("all")}
            className={`text-sm font-medium ${
              tabFilter === "all"
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Videos
          </button>
          <button
            onClick={() => setTabFilter("public")}
            className={`text-sm font-medium ${
              tabFilter === "public"
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setTabFilter("private")}
            className={`text-sm font-medium ${
              tabFilter === "private"
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Private
          </button>
        </div>
      )}

      <VideoGrid videos={videos} />

      <InfiniteScroll
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isManual={true}
      />
    </div>
  );
};

const ChannelVideosSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: CHANNEL_VIDEOS_LIMIT }).map((_, index) => (
      <div key={index} className="space-y-3">
        <Skeleton className="aspect-video w-full rounded-xl" />
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
);
