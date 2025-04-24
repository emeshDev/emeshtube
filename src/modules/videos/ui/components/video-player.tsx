"use client";

import MuxPlayer from "@mux/mux-player-react";

interface VideoPlayerProps {
  playbackId: string;
  videoTitle?: string;
  onPlay?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const VideoPlayer = ({
  playbackId,
  videoTitle,
  onPlay,
  onTimeUpdate,
}: VideoPlayerProps) => {
  // Handler untuk timeupdate jika diperlukan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTimeUpdate = (event: any) => {
    if (onTimeUpdate) {
      const currentTime = event.target.currentTime;
      onTimeUpdate(currentTime);
    }
  };

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
      <MuxPlayer
        playbackId={playbackId}
        streamType="on-demand"
        accentColor="#0F172A"
        className="w-full h-full"
        metadata={{
          video_title: videoTitle,
        }}
        onPlay={onPlay}
        onTimeUpdate={onTimeUpdate ? handleTimeUpdate : undefined}
      />
    </div>
  );
};
