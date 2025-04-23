"use client";

import { trpc } from "@/trpc/client";
import { VideoGrid } from "@/modules/home/ui/views/video-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { useEffect, useState } from "react";
import { usePusher } from "@/hooks/usePusher";
import { SEARCH_VIDEOS_LIMIT } from "@/constants";

interface SearchViewProps {
  query?: string;
}

// Reuse the VideoGridSkeleton from videos-section.tsx
const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: SEARCH_VIDEOS_LIMIT }).map((_, index) => (
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

export const SearchView = ({ query }: SearchViewProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [prevQuery, setPrevQuery] = useState<string | undefined>(query);
  const { deletedVideoIds } = usePusher();

  // Update loading state when query changes
  useEffect(() => {
    if (query !== prevQuery) {
      setIsInitialLoading(true);
      setPrevQuery(query);
    }
  }, [query, prevQuery]);

  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = trpc.search.searchVideos.useInfiniteQuery(
    {
      query: query || "",
      limit: SEARCH_VIDEOS_LIMIT,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      enabled: !!query && query.length >= 1,
    }
  );

  // Trigger refetch when query changes
  useEffect(() => {
    if (query !== prevQuery && query && query.length >= 1) {
      refetch();
    }
  }, [query, prevQuery, refetch]);

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

  // Flatten search results pages for rendering
  const videos =
    searchData?.pages
      .flatMap((page) => page.videos)
      .filter(
        (item) => item.creator !== null && !deletedVideoIds.has(item.video.id)
      ) || [];

  if (!query || query.length < 1) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">
            Enter search terms to find videos
          </h3>
        </div>
      </div>
    );
  }

  // Show skeleton when:
  // 1. Initial loading
  // 2. When query changes and we're loading new data
  if (isInitialLoading || isLoading || (query !== prevQuery && isFetching)) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <h2 className="text-2xl font-semibold mb-4">
          Search results for: <span className="text-blue-500">{query}</span>
        </h2>
        <VideoGridSkeleton />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <h2 className="text-2xl font-semibold mb-4">
          Search results for: <span className="text-blue-500">{query}</span>
        </h2>
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">No videos found</h3>
          <p className="text-muted-foreground mt-2">
            Try different search terms or check back later
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
      <h2 className="text-2xl font-semibold mb-4">
        Search results for: <span className="text-blue-500">{query}</span>
      </h2>
      <div className="w-full">
        <VideoGrid videos={videos} />
        <InfiniteScroll
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          isManual={true}
        />
      </div>
    </div>
  );
};
