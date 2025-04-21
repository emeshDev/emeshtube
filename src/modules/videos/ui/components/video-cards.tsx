"use client";

import { VideoThumbnail } from "@/modules/videos/ui/components/video-thumbnail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

interface Creator {
  id: string;
  name: string | null;
  imageUrl: string | null;
}

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  duration: number | null;
  viewCount: number | null;
  createdAt: Date;
}

interface VideoCardProps {
  video: Video;
  creator: Creator;
  isCompact?: boolean;
}

export const VideoCard = ({
  video,
  creator,
  isCompact = false,
}: VideoCardProps) => {
  if (isCompact) {
    // Compact layout for sidebar/related videos
    return (
      <Link href={`/video/${video.id}`} className="flex gap-2 group">
        <div className="w-40 flex-shrink-0">
          <VideoThumbnail
            thumbnailUrl={video.thumbnailUrl}
            previewUrl={video.previewUrl}
            title={video.title}
            duration={video.duration}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{creator.name}</p>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>{formatNumber(video.viewCount || 0)} views</span>
            <span className="mx-1">•</span>
            <span>{formatRelativeTime(video.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  // Regular layout for grid/list views
  return (
    <Link href={`/watch/${video.id}`} className="block group">
      <VideoThumbnail
        thumbnailUrl={video.thumbnailUrl}
        previewUrl={video.previewUrl}
        title={video.title}
        duration={video.duration}
      />
      <div className="mt-2 flex gap-2">
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarImage src={creator.imageUrl || undefined} />
          <AvatarFallback>{creator.name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{creator.name}</p>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>{formatNumber(video.viewCount || 0)} views</span>
            <span className="mx-1">•</span>
            <span>{formatRelativeTime(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
