/* eslint-disable @typescript-eslint/no-explicit-any */
// src/trpc/server.tsx
import "server-only";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { cache } from "react";
import { createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";

// IMPORTANT: Create a stable getter for the query client that
// will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

// Jika ingin menggunakan direct caller di server component
export const caller = appRouter.createCaller(createTRPCContext);

// Fungsi helper untuk hydration
export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

// Fungsi helper untuk prefetch yang ditingkatkan
export function prefetch<TOptions>(queryOptions: TOptions) {
  const queryClient = getQueryClient();

  // Cek apakah queryOptions adalah untuk infinite query
  if (
    queryOptions &&
    typeof queryOptions === "object" &&
    "queryKey" in queryOptions &&
    Array.isArray((queryOptions as any).queryKey) &&
    (queryOptions as any).queryKey[1]?.type === "infinite"
  ) {
    // Tambahkan initialPageParam jika belum ada
    const enhancedOptions = {
      initialPageParam: undefined,
      ...(queryOptions as any),
    };
    void queryClient.prefetchInfiniteQuery(enhancedOptions);
  } else {
    void queryClient.prefetchQuery(queryOptions as any);
  }
}
