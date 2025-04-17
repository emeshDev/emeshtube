/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/videos/workflows/description/route.ts
import { serve } from "@upstash/workflow/nextjs";
import { Receiver } from "@upstash/qstash";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { openai } from "@/lib/openai";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

interface DescriptionGeneralRequest {
  videoId: string;
  userId: string;
}

export const { POST } = serve<DescriptionGeneralRequest>(
  async (context) => {
    await context.run("start-workflow", () => {
      console.log("[Workflow] Description generation workflow started");
      const requestData = context.requestPayload;
      console.log("[Workflow] Request data:", requestData);
      return { status: "started" };
    });
    const videoData = await context.run("fetch-video-data", async () => {
      const { videoId, userId } = context.requestPayload;
      if (!videoId) {
        throw new Error("Video ID is required");
      }

      const video = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          userId: videos.userId,
          subtitleContent: videos.subtitleContent,
          duration: videos.duration,
          muxPlaybackId: videos.muxPlaybackId,
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

    // Generate description with OpenAI
    const generatedDescription = await context.run(
      "generate-description",
      async () => {
        const subtitleContent = videoData.subtitleContent || "";
        const videoTitle = videoData.title || "Untitled Video";
        const videoDuration = videoData.duration || 0;

        // Format duration for context
        const minutes = Math.floor(videoDuration / 60);
        const seconds = videoDuration % 60;
        const formattedDuration = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that specializes in creating engaging, SEO-friendly YouTube video descriptions. Your descriptions are informative, include relevant keywords, and encourage viewer engagement.",
            },
            {
              role: "user",
              content: `Generate a comprehensive, SEO-friendly description for a YouTube video based on its transcript/subtitle.
          
          Video Title: ${videoTitle}
          Video Duration: ${formattedDuration}
          
          Video transcript:
          ${subtitleContent.substring(0, 3000)}
          
          The description should:
          1. Start with a compelling hook that summarizes what the video is about
          2. Include 3-5 paragraphs that elaborate on key points from the video
          3. Include relevant keywords naturally throughout the text
          4. End with a call-to-action encouraging viewers to like, subscribe, and comment
          5. Be between 200-500 words total
          
          Format the description with appropriate paragraph breaks for readability.`,
            },
          ],
          max_tokens: 750,
          temperature: 0.7,
        });

        const description = completion.choices[0]?.message?.content?.trim();
        console.log(
          `[Workflow] Generated description (${description?.length || 0} chars)`
        );

        if (!description) {
          throw new Error("Failed to generate description");
        }

        return description;
      }
    );
    await context.run("update-video-description", async () => {
      const [updatedVideo] = await db
        .update(videos)
        .set({
          description: generatedDescription,
          updatedAt: new Date(),
        })
        .where(eq(videos.id, videoData.id))
        .returning({
          id: videos.id,
          description: videos.description,
        });

      console.log(
        `[Workflow] Updated video description for video ID: ${updatedVideo.id}`
      );
      console.log(
        `[Workflow] New description length: ${
          updatedVideo.description?.length || 0
        } chars`
      );

      return {
        updated: true,
        videoId: updatedVideo.id,
      };
    });
    return {
      status: "success",
      videoId: videoData.id,
      descriptionLength: generatedDescription.length,
    };
  },
  {
    failureFunction: (failureData) => {
      console.error(
        "[Workflow] Description generation workflow failed:",
        failureData.failResponse
      );
      // Tidak perlu mengembalikan nilai
    },
  }
);
