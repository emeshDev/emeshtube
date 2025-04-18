// tRPC adapters untuk deploy di cloudflare workers
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "../../../../trpc/init";
import { appRouter } from "../../../../trpc/routers/_app";

// Implementasi untuk Cloudflare Workers
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  async fetch(request: Request): Promise<Response> {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext: createTRPCContext,
    });
  },
};
