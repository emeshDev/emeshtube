"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { trpc } from "@/trpc/client";
import { useEffect, useState } from "react";
import { VideoGrid } from "../views/video-grid";
import { usePusher } from "@/hooks/usePusher";

interface VideosSectionProps {
  categoryId?: string;
}

const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: 16 }).map((_, index) => (
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

export const VideosSection = ({ categoryId }: VideosSectionProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [prevCategoryId, setPrevCategoryId] = useState<string | undefined>(
    categoryId
  );
  const { deletedVideoIds } = usePusher();

  // Update loading state when category changes
  useEffect(() => {
    if (categoryId !== prevCategoryId) {
      setIsInitialLoading(true);
      setPrevCategoryId(categoryId);
    }
  }, [categoryId, prevCategoryId]);

  const {
    data: videosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = trpc.videos.getHomeVideos.useInfiniteQuery(
    {
      categoryId: categoryId || undefined,
      limit: 16,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      // This makes sure query is re-executed when categoryId changes
      enabled: true,
    }
  );

  // Trigger refetch when category changes
  useEffect(() => {
    if (categoryId !== prevCategoryId) {
      refetch();
    }
  }, [categoryId, prevCategoryId, refetch]);

  // Reset loading state after short delay
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isInitialLoading && !isLoading && !isFetching) {
      timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 200);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isInitialLoading, isLoading, isFetching]);

  // Flatten video pages for rendering
  const videos =
    videosData?.pages
      .flatMap((page) => page.videos)
      .filter(
        (item) => item.creator !== null && !deletedVideoIds.has(item.video.id)
      ) || [];

  // Show skeleton when:
  // 1. Initial loading
  // 2. When category changes and we're loading new data
  if (
    isInitialLoading ||
    isLoading ||
    (categoryId !== prevCategoryId && isFetching)
  ) {
    return <VideoGridSkeleton />;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium">No Videos found</h3>
        <p className="text-muted-foreground mt-2">
          Try selecting a different category or check back later
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
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
