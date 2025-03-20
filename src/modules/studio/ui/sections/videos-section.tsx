"use client";

import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";

type Props = {
  categoryId?: string | undefined;
};

export const VideosSection = ({ categoryId }: Props) => {
  const [data] = trpc.studio.infiniteVideos.useSuspenseInfiniteQuery(
    {
      limit: DEFAULT_LIMIT,
      categoryId,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return <>{JSON.stringify(data)}</>;
};
