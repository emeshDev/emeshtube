CREATE TYPE "public"."video_visibility" AS ENUM('private', 'public');--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "visibility" "video_visibility" DEFAULT 'private' NOT NULL;