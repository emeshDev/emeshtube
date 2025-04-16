ALTER TABLE "videos" ADD COLUMN "mux_subtitle_track_id" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_subtitle_status" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "subtitle_content" text;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_mux_subtitle_track_id_unique" UNIQUE("mux_subtitle_track_id");