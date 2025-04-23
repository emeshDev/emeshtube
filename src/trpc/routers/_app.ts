import { createTRPCRouter } from "../init";
import { categoriesRouter } from "@/modules/categories/server/procedure";
import { channelRouter } from "@/modules/channel/server/procedures";
import { commentsRouter } from "@/modules/comments/server/procedures";
import { likesRouter } from "@/modules/likes/server/procedures";
import { searchRouter } from "@/modules/search/server/procedures";
import { studioRouter } from "@/modules/studio/server/procedures";
import { subscriptionsRouter } from "@/modules/subscriptions/server/procedures";
import { videosRouter } from "@/modules/videos/server/procedures";

export const appRouter = createTRPCRouter({
  categories: categoriesRouter,
  studio: studioRouter,
  videos: videosRouter,
  comments: commentsRouter,
  likes: likesRouter,
  subscriptions: subscriptionsRouter,
  channel: channelRouter,
  search: searchRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
