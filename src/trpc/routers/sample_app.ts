/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { auth } from "@clerk/nextjs/server";
export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query(async (opts) => {
      // const { userId } = await auth();
      // console.log("Hello World", { userId });
      // or you must be setup context and auth within on init trpc file
      // console.log(opts.ctx.clerkUserId);
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
