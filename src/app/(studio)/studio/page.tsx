import { DEFAULT_LIMIT } from "@/constants";
import { StudioView } from "@/modules/studio/ui/view/studio-view";
import { HydrateClient, trpc } from "@/trpc/server";

import React from "react";

type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  // Await searchParams terlebih dahulu
  const searchParamsResolved = await searchParams;

  // Kemudian akses propertinya
  const selectedCategoryId =
    typeof searchParamsResolved.categoryId === "string"
      ? searchParamsResolved.categoryId
      : undefined;

  void trpc.studio.infiniteVideos.prefetchInfinite({
    limit: DEFAULT_LIMIT,
    categoryId: selectedCategoryId,
  });

  return (
    <HydrateClient>
      <StudioView categoryId={selectedCategoryId} />
    </HydrateClient>
  );
};

export default Page;
