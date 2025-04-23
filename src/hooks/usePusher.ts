// src/hooks/usePusher.ts
import { useState, useEffect } from "react";
import Pusher from "pusher-js";

export function usePusher() {
  const [deletedVideoIds, setDeletedVideoIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    // Init Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    // Subscribe to channel
    const channel = pusher.subscribe("videos-channel");

    // Listen for events
    channel.bind("video-deleted", (data: { videoId: string }) => {
      console.log("Video deleted event received:", data.videoId);
      setDeletedVideoIds((prev) => new Set([...prev, data.videoId]));
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      pusher.unsubscribe("videos-channel");
      pusher.disconnect();
    };
  }, []);

  return { deletedVideoIds };
}
