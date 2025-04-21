import { createTRPCRouter } from "../init";
import { categoriesRouter } from "@/modules/categories/server/procedure";
import { commentsRouter } from "@/modules/comments/server/procedures";
import { likesRouter } from "@/modules/likes/server/procedures";
import { studioRouter } from "@/modules/studio/server/procedures";
import { videosRouter } from "@/modules/videos/server/procedures";

export const appRouter = createTRPCRouter({
  categories: categoriesRouter,
  studio: studioRouter,
  videos: videosRouter,
  comments: commentsRouter,
  likes: likesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
