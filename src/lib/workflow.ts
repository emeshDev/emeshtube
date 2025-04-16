import { Client } from "@upstash/workflow";

// Membuat instance client Upstash Workflow
export const workflow = new Client({
  token: process.env.QSTASH_TOKEN || "",
  // Jika diperlukan, tambahkan opsi tambahan di sini
});

/**
 * Trigger workflow untuk generate title berdasarkan subtitle
 * @param videoId ID video
 * @param userId ID user pemilik video
 * @returns Object with success status and workflow run ID or error
 */
export const triggerTitleGeneration = async (
  videoId: string,
  userId: string
) => {
  try {
    // Trigger workflow dengan body berisi videoId dan userId
    const { workflowRunId } = await workflow.trigger({
      url: `${process.env.UPSTASH_WORKFLOW_URL}/api/videos/workflows/title`,
      body: { videoId, userId },
    });

    console.log(
      `Title generation workflow triggered with ID: ${workflowRunId}`
    );
    return { success: true, workflowRunId };
  } catch (error) {
    console.error("Failed to trigger title generation workflow:", error);
    return { success: false, error: (error as Error).message };
  }
};
