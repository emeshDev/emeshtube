"use client";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { Clock } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type VideoThumbnailProps = {
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  title: string;
  duration?: number | null;
};

export const VideoThumbnail = ({
  thumbnailUrl,
  previewUrl,
  title,
  duration,
}: VideoThumbnailProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const imageUrl = thumbnailUrl ? thumbnailUrl : "/placeholder.svg";
  const animatedImageUrl = previewUrl ? previewUrl : imageUrl;
  const showPreview = isHovering && previewUrl;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail wrapper */}
      <div>
        <div className="relative w-full overflow-hidden rounded-xl aspect-video">
          {/* Tampilkan thumbnail statis ketika tidak hover */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              showPreview ? "opacity-0" : "opacity-100"
            }`}
          >
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="w-full h-full object-cover"
            />
          </div>

          {/* Tampilkan animated GIF ketika hover */}
          {previewUrl && (
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                showPreview ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image
                src={animatedImageUrl}
                alt={title}
                fill
                className="w-full h-full object-cover"
                unoptimized={true} // Kunci untuk memastikan GIF berjalan
                priority={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Badge Durasi */}
      {duration && (
        <Badge
          variant="secondary"
          className="absolute bottom-1 right-1 bg-black/70 text-white border-none py-0.5 px-1.5 flex items-center gap-1"
        >
          <Clock className="h-3 w-3" />
          <span className="text-xs font-normal">
            {formatDuration(duration)}
          </span>
        </Badge>
      )}
    </div>
  );
};
