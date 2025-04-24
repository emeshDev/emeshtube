"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoGrid } from "@/modules/home/ui/views/video-grid";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { trpc } from "@/trpc/client";
import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import Link from "next/link";
import { LIKED_VIDEOS_LIMIT } from "@/constants";

interface LikedVideosViewProps {
  limit?: number;
}

// VideoGridSkeleton reuse dari komponen lain
const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: LIKED_VIDEOS_LIMIT }).map((_, index) => (
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

export const LikedVideosView = ({
  limit = LIKED_VIDEOS_LIMIT,
}: LikedVideosViewProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const {
    data: likedVideosData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.likes.getLikedVideos.useInfiniteQuery(
    {
      limit,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

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
  }, [isInitialLoading, isLoading]);

  // Flatkan data untuk rendering
  const videos =
    likedVideosData?.pages
      .flatMap((page) => page.items)
      .filter((item) => item.video !== null && item.creator !== null)
      .map((item) => ({
        video: item.video!,
        creator: item.creator!,
      })) || [];

  // Tampilkan skeleton saat loading
  if (isInitialLoading || isLoading) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <div className="flex items-center mb-4">
          <ThumbsUp className="mr-2 h-5 w-5" />
          <h2 className="text-2xl font-semibold">Liked Videos</h2>
        </div>
        <VideoGridSkeleton />
      </div>
    );
  }

  // Tampilkan pesan jika tidak ada video yang disukai
  if (videos.length === 0) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <div className="flex items-center mb-4">
          <ThumbsUp className="mr-2 h-5 w-5" />
          <h2 className="text-2xl font-semibold">Liked Videos</h2>
        </div>
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">No liked videos found</h3>
          <p className="text-muted-foreground mt-2">
            Videos you like will appear here
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
      <div className="flex items-center mb-4">
        <ThumbsUp className="mr-2 h-5 w-5" />
        <h2 className="text-2xl font-semibold">Liked Videos</h2>
      </div>

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
