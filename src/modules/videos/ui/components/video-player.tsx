"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useEffect } from "react";

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
  useEffect(() => {
    // Temukan elemen MuxPlayer setelah komponen di-mount
    const player = document.querySelector("mux-player");
    if (!player) return;

    // Event handler saat video dimulai
    const handlePlay = () => {
      // console.log("🎬 Video play event triggered");
      if (onPlay) {
        onPlay();
      }
    };

    // Event handler untuk time update
    const handleTimeUpdate = () => {
      if (player && onTimeUpdate) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const currentTime = player.currentTime;
        onTimeUpdate(currentTime);
      }
    };

    // Tambahkan event listeners
    player.addEventListener("play", handlePlay);

    if (onTimeUpdate) {
      player.addEventListener("timeupdate", handleTimeUpdate);
    }

    // Cleanup event listeners
    return () => {
      player.removeEventListener("play", handlePlay);

      if (onTimeUpdate) {
        player.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };
  }, [onPlay, onTimeUpdate]);

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
      />
    </div>
  );
};
