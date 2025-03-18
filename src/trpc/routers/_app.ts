/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { categoriesRouter } from "@/modules/categories/server/procedure";

export const appRouter = createTRPCRouter({
  categories: categoriesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
