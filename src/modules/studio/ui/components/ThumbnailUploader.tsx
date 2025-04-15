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
  onUploadComplete: (url: string, fileKey: string) => void;
  isDeleting?: boolean;
}

export const ThumbnailUploader = ({
  videoId,
  onUploadComplete,
  isDeleting = false,
}: ThumbnailUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("thumbnailUploader", {
    onClientUploadComplete: (res) => {
      setIsUploading(false);
      if (res && res.length > 0) {
        // Extract the file data from response
        const fileUrl = res[0].url;
        // The key is the unique identifier we need for deletion
        const fileKey = res[0].key;
        console.log("Thumbnail uploaded, URL:", fileUrl, "Key:", fileKey);
        onUploadComplete(fileUrl, fileKey);
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
    maxSize: 2 * 1024 * 1024, // 2MB
    disabled: isUploading || isDeleting,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          cursor-pointer 
          border-2 border-dashed border-slate-200
          rounded-lg 
          aspect-video
          flex flex-col items-center justify-center
          transition-colors
          ${isDragActive ? "bg-primary/5" : "bg-slate-50 hover:bg-slate-100"}
          ${isUploading || isDeleting ? "pointer-events-none opacity-70" : ""}
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
        ) : isDeleting ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Deleting thumbnail...
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
        Recommended: Use a 16:9 aspect ratio image (JPG, PNG, WebP) up to 2MB
      </p>
    </div>
  );
};
