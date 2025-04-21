"use client";
import { trpc } from "@/trpc/client";
import { FormView } from "../sections/form-section";
import { VideoPlayer } from "@/modules/videos/ui/components/video-player";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

interface PageProps {
  videoId: string;
}

export const VideoView = ({ videoId }: PageProps) => {
  return (
    <div className="px-4 pt-2.5 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Suspense fallback={<VideoPlayerSkeleton />}>
            <VideoPlayerWrapper videoId={videoId} />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <FormView videoId={videoId} />
        </div>
      </div>
    </div>
  );
};

const VideoPlayerWrapper = ({ videoId }: PageProps) => {
  const [video] = trpc.studio.getOne.useSuspenseQuery({ id: videoId });

  if (!video.muxPlaybackId) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center rounded-xl">
        <p className="text-muted-foreground">Video is processing...</p>
      </div>
    );
  }

  return (
    <VideoPlayer playbackId={video.muxPlaybackId} videoTitle={video.title} />
  );
};

const VideoPlayerSkeleton = () => {
  return <Skeleton className="aspect-video w-full rounded-xl" />;
};
