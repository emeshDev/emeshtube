"use client";

import MuxPlayer from "@mux/mux-player-react";

interface VideoPlayerProps {
  playbackId: string;
}

export const VideoPlayer = ({ playbackId }: VideoPlayerProps) => {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
      <MuxPlayer
        playbackId={playbackId}
        streamType="on-demand"
        accentColor="#0F172A"
        className="w-full h-full"
        metadata={{
          video_title: "Video Preview",
        }}
      />
    </div>
  );
};
