"use client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_LIMIT } from "@/constants";
import { toSnakeCase, toTitleCase, truncateText } from "@/lib/utils";
import { VideoThumbnail } from "@/modules/videos/ui/components/video-thumbnail";
import { trpc } from "@/trpc/client";
import { Globe2Icon, LockIcon } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  categoryId?: string | undefined;
};

export const VideosSection = ({ categoryId }: Props) => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ErrorBoundary fallback={<p>Error...</p>}>
        <VideosSectionSuspense categoryId={categoryId} />
      </ErrorBoundary>
    </Suspense>
  );
};

const VideosSectionSuspense = ({ categoryId }: Props) => {
  const utils = trpc.useUtils();
  const [videos, query] = trpc.studio.infiniteVideos.useSuspenseInfiniteQuery(
    {
      limit: DEFAULT_LIMIT,
      categoryId,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Fungsi untuk memformat tanggal secara client-side
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    // Check if any video is in processing state
    const hasProcessingVideos = videos.pages.some((page) =>
      page.items.some(
        (video) => video.muxStatus === "preparing" || !video.thumbnailUrl // Also check if thumbnail is not available yet
      )
    );

    // If there are processing videos, set up polling
    if (hasProcessingVideos) {
      const interval = setInterval(() => {
        utils.studio.infiniteVideos.invalidate();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [videos, utils.studio.infiniteVideos]);

  return (
    <div>
      <div className="border-y">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6 w-[510px]">Video</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right pr-6">Likes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.pages
              .flatMap((page) => page.items)
              .map((video) => (
                <Link
                  href={`/studio/videos/${video.id}`}
                  key={video.id}
                  legacyBehavior
                >
                  <TableRow className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="relative aspect-video w-36 shrink-0">
                          <VideoThumbnail
                            thumbnailUrl={video.thumbnailUrl}
                            previewUrl={video.previewUrl}
                            title={video.title}
                            duration={video.duration}
                          />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">
                            {video.title
                              ? toTitleCase(video.title)
                              : "Untitled"}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {video.description
                              ? truncateText(video.description, 25)
                              : "No Description"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {video.visibility === "private" ? (
                          <LockIcon className="size-4 mr-2" />
                        ) : (
                          <Globe2Icon className="size-4 mr-2" />
                        )}
                        {toSnakeCase(video.visibility)}
                      </div>
                    </TableCell>
                    <TableCell>{video.muxStatus || "Processing"}</TableCell>
                    <TableCell className="text-sm truncate">
                      {video.createdAt instanceof Date
                        ? formatDate(video.createdAt)
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">0</TableCell>
                    <TableCell className="text-right">0</TableCell>
                    <TableCell className="text-right pr-6">0</TableCell>
                  </TableRow>
                </Link>
              ))}
          </TableBody>
        </Table>
      </div>
      <InfiniteScroll
        isManual
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
      />
    </div>
  );
};
