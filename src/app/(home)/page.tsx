import { HomeView } from "@/modules/home/ui/views/home-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// export const DYNAMIC = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    categoryId?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  unstable_noStore();
  const { categoryId } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId } = await auth();

  void trpc.categories.getMany.prefetch;

  void trpc.videos.getHomeVideos.prefetchInfinite({
    categoryId: categoryId || undefined,
    limit: 16,
  });
  return (
    <HydrateClient>
      <HomeView categoryId={categoryId} />
    </HydrateClient>
  );
};

export default Page;
