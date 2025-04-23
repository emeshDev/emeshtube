// app/playlists/history/page.tsx
import { HistoryView } from "@/modules/history/ui/views/history-view";
import { HydrateClient, trpc } from "@/trpc/server";
import { unstable_noStore } from "next/cache";
// import { currentUser } from "@clerk/nextjs/server";
// import { redirect } from "next/navigation";
import { HISTORY_VIDEOS_LIMIT } from "@/constants";

const HistoryPage = async () => {
  unstable_noStore();

  //   // Gunakan currentUser() dari Clerk sebagai pengganti auth()
  //   const user = await currentUser();

  //   // Redirect ke login jika user tidak login
  //   if (!user) {
  //     redirect("/sign-in?redirect_url=/playlists/history");
  //   }

  // Prefetch data history - ini akan bekerja karena server TRPC memeriksa auth dalam middleware
  void trpc.history.getHistory.prefetchInfinite({
    limit: HISTORY_VIDEOS_LIMIT,
  });

  return (
    <HydrateClient>
      <HistoryView limit={HISTORY_VIDEOS_LIMIT} />
    </HydrateClient>
  );
};

export default HistoryPage;
