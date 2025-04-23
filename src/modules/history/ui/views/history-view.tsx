"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoGrid } from "@/modules/home/ui/views/video-grid";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { trpc } from "@/trpc/client";
import { useEffect, useState } from "react";
import { usePusher } from "@/hooks/usePusher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HISTORY_VIDEOS_LIMIT } from "@/constants";

interface HistoryViewProps {
  limit?: number;
}

// VideoGridSkeleton reuse dari komponen lain
const VideoGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: HISTORY_VIDEOS_LIMIT }).map((_, index) => (
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

export const HistoryView = ({
  limit = HISTORY_VIDEOS_LIMIT,
}: HistoryViewProps) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { deletedVideoIds } = usePusher();
  const clearHistoryMutation = trpc.history.clearHistory.useMutation();

  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = trpc.history.getHistory.useInfiniteQuery(
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

  // Handler untuk menghapus semua history
  const handleClearHistory = async () => {
    try {
      await clearHistoryMutation.mutateAsync();
      await refetch();
      toast.success("Watch history has been cleared");
    } catch (error) {
      console.error("Error clearing history:", error);
      toast.error("Failed to clear watch history");
    }
  };

  // Flatkan data history untuk rendering
  // Filter item yang videonya ada dan creatornya juga ada
  // Filter video yang sudah dihapus
  const videos =
    historyData?.pages
      .flatMap((page) => page.items)
      .filter(
        (item) =>
          item.video !== null &&
          item.creator !== null &&
          !deletedVideoIds.has(item.video.id)
      )
      .map((item) => ({
        video: item.video!, // Non-null assertion karena sudah di-filter
        creator: item.creator!, // Non-null assertion karena sudah di-filter
      })) || [];

  // Tampilkan skeleton saat loading
  if (isInitialLoading || isLoading) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Watch History</h2>
        </div>
        <VideoGridSkeleton />
      </div>
    );
  }

  // Tampilkan pesan jika tidak ada history
  if (videos.length === 0) {
    return (
      <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
        <h2 className="text-2xl font-semibold mb-4">Watch History</h2>
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">No watch history found</h3>
          <p className="text-muted-foreground mt-2">
            Videos you watch will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-6 flex flex-col gap-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Watch History</h2>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Watch History</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear your entire watch history? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearHistory}>
                Clear History
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
