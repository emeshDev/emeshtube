/**
 * Fungsi untuk mengambil subtitle dari Mux menggunakan URL publik
 * Format URL: https://stream.mux.com/{PLAYBACK_ID}/text/{TRACK_ID}.txt
 */
export async function getSubtitleText(
  playbackId: string | undefined,
  trackId: string | undefined
): Promise<string> {
  try {
    if (!playbackId || !trackId) {
      console.error(
        `[Mux] Missing playback ID (${playbackId}) or track ID (${trackId})`
      );
      return "";
    }

    const subtitleUrl = `https://stream.mux.com/${playbackId}/text/${trackId}.txt`;
    console.log(`[Mux] Fetching subtitle from URL: ${subtitleUrl}`);

    // Fetch subtitle content
    const response = await fetch(subtitleUrl);

    if (!response.ok) {
      console.error(
        `[Mux] Failed to fetch subtitle: ${response.status} ${response.statusText}`
      );
      return "";
    }

    const text = await response.text();

    if (!text || text.trim() === "") {
      console.log("[Mux] Empty subtitle content received");
      return "";
    }

    console.log(`[Mux] Successfully fetched subtitle (${text.length} chars)`);
    return text;
  } catch (error) {
    console.error("[Mux] Error getting subtitle text:", error);
    return "";
  }
}

/**
 * Proses teks subtitle untuk menghapus timestamp dan markup
 */
export function processSubtitleText(rawText: string): string {
  if (!rawText) return "";

  try {
    // Split by lines
    const lines = rawText.split("\n");

    // Filter out timestamp lines, numbers, and WEBVTT header
    const contentLines = lines.filter(
      (line) =>
        line.trim() !== "" &&
        !line.includes("-->") &&
        !line.match(/^\d+$/) &&
        !line.match(/^WEBVTT/)
    );

    // Join filtered lines
    return contentLines.join(" ").trim();
  } catch (error) {
    console.error("[Mux] Error processing subtitle text:", error);
    return rawText; // Return original text if processing fails
  }
}
