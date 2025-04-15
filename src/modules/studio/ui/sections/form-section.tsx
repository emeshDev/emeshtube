/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/trpc/client";
import {
  CheckIcon,
  CopyIcon,
  ImageIcon,
  Loader2Icon,
  MoreVerticalIcon,
  TrashIcon,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDuration } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateVideoSchema } from "@/lib/schema/video";
import Image from "next/image";
import { ThumbnailUploader } from "../components/ThumbnailUploader";

interface PageProps {
  videoId: string;
}

type FormValues = z.infer<typeof updateVideoSchema>;

export const FormView = ({ videoId }: PageProps) => {
  return (
    <Suspense fallback={<FormViewSkeleton />}>
      <ErrorBoundary fallback={<p>Error...</p>}>
        <FormViewSuspense videoId={videoId} />
      </ErrorBoundary>
    </Suspense>
  );
};

const FormViewSkeleton = () => {
  return (
    <div>
      <p>Loading...</p>
    </div>
  );
};

const FormViewSuspense = ({ videoId }: PageProps) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [video] = trpc.studio.getOne.useSuspenseQuery({ id: videoId });
  const [categories] = trpc.categories.getMany.useSuspenseQuery();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    video.thumbnailUrl
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // for deleting thumbnail
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentFileKey, setCurrentFileKey] = useState<string | undefined>(
    undefined
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(updateVideoSchema),
    defaultValues: {
      id: videoId,
      title: video.title,
      description: video.description || "",
      categoryId: video.categoryId || null,
      visibility: video.visibility as "private" | "public",
    },
  });

  const updateVideo = trpc.videos.update.useMutation({
    onSuccess: () => {
      toast.success("Video updated successfully");
      utils.studio.getOne.invalidate({ id: videoId });
      utils.studio.infiniteVideos.invalidate();
    },
    onError: (error) => {
      toast.error(`Error updating video`);
      console.error(error);
    },
  });

  const updateThumbnail = trpc.videos.updateThumbnail.useMutation({
    onSuccess: () => {
      setIsUpdating(false);
      toast.success("Thumbnail updated successfully");
      utils.studio.getOne.invalidate({ id: videoId });
      utils.studio.infiniteVideos.invalidate();
    },
    onError: (error) => {
      setIsUpdating(false);
      toast.error(`Error updating thumbnail`);
      console.error(error);
    },
  });

  const deleteThumbnail = trpc.videos.deleteThumbnail.useMutation({
    onSuccess: () => {
      setIsDeleting(false);
      setThumbnailUrl(null);
      setCurrentFileKey(undefined);
      toast.success("Thumbnail deleted successfully");
      utils.studio.getOne.invalidate({ id: videoId });
      utils.studio.infiniteVideos.invalidate();
    },
    onError: (err) => {
      setIsDeleting(false);
      toast.error("Error deleting thumbnail");
      console.error(err);
    },
  });

  const deleteVideo = trpc.videos.delete.useMutation({
    onSuccess: () => {
      toast.success("Video deleted successfully");
      utils.studio.infiniteVideos.invalidate();
      localStorage.setItem("videoDeleted", "true");
      // window.location.href = "/studio";
      // router.push("/studio");
      // Force a completely new request to the server with a timestamp parameter
      const timestamp = Date.now();
      window.location.replace(`/studio?t=${timestamp}`);
    },
    onError: (err) => {
      toast.error("Error deleting video");
      console.error(err);
    },
  });

  const onSubmit = (val: FormValues) => {
    updateVideo.mutate({ ...val, id: videoId });
  };

  const confirmDelete = () => {
    deleteVideo.mutate({ id: videoId });
  };

  const handleThumbnailUpload = (url: string, fileKey: string) => {
    if (url === thumbnailUrl) return;

    setThumbnailUrl(url);
    setCurrentFileKey(fileKey);
    setIsUpdating(true);

    updateThumbnail.mutate({
      id: videoId,
      thumbnailUrl: url || null,
    });
  };

  const handleDeleteThumbnail = () => {
    if (!thumbnailUrl) return;
    setIsDeleting(true);

    deleteThumbnail.mutate({
      id: videoId,
      fileKey: currentFileKey,
    });
  };

  const handleResetThumbnail = () => {
    setIsUpdating(true);

    // Reset to auto-generated thumbnail from Mux
    if (video.muxPlaybackId) {
      const autoThumbnail = `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg`;
      setThumbnailUrl(autoThumbnail);
      updateThumbnail.mutate({
        id: videoId,
        thumbnailUrl: autoThumbnail,
      });
    }
  };

  const videoUrl = video.muxPlaybackId
    ? `https://emeshtube.emeshdev.com/watch/${videoId}`
    : null;

  const handleCopyUrl = () => {
    if (videoUrl) {
      navigator.clipboard.writeText(videoUrl);
      setIsCopied(true);
      toast.success("Video URL copied to clipboard");

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  // Ekstrak fileKey dari URL jika belum ada
  const getFileKeyFromUrl = (url: string | null): string | undefined => {
    if (!url || !url.includes("utfs.io")) return undefined;

    try {
      // URL format: https://utfs.io/f/[fileKey]
      const urlParts = url.split("/");
      return urlParts[urlParts.length - 1];
    } catch (error) {
      console.error("Error extracting file key from URL:", error);
      return undefined;
    }
  };

  // Jika tidak punya currentFileKey tapi punya thumbnailUrl, coba ekstrak
  useEffect(() => {
    if (!currentFileKey && thumbnailUrl && thumbnailUrl.includes("utfs.io")) {
      setCurrentFileKey(getFileKeyFromUrl(thumbnailUrl));
    }
  }, [thumbnailUrl, currentFileKey]);

  const handleSaveButtonClick = () => {
    // Manual trigger form submission
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Video Details</h1>
          <p className="text-xs text-muted-foreground">
            Manage your video details
          </p>
        </div>
        <div className="flex items-center gap-x-2">
          <Button
            type="button"
            disabled={updateVideo.isPending || !form.formState.isDirty}
            onClick={handleSaveButtonClick}
          >
            Save
            {updateVideo.isPending ? (
              <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckIcon className="ml-2 h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"ghost"} size={"icon"}>
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="left">
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
                <TrashIcon className="size-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs
          defaultValue="basic"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full border-b rounded-none px-6 justify-start h-14">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              value="thumbnail"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              Thumbnail
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="basic" className="mt-0 border-0 p-0">
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={5}
                            placeholder="Describe your video..."
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Add details about your videos to help viewers find it
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose a category that best describes your video.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Control who can see your video.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="thumbnail" className="mt-0 border-0 p-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Video Thumbnail</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a custom thumbnail for your video or use the
                    auto-generated one
                  </p>

                  {/* Thumbnail Actions Toolbar */}
                  {((thumbnailUrl && thumbnailUrl.includes("utfs.io")) ||
                    video.muxPlaybackId) && (
                    <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-sm font-medium mr-2">
                        Thumbnail Actions:
                      </span>

                      <div className="flex flex-wrap gap-2">
                        {/* Tombol reset ke auto-generated thumbnail */}
                        {video.muxPlaybackId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetThumbnail}
                            disabled={
                              isUpdating ||
                              updateThumbnail.isPending ||
                              isDeleting
                            }
                            className="whitespace-nowrap"
                          >
                            Reset to Auto-generated
                          </Button>
                        )}

                        {/* Tombol hapus thumbnail kustom */}
                        {thumbnailUrl && thumbnailUrl.includes("utfs.io") && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteThumbnail}
                            disabled={isDeleting || isUpdating}
                            className="whitespace-nowrap"
                          >
                            {isDeleting ? (
                              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <TrashIcon className="mr-2 h-4 w-4" />
                            )}
                            Delete Custom Thumbnail
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current thumbnail display */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Current Thumbnail
                      </h4>
                      <div className="aspect-video relative rounded-lg overflow-hidden border border-border">
                        {isUpdating || isDeleting ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : null}

                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt="Current thumbnail"
                            fill
                            className="object-cover"
                            onError={(e) => {
                              console.error(
                                "Error loading image:",
                                thumbnailUrl
                              );
                              e.currentTarget.src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-slate-100">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload custom thumbnail */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Upload Custom Thumbnail
                      </h4>
                      <ThumbnailUploader
                        videoId={videoId}
                        onUploadComplete={handleThumbnailUpload}
                        isDeleting={isDeleting}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 border-0 p-0">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">Video URL</h3>
                  <div className="flex flex-col gap-2">
                    {videoUrl ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            value={videoUrl}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={handleCopyUrl}
                            variant="outline"
                          >
                            {isCopied ? (
                              <CheckIcon className="size-4" />
                            ) : (
                              <CopyIcon className="size-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Share this URL with others to let them watch your
                          video
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Video URL will be available once processing is complete
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Video Status</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Current processing status of your video
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Status:</span>
                    <span className="capitalize">
                      {video.muxStatus || "Processing"}
                    </span>
                  </div>
                  {video.duration ? (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <span className="font-medium">Duration:</span>
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  ) : null}
                  {video.muxPlaybackId ? (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <span className="font-medium">Playback ID:</span>
                      <span className="font-mono text-xs">
                        {video.muxPlaybackId}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-lg font-medium">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Permanent actions that cannot be undone
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <TrashIcon className="size-4 mr-2" />
                    Delete Video
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this video?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              video &quot;{video.title}&quot; and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteVideo.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteVideo.isPending ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrashIcon className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
