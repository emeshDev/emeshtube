import { DEFAULT_LIMIT } from "@/constants";
import { StudioView } from "@/modules/studio/ui/views/studio-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";

import React from "react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  // Menonaktifkan cache untuk memastikan data segar
  unstable_noStore();

  // Await searchParams terlebih dahulu
  const searchParamsResolved = await searchParams;

  // Kemudian akses propertinya
  const selectedCategoryId =
    typeof searchParamsResolved.categoryId === "string"
      ? searchParamsResolved.categoryId
      : undefined;

  // Ekstrak parameter refresh
  const refreshParam =
    typeof searchParamsResolved.refresh === "string"
      ? searchParamsResolved.refresh
      : undefined;

  void trpc.studio.infiniteVideos.prefetchInfinite(
    {
      limit: DEFAULT_LIMIT,
      categoryId: selectedCategoryId,
    },
    {}
  );

  return (
    <HydrateClient>
      <StudioView categoryId={selectedCategoryId} refreshParam={refreshParam} />
    </HydrateClient>
  );
};

export default Page;
