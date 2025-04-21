"use client";

import { VideoPlayer } from "@/modules/videos/ui/components/video-player";
import { trpc } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoComments } from "@/modules/comments/ui/components/VideoComments";
import { RelatedVideos } from "@/modules/videos/ui/components/related-videos";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { SubscribeButton } from "@/modules/subscriptions/ui/components/SubscribeButton";

interface VideoDetailViewProps {
  videoId: string;
}

export const VideoDetailView = ({ videoId }: VideoDetailViewProps) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);

  // Get user info
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const clerk = useClerk();

  // Fetch video data
  const { data: videoData, isLoading: isVideoLoading } =
    trpc.videos.getById.useQuery(
      { id: videoId },
      {
        refetchOnWindowFocus: false,
        retry: 1,
      }
    );

  // Fetch like/dislike statistics with userId if signed in
  const { data: likeStats } = trpc.likes.getVideoStats.useQuery(
    {
      videoId,
      userId: isSignedIn ? user?.id : undefined, // Pass Clerk user ID if available
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // View count mutation
  const viewMutation = trpc.videos.incrementViewCount.useMutation();

  // Increment view count once when page is loaded
  useEffect(() => {
    // Only increment view count once per session
    if (!viewCounted && videoId) {
      viewMutation.mutate({
        videoId,
        viewerId: user?.id, // Pass the user ID if available
      });
      setViewCounted(true);
    }
  }, [videoId, user?.id, viewCounted, viewMutation]);

  // Like/dislike mutation
  const utils = trpc.useUtils();
  const likeMutation = trpc.likes.toggleLike.useMutation({
    onSuccess: () => {
      // Invalidate like stats to refetch
      utils.likes.getVideoStats.invalidate({ videoId, userId: user?.id });
    },
  });

  // Handle like/dislike
  const handleReaction = (isLike: boolean) => {
    // Check if user is signed in
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }

    likeMutation.mutate({ videoId, isLike });
  };

  const video = videoData?.video;
  const creator = videoData?.creator;

  if (isVideoLoading) {
    return <VideoDetailSkeleton />;
  }

  if (!video || !creator) {
    return <div className="p-6 text-center">Video not found</div>;
  }

  // Determine if description should be truncated
  const descriptionLines = video.description?.split("\n") || [];
  const hasLongDescription =
    descriptionLines.length > 3 ||
    (video.description && video.description.length > 300);
  const truncatedDescription =
    hasLongDescription && !showFullDescription
      ? descriptionLines.slice(0, 3).join("\n")
      : video.description;

  return (
    <div className="container mx-auto py-6 px-4 md:px-8 lg:px-16 max-w-screen-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video player */}
          <VideoPlayer
            playbackId={video.muxPlaybackId || ""}
            videoTitle={video.title}
          />

          {/* Video info */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{video.title}</h1>

            <div className="flex flex-wrap items-center justify-between gap-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={creator.imageUrl || undefined} />
                  <AvatarFallback>
                    {creator.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{creator.name}</p>
                  <SubscribeButton creatorId={creator.id} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(video.viewCount || 0)} views
                  </span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(video.createdAt)}
                </span>
              </div>
            </div>

            {/* Like/Dislike buttons */}
            <div className="flex items-center space-x-4">
              <Button
                variant={
                  likeStats?.userReaction === "like" ? "default" : "outline"
                }
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => handleReaction(true)}
                disabled={likeMutation.isPending}
                title={!isSignedIn ? "Sign in to like this video" : "Like"}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{formatNumber(likeStats?.likes || 0)}</span>
              </Button>
              <Button
                variant={
                  likeStats?.userReaction === "dislike" ? "default" : "outline"
                }
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => handleReaction(false)}
                disabled={likeMutation.isPending}
                title={
                  !isSignedIn ? "Sign in to dislike this video" : "Dislike"
                }
              >
                <ThumbsDown className="h-4 w-4" />
                <span>{formatNumber(likeStats?.dislikes || 0)}</span>
              </Button>
            </div>

            {/* Description */}
            <div className="bg-muted/40 rounded-lg p-4">
              <div className="whitespace-pre-line">{truncatedDescription}</div>
              {hasLongDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Comments section */}
          <VideoComments videoId={videoId} />
        </div>

        {/* Sidebar (related videos) */}
        <div>
          <h3 className="text-lg font-medium mb-4">Related Videos</h3>
          <RelatedVideos
            videoId={videoId}
            categoryId={video.categoryId || undefined}
          />
        </div>
      </div>
    </div>
  );
};

const VideoDetailSkeleton = () => (
  <div className="container mx-auto py-6 px-4 md:px-8 lg:px-16 max-w-screen-2xl">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Video player skeleton */}
        <div className="aspect-video bg-muted rounded-xl" />

        {/* Title skeleton */}
        <Skeleton className="h-8 w-3/4" />

        {/* User info skeleton */}
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>

        {/* Stats skeleton */}
        <div className="flex space-x-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Related videos skeleton */}
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-2">
              <Skeleton className="h-24 w-40 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
