"use client";

import { Button } from "@/components/ui/button";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface InfiniteScrollProps {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isManual?: boolean; // Apakah load more akan manual (dengan tombol) atau otomatis dengan intersection
}

export const InfiniteScroll = ({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isManual = false,
}: InfiniteScrollProps) => {
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "0px 0px 200px 0px", // Deteksi 200px sebelum element terlihat
  });

  // Jika mode otomatis dan elemen terlihat, maka load data berikutnya
  useEffect(() => {
    if (!isManual && isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    isIntersecting,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isManual,
  ]);

  if (!hasNextPage) {
    return null;
  }

  return (
    <div ref={targetRef} className="flex items-center justify-center p-4">
      {isFetchingNextPage ? (
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : isManual ? (
        <Button
          variant="outline"
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          Load More
        </Button>
      ) : null}
    </div>
  );
};
