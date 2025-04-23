// app/search/page.tsx
import { SEARCH_VIDEOS_LIMIT } from "@/constants";
import { SearchView } from "@/modules/search/ui/views/search-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";

interface PageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

const SearchPage = async ({ searchParams }: PageProps) => {
  unstable_noStore();
  const { q } = await searchParams;

  if (q) {
    // Prefetch first page of search results
    void trpc.search.searchVideos.prefetchInfinite({
      query: q,
      limit: SEARCH_VIDEOS_LIMIT,
    });
  }

  return (
    <HydrateClient>
      <SearchView query={q} />
    </HydrateClient>
  );
};

export default SearchPage;
