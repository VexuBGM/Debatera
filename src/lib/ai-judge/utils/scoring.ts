import { WSDC } from "../constants";

/**
 * Clamps a score to the valid WSDC range based on speech type.
 */
export function clampScore(score: number, isReply: boolean): number {
  const range = isReply ? WSDC.REPLY_SCORE_RANGE : WSDC.SCORE_RANGE;
  return Math.max(range.min, Math.min(range.max, Math.round(score)));
}

/**
 * Computes the weighted total score from dimension scores.
 */
export function computeWeightedTotal(scores: {
  content: number;
  style: number;
  strategy: number;
}): number {
  return (
    scores.content * WSDC.DIMENSION_WEIGHTS.content +
    scores.style * WSDC.DIMENSION_WEIGHTS.style +
    scores.strategy * WSDC.DIMENSION_WEIGHTS.strategy
  );
}

/**
 * Computes total team score from individual speaker scores.
 */
export function computeTeamTotal(
  speakerScores: Record<string, { total: number }>,
  side: "PROP" | "OPP",
): number {
  const sidePrefix = side === "PROP" ? "PROP" : "OPP";
  let total = 0;
  for (const [role, scores] of Object.entries(speakerScores)) {
    if (role.startsWith(sidePrefix)) {
      total += scores.total;
    }
  }
  return total;
}
