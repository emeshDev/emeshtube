import { HydrateClient, trpc } from "@/trpc/server";
import { ChannelView } from "@/modules/channel/ui/views/channel-view";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

interface ChannelPageProps {
  params: Promise<{ channelId: string }>;
}

const ChannelPage = async ({ params }: ChannelPageProps) => {
  unstable_noStore();
  const { channelId } = await params;

  // Get current user ID from Clerk auth
  const { userId: clerkId } = await auth();

  try {
    // Prefetch channel data with current user ID
    void trpc.channel.getChannelById.prefetch({
      channelId,
      clerkId: clerkId || undefined,
    });

    // Prefetch channel videos
    void trpc.channel.getChannelVideos.prefetchInfinite({
      channelId,
      clerkId: clerkId || undefined,
      limit: 12,
    });

    return (
      <HydrateClient>
        <ChannelView channelId={channelId} />
      </HydrateClient>
    );
  } catch (error) {
    console.error("Error in channel page:", error);
    notFound();
  }
};

export default ChannelPage;
