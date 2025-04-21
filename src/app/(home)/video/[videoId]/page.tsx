import { HydrateClient, trpc } from "@/trpc/server";
import { VideoDetailView } from "@/modules/videos/ui/views/video-detail-view";
import { notFound } from "next/navigation";
import { unstable_noStore } from "next/cache";

interface VideoPageProps {
  params: Promise<{ videoId: string }>;
}

const VideoPage = async ({ params }: VideoPageProps) => {
  // Menonaktifkan cache untuk memastikan data selalu segar
  unstable_noStore();

  const { videoId } = await params;

  // Prefetch video data
  try {
    // Prefetch video data
    void trpc.videos.getById.prefetch({ id: videoId });

    // Prefetch video stats (likes/dislikes)
    void trpc.likes.getVideoStats.prefetch({ videoId });

    // Prefetch comments dengan limit awal (menggunakan void operator)
    void trpc.comments.getByVideoId.prefetchInfinite(
      {
        videoId,
        limit: 10,
      },
      {}
    );

    // Prefetch related videos
    void trpc.videos.getRelated.prefetch({
      videoId,
      limit: 8,
    });

    return (
      <HydrateClient>
        <VideoDetailView videoId={videoId} />
      </HydrateClient>
    );
  } catch (error) {
    console.error("Error loading video:", error);
    notFound();
  }
};

export default VideoPage;
