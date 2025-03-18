import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { HomeView } from "@/modules/home/ui/views/home-view";

export const DYNAMIC = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    categoryId?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const { categoryId } = await searchParams;

  prefetch(trpc.categories.getMany.queryOptions());
  return (
    <HydrateClient>
      <HomeView categoryId={categoryId} />
    </HydrateClient>
  );
};

export default Page;
