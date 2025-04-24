import { LikedVideosView } from "@/modules/likes/ui/views/liked-videos-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LIKED_VIDEOS_LIMIT } from "@/constants";

const LikedVideosPage = async () => {
  unstable_noStore();

  // Gunakan currentUser() dari Clerk
  const user = await currentUser();

  // Redirect ke login jika user tidak login
  if (!user) {
    redirect("/sign-in?redirect_url=/playlists/liked");
  }

  // Prefetch data liked videos
  void trpc.likes.getLikedVideos.prefetchInfinite({
    limit: LIKED_VIDEOS_LIMIT,
  });

  return (
    <HydrateClient>
      <LikedVideosView limit={LIKED_VIDEOS_LIMIT} />
    </HydrateClient>
  );
};

export default LikedVideosPage;
