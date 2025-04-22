"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { formatNumber, formatRelativeTime, formatDuration } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Eye } from "lucide-react";

interface Creator {
  id: string;
  name: string;
  imageUrl: string;
}

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  createdAt: Date;
  viewCount: number;
  duration?: number | null;
  visibility?: "private" | "public";
  userId?: string;
  categoryId?: string | null;
}

// This is the structure from your actual API response
interface VideoWithCreator {
  video: Video;
  creator: Creator | null;
}

// Props for video item component - requires non-null creator
interface VideoItemProps {
  video: Video;
  creator: Creator;
}

const VideoItem = ({ video, creator }: VideoItemProps) => {
  return (
    <div className="group cursor-pointer">
      <Link href={`/watch/${video.id}`}>
        <div className="aspect-video relative rounded-xl overflow-hidden bg-muted mb-3">
          {video.thumbnailUrl ? (
            <>
              <Image
                src={video.thumbnailUrl}
                alt={video.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform group-hover:scale-105"
              />
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
                  {formatDuration(video.duration)}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">No thumbnail</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex space-x-3">
        <Link href={`/channel/${creator.id}`}>
          <UserAvatar
            imageUrl={creator.imageUrl}
            name={creator.name}
            size="lg"
          />
        </Link>
        <div className="flex-1 space-y-1">
          <Link href={`/watch/${video.id}`}>
            <h3 className="font-medium line-clamp-2 text-base group-hover:text-primary">
              {video.title}
            </h3>
          </Link>
          <Link href={`/channel/${creator.id}`}>
            <p className="text-sm text-muted-foreground hover:text-foreground transition">
              {creator.name}
            </p>
          </Link>
          <div className="flex items-center text-xs text-muted-foreground space-x-1">
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{formatNumber(video.viewCount)}</span>
            </div>
            <span>•</span>
            <span>{formatRelativeTime(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// The VideoGrid component - accepts the data structure with potentially null creators
interface VideoGridProps {
  videos: VideoWithCreator[];
}

export const VideoGrid = ({ videos }: VideoGridProps) => {
  // Filter out items with null creators before rendering
  const validVideos = videos.filter(
    (item): item is VideoWithCreator & { creator: Creator } =>
      item.creator !== null
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {validVideos.map((item) => (
        <VideoItem
          key={item.video.id}
          video={item.video}
          creator={item.creator}
        />
      ))}
    </div>
  );
};
