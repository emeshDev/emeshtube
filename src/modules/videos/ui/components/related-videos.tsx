"use client";

import { VideoCard } from "@/modules/videos/ui/components/video-cards";
import { trpc } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

interface RelatedVideosProps {
  videoId: string;
  categoryId?: string;
}

export const RelatedVideos = ({ videoId, categoryId }: RelatedVideosProps) => {
  // Fetch related videos
  const { data, isLoading, isError } = trpc.videos.getRelated.useQuery(
    {
      videoId,
      categoryId,
      limit: 8,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <RelatedVideoSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-muted-foreground">
        Failed to load related videos.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No related videos found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <VideoCard
          key={item.video.id}
          video={item.video}
          creator={
            item.creator || {
              id: "unknown",
              name: "Unknown Creator",
              imageUrl: null,
            }
          }
          isCompact
        />
      ))}
    </div>
  );
};

const RelatedVideoSkeleton = () => (
  <div className="flex space-x-2">
    <Skeleton className="h-24 w-40 rounded-md flex-shrink-0" />
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);
