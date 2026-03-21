import type { SpeechAnalysis } from "../types";

/**
 * Builds a compressed memory summary from previous speech analyses.
 * Used to provide context to lenses without sending raw analysis data.
 */
export function buildMemorySummary(
  analyses: SpeechAnalysis[],
): string {
  if (analyses.length === 0) {
    return "No previous speeches analyzed yet. This is the first speech.";
  }

  return analyses
    .map(
      (a) =>
        `Speech ${a.speechIndex + 1} (${a.role}, ${a.side}): ${a.memory}`,
    )
    .join("\n\n");
}
