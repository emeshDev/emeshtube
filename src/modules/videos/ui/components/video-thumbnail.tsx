import Image from "next/image";

type VideoThumbnailProps = {
  thumbnailUrl?: string | null;
};

export const VideoThumbnail = ({ thumbnailUrl }: VideoThumbnailProps) => {
  const imageUrl = thumbnailUrl ? thumbnailUrl : "/placeholder.svg";
  return (
    <div className="relative">
      {/* Thumbnail wrapper */}
      <div>
        <div className="relative w-full overflow-hidden rounded-xl aspect-video">
          <Image
            src={imageUrl}
            alt="thumbnail"
            fill
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      {/* Video Duration Box */}
    </div>
  );
};
