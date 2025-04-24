"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoGrid } from "@/modules/home/ui/views/video-grid";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { trpc } from "@/trpc/client";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { TRENDING_VIDEOS_LIMIT } from "@/constants";
import { usePusher } from "@/hooks/usePusher";

interface TrendingVideosViewProps {
  limit?: number;
}

// VideoGridSkeleton reuse dari komponen lain
const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: TRENDING_VIDEOS_LIMIT }).map((_, index) => (
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

type TimeRange = "day" | "week" | "month" | "all";

export const TrendingVideosView = ({
  limit = TRENDING_VIDEOS_LIMIT,
}: TrendingVideosViewProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const { deletedVideoIds } = usePusher();

  const {
    data: trendingVideosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = trpc.trending.getTrendingVideos.useInfiniteQuery(
    {
      limit,
      timeRange,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

  // Refetch saat timeRange berubah
  useEffect(() => {
    refetch();
  }, [timeRange, refetch]);

  // Reset loading state setelah delay singkat
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isInitialLoading && !isLoading) {
      timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 200);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isInitialLoading, isLoading, isFetching]);

  // Flatkan data untuk rendering
  const videos =
    trendingVideosData?.pages
      .flatMap((page) => page.videos)
      .filter(
        (item) =>
          item.video !== null &&
          item.creator !== null &&
          !deletedVideoIds.has(item.video.id)
      ) || [];

  // Tampilkan skeleton saat loading
  if (isInitialLoading || isLoading) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            <h2 className="text-2xl font-semibold">Trending Videos</h2>
          </div>
          <div className="w-36">
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <VideoGridSkeleton />
      </div>
    );
  }

  // Tampilkan pesan jika tidak ada trending videos
  if (videos.length === 0) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            <h2 className="text-2xl font-semibold">Trending Videos</h2>
          </div>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">No trending videos found</h3>
          <p className="text-muted-foreground mt-2">
            There are no trending videos for the selected time range
          </p>
          <Button className="mt-6" variant="outline" asChild>
            <Link href={"/"}>Explore Videos</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          <h2 className="text-2xl font-semibold">Trending Videos</h2>
        </div>
        <Select
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as TimeRange)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full">
        <VideoGrid videos={videos} />
        <InfiniteScroll
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          isManual={false}
        />
      </div>
    </div>
  );
};
