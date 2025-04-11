"use client";
import { Button } from "@/components/ui/button";
import MuxUploader, {
  MuxUploaderDrop,
  MuxUploaderFileSelect,
  MuxUploaderProgress,
  MuxUploaderStatus,
} from "@mux/mux-uploader-react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface StudioUploaderProps {
  endpoint?: string | null;
  onSuccess: () => void;
}

const UPLOADER_ID = "video-uploader";

export const StudioUploader = ({
  endpoint,
  onSuccess,
}: StudioUploaderProps) => {
  const [isUploaded, setIsUploaded] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Handler untuk upload berhasil
  const handleSuccess = () => {
    setIsUploaded(true);
    onSuccess();
    toast.success("Upload completed successfully!");
  };

  // Handler untuk reload window
  const handleReload = () => {
    setIsReloading(true);
    // Berikan waktu untuk toast success muncul sebelum reload
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div>
      <MuxUploader
        endpoint={endpoint}
        id={UPLOADER_ID}
        className="hidden group/uploader"
        onSuccess={handleSuccess}
      />
      <MuxUploaderDrop muxUploader={UPLOADER_ID} className="group/drop">
        <div slot="heading" className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-2 rounded-full bg-muted h-32 w-32">
            <UploadIcon className="size-10 text-muted-foreground group/drop:has([active]):animate-bounce transition-all duration-300" />
          </div>
          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm">Drag and drop video files to upload</p>
            <p className="text-sm text-muted-foreground">
              Your videos will be private until you publish them
            </p>
          </div>
          <MuxUploaderFileSelect muxUploader={UPLOADER_ID}>
            <Button type="button" className="rounded-full">
              Select Files
            </Button>
          </MuxUploaderFileSelect>
        </div>
        <span slot="separator" className="hidden" />
        <MuxUploaderStatus muxUploader={UPLOADER_ID} className="text-sm" />
        <MuxUploaderProgress
          muxUploader={UPLOADER_ID}
          className="text-sm"
          type="percentage"
        />
        <MuxUploaderProgress muxUploader={UPLOADER_ID} type="bar" />
      </MuxUploaderDrop>

      {isUploaded && (
        <div className="mt-6 flex flex-col items-center gap-4">
          <p className="text-green-600 font-medium">
            Upload completed successfully!
          </p>
          <p className="text-sm text-muted-foreground">
            It may take a moment for your video to process. Reload to see the
            latest status.
          </p>
          <Button
            onClick={handleReload}
            disabled={isReloading}
            className="mt-2"
          >
            {isReloading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Reloading...
              </>
            ) : (
              "Reload Now"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
