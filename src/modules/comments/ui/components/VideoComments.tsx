"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InfiniteScroll } from "@/modules/videos/ui/components/infinite-scroll";
import { toast } from "sonner";

interface VideoCommentsProps {
  videoId: string;
}

export const VideoComments = ({ videoId }: VideoCommentsProps) => {
  const [commentInput, setCommentInput] = useState("");
  const { isSignedIn, user } = useUser();
  const utils = trpc.useUtils();

  // Fetch comments with infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = trpc.comments.getByVideoId.useInfiniteQuery(
    {
      videoId,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

  // Add comment mutation
  const addCommentMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      // Clear input and refetch comments
      setCommentInput("");
      utils.comments.getByVideoId.invalidate({ videoId });
      toast.success("Comment added successfully");
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.getByVideoId.invalidate({ videoId });
      toast.success("Comment deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });

  // Handle comment submission
  const handleSubmitComment = () => {
    if (!commentInput.trim() || !isSignedIn) return;

    addCommentMutation.mutate({
      videoId,
      content: commentInput.trim(),
    });
  };

  // Handle comment deletion
  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate({ id: commentId });
  };

  // Flatten comments from all pages
  const comments = data?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">
        {data?.pages[0]?.totalCount !== undefined
          ? `${data.pages[0].totalCount} Comments`
          : "Comments"}
      </h3>

      {/* Comment input for logged in users */}
      {isSignedIn ? (
        <div className="flex space-x-4">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback>{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="min-h-24 resize-none"
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCommentInput("")}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!commentInput.trim() || addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Comment"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            Sign in to add comments on this video.
          </AlertDescription>
        </Alert>
      )}

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load comments. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Comments list */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, index) => (
            <CommentSkeleton key={index} />
          ))
        ) : comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          // Comments list
          comments.map((item) => (
            <div key={item.comment.id} className="flex space-x-4 group">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={item.user?.imageUrl || undefined} />
                <AvatarFallback>
                  {item.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {item.user?.name || "Anonymous"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(item.comment.createdAt)}
                  </span>

                  {/* Delete button - always visible but only for user's own comments */}
                  {isSignedIn && user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-2 text-muted-foreground hover:text-destructive rounded-full p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this comment? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteComment(item.comment.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            {deleteCommentMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Delete"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-line">
                  {item.comment.content}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Infinite scroll component */}
        <InfiniteScroll
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          isManual={false}
        />
      </div>
    </div>
  );
};

// Comment skeleton for loading state
const CommentSkeleton = () => (
  <div className="flex space-x-4">
    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="flex space-x-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-1">
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      </div>
    </div>
  </div>
);
