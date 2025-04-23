import { useState, useEffect } from "react";
import Pusher from "pusher-js";
import { toast } from "sonner";

export function usePusher() {
  const [deletedVideoIds, setDeletedVideoIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    // Only initialize in the browser
    if (typeof window === "undefined") return;

    // Initialize Pusher
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.error("Pusher configuration missing");
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    // Subscribe to channel
    const channel = pusher.subscribe("videos-channel");

    // Listen for video deletion events
    channel.bind("video-deleted", (data: { videoId: string }) => {
      console.log("Video deleted event received:", data.videoId);

      setDeletedVideoIds((prev) => {
        const newSet = new Set([...prev]);
        newSet.add(data.videoId);
        return newSet;
      });

      // Show toast notification
      toast.info("Content updated", {
        description: "A video has been removed",
      });
    });

    // Cleanup on unmount
    return () => {
      channel.unbind_all();
      pusher.unsubscribe("videos-channel");
      pusher.disconnect();
    };
  }, []);

  return { deletedVideoIds };
}
