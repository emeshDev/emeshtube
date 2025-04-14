/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { ResponsiveModal } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { StudioUploader } from "./StudioUploader";
import { useState } from "react";

export const StudioUploadButton = () => {
  const utils = trpc.useUtils();
  const [uploadCompleted, setUploadCompleted] = useState(false);

  // Mutation untuk membuat video
  const create = trpc.videos.create.useMutation({
    onSuccess: (data) => {
      toast.success("Video Created");
      utils.studio.infiniteVideos.invalidate(); // auto refresh
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Mutation untuk menghapus video
  const deleteVideo = trpc.studio.deleteVideo.useMutation({
    onSuccess: () => {
      toast.success("Upload cancelled");
      utils.studio.infiniteVideos.invalidate();
    },
    onError: (err) => {
      console.error("Failed to delete video:", err);
      // Tidak perlu menampilkan toast error disini karena user mungkin tidak perlu tahu
    },
  });

  // Handle saat modal ditutup
  const handleModalClose = () => {
    // Jika upload belum selesai dan kita memiliki ID video, hapus videonya
    if (!uploadCompleted && create.data?.video?.id) {
      deleteVideo.mutate({ id: create.data.video.id });
    }

    // Reset state
    create.reset();
    setUploadCompleted(false);
  };

  // Handle saat upload berhasil
  const handleUploadSuccess = () => {
    setUploadCompleted(true);
    utils.studio.infiniteVideos.invalidate();
  };

  return (
    <>
      <ResponsiveModal
        title="Upload a video"
        open={!!create.data?.url}
        onOpenChange={(open) => {
          if (!open) handleModalClose();
        }}
      >
        {create.data?.url ? (
          <StudioUploader
            endpoint={create.data.url}
            onSuccess={handleUploadSuccess}
            videoId={create.data.video.id}
          />
        ) : (
          <Loader2Icon className="animate-spin" />
        )}
      </ResponsiveModal>
      <Button
        variant={"secondary"}
        onClick={() => create.mutate()}
        disabled={create.isPending}
      >
        {create.isPending ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <PlusIcon />
        )}
        Create
      </Button>
    </>
  );
};
