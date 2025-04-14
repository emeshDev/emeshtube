"use client";

import { useDropzone } from "react-dropzone";
import { useCallback, useState } from "react";
import { generateClientDropzoneAccept } from "uploadthing/client";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

interface ThumbnailUploaderProps {
  videoId: string;
  onUploadComplete: (url: string) => void;
}

export const ThumbnailUploader = ({
  videoId,
  onUploadComplete,
}: ThumbnailUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("thumbnailUploader", {
    onClientUploadComplete: (res) => {
      setIsUploading(false);
      if (res && res.length > 0) {
        // Use the URL returned by the server
        const fileUrl = res[0].url;
        console.log("Thumbnail uploaded, URL:", fileUrl);
        onUploadComplete(fileUrl);
        toast.success("Thumbnail uploaded successfully");
      }
    },
    onUploadError: (error) => {
      setIsUploading(false);
      console.error("Upload error:", error);
      toast.error(`Error uploading thumbnail: ${error.message}`);
    },
    onUploadBegin: () => {
      setIsUploading(true);
    },
    headers: {
      "x-video-id": videoId,
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        try {
          console.log("Starting upload with files:", acceptedFiles.length);
          startUpload(acceptedFiles);
        } catch (error) {
          console.error("Error starting upload:", error);
          toast.error("Failed to start upload");
          setIsUploading(false);
        }
      }
    },
    [startUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: generateClientDropzoneAccept([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024, // 4MB
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          cursor-pointer 
          border-2 border-dashed border-border 
          rounded-lg 
          aspect-video
          flex flex-col items-center justify-center
          transition-colors
          ${isDragActive ? "bg-primary/5" : "bg-muted/50 hover:bg-muted"}
          ${isUploading ? "pointer-events-none" : ""}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Uploading thumbnail...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {isDragActive ? "Drop the image here" : "Upload custom thumbnail"}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to browse
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              Select Image
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Recommended: Use a 16:9 aspect ratio image (JPG, PNG, WebP) up to 4MB
      </p>
    </div>
  );
};
