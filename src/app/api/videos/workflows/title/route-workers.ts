// src/app/api/videos/workflows/title/route-workers.ts
// implementasi untuk di cloudflare workers
import { WorkflowContext } from "@upstash/workflow";
import { createWorkflow } from "@upstash/workflow/cloudflare";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { openai } from "@/lib/openai";

// Interface untuk tipe data request yang masuk
interface TitleGenerationRequest {
  videoId: string;
  userId: string;
}

// Title Generation Workflow untuk Cloudflare Workers
export const titleWorkflow = createWorkflow(
  async (context: WorkflowContext<TitleGenerationRequest>) => {
    // Log workflow dimulai
    await context.run("start-workflow", () => {
      console.log("[Workflow] Title generation workflow started");

      // Log request data
      const requestData = context.requestPayload;
      console.log("[Workflow] Request data:", requestData);

      return { status: "started" };
    });

    // Fetch video data with subtitle content
    const videoData = await context.run("fetch-video-data", async () => {
      const { videoId, userId } = context.requestPayload;

      if (!videoId) {
        throw new Error("Video ID is required");
      }

      // Query untuk mendapatkan data video termasuk subtitle content
      const video = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          userId: videos.userId,
          subtitleContent: videos.subtitleContent,
        })
        .from(videos)
        .where(
          userId
            ? and(eq(videos.id, videoId), eq(videos.userId, userId))
            : eq(videos.id, videoId)
        )
        .limit(1);

      if (!video.length) {
        throw new Error(`Video with ID ${videoId} not found`);
      }

      return video[0];
    });

    // Check subtitle availability
    await context.run("check-subtitle", () => {
      if (
        !videoData.subtitleContent ||
        videoData.subtitleContent.trim() === ""
      ) {
        throw new Error("No subtitle content available for this video");
      }

      console.log(
        `[Workflow] Found subtitle content (${
          videoData.subtitleContent?.length || 0
        } chars)`
      );
      return { hasSubtitle: true };
    });

    // Generate title with OpenAI
    const generatedTitle = await context.run("generate-title", async () => {
      const subtitleContent = videoData.subtitleContent || "";

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that specializes in generating catchy, SEO-friendly YouTube video titles. Your titles are attention-grabbing, concise, and descriptive.",
          },
          {
            role: "user",
            content: `Generate a catchy, SEO-friendly title for a video based on its transcript/subtitle.
            
            Video transcript:
            ${subtitleContent.substring(0, 2000)}
            
            ${
              videoData.description
                ? `Additional description: ${videoData.description}`
                : ""
            }
            
            The title should be attention-grabbing, descriptive, include relevant keywords, and be under 100 characters.`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      const title = completion.choices[0]?.message?.content?.trim();
      console.log(`[Workflow] Generated title: "${title}"`);

      if (!title) {
        throw new Error("Failed to generate title");
      }

      return title;
    });

    // Update video with new title
    await context.run("update-video-title", async () => {
      const [updatedVideo] = await db
        .update(videos)
        .set({
          title: generatedTitle,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoData.id))
        .returning({
          id: videos.id,
          title: videos.title,
        });

      console.log(`[Workflow] Updated video title to: "${updatedVideo.title}"`);
      return {
        updated: true,
        videoId: updatedVideo.id,
        newTitle: updatedVideo.title,
      };
    });

    return {
      status: "success",
      videoId: videoData.id,
      generatedTitle,
    };
  },
  {
    // Opsi tambahan untuk workflow
    retries: 3, // Jumlah percobaan ulang jika terjadi kegagalan
  }
);

// Catatan: Implementasi ini adalah bagian dari serveMany
// Lihat file workflows.ts untuk implementasi serveMany lengkap
