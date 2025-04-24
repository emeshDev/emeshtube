import { TRENDING_VIDEOS_LIMIT } from "@/constants";
import { TrendingVideosView } from "@/modules/trending/ui/views/trending-videos-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";

const TrendingPage = async () => {
  unstable_noStore();

  // Prefetch data trending videos dengan default time range (week)
  void trpc.trending.getTrendingVideos.prefetchInfinite({
    limit: TRENDING_VIDEOS_LIMIT,
    timeRange: "week",
  });

  return (
    <HydrateClient>
      <TrendingVideosView limit={TRENDING_VIDEOS_LIMIT} />
    </HydrateClient>
  );
};

export default TrendingPage;
