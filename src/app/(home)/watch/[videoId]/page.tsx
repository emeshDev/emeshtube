import { HydrateClient, trpc } from "@/trpc/server";
import { VideoDetailView } from "@/modules/videos/ui/views/video-detail-view";
import { notFound } from "next/navigation";
import { unstable_noStore } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, videos } from "@/db/schema";
import { eq } from "drizzle-orm";

interface VideoPageProps {
  params: Promise<{ videoId: string }>;
}

const VideoPage = async ({ params }: VideoPageProps) => {
  // Menonaktifkan cache untuk memastikan data selalu segar
  unstable_noStore();

  const { videoId } = await params;

  const { userId } = await auth();

  // Prefetch video data
  try {
    // Prefetch video data (gunakan void untuk menghindari blocking)
    void trpc.videos.getById.prefetch({ id: videoId });

    // Ambil creatorId dari database langsung untuk prefetching
    const videoData = await db
      .select({
        video: videos,
        creator: {
          id: users.id,
        },
      })
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    // Prefetch subscription status jika video ada
    if (videoData.length > 0 && videoData[0].creator) {
      void trpc.subscriptions.getStatus.prefetch({
        creatorId: videoData[0].creator.id,
        subscriberId: userId || undefined,
      });
    }

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
