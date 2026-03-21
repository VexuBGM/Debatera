import type { Speech, DebateContext, SpeechAnalysis } from "../types";
import type { LensRunner } from "../lenses/types";
import prisma from "@/lib/prisma";

interface Phase2Result {
  lensResults: Map<string, SpeechAnalysis[]>;
  tokensUsed: number;
  apiCalls: number;
}

/**
 * Delay between processing speeches to avoid rate limits on free-tier models.
 */
const INTER_SPEECH_DELAY_MS = 1000;

/**
 * Max retries for a single lens on a single speech.
 */
const LENS_SPEECH_RETRIES = 2;

/**
 * Delay between retries for a single lens/speech.
 */
const LENS_RETRY_DELAY_MS = 2000;

/**
 * Phase 2: Iterative chronological analysis
 * For each speech (sequentially), run all 3 lenses.
 * Includes per-lens retry and inter-speech delays to handle rate limits.
 */
export async function runPhase2(
  speeches: Speech[],
  debateContext: DebateContext,
  lenses: LensRunner[],
  sessionId: string,
  onSpeechComplete?: (speechIndex: number) => void,
): Promise<Phase2Result> {
  // Track per-lens analyses
  const lensAnalyses = new Map<string, SpeechAnalysis[]>();
  for (const lens of lenses) {
    lensAnalyses.set(lens.lensType, []);
  }

  let totalTokens = 0;
  let totalCalls = 0;

  // Process speeches sequentially with delays
  for (let si = 0; si < speeches.length; si++) {
    const speech = speeches[si]!;

    // Add delay between speeches (not before the first one)
    if (si > 0) {
      await new Promise((resolve) => setTimeout(resolve, INTER_SPEECH_DELAY_MS));
    }

    // Run all lenses in parallel — each lens uses a different provider offset
    const lensPromises = lenses.map(async (lens) => {
      const previous = lensAnalyses.get(lens.lensType) ?? [];

      for (let attempt = 0; attempt <= LENS_SPEECH_RETRIES; attempt++) {
        try {
          const { analysis, tokensUsed } = await lens.analyzeSpeech(
            speech,
            debateContext,
            previous,
          );

          const analyses = lensAnalyses.get(lens.lensType)!;
          analyses.push(analysis);
          totalTokens += tokensUsed;
          totalCalls++;

          // Persist lens analysis progress to DB
          // Map STYLE -> ENGAGEMENT for DB compatibility (Prisma enum)
          const dbLensType = lens.lensType === "STYLE" ? "ENGAGEMENT" : lens.lensType;
          await prisma.aILensAnalysis.upsert({
            where: {
              sessionId_lensType: {
                sessionId,
                lensType: dbLensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT",
              },
            },
            update: {
              speechAnalyses: JSON.parse(JSON.stringify(analyses)),
              currentMemory: JSON.parse(
                JSON.stringify({ summary: analysis.memory }),
              ),
            },
            create: {
              sessionId,
              lensType: dbLensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT",
              modelUsed: "unknown",
              speechAnalyses: JSON.parse(JSON.stringify(analyses)),
              currentMemory: JSON.parse(
                JSON.stringify({ summary: analysis.memory }),
              ),
            },
          });

          return true;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.warn(
            `[AI Judge] Lens ${lens.lensType} attempt ${attempt + 1}/${LENS_SPEECH_RETRIES + 1} failed on speech ${speech.index}: ${msg.slice(0, 200)}`,
          );

          if (attempt < LENS_SPEECH_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, LENS_RETRY_DELAY_MS));
          }
        }
      }

      console.error(
        `[AI Judge] Lens ${lens.lensType} PERMANENTLY failed on speech ${speech.index} after ${LENS_SPEECH_RETRIES + 1} attempts`,
      );
      return false;
    });

    await Promise.allSettled(lensPromises);

    // Update session progress
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        currentSpeech: speech.index + 1,
        totalApiCalls: { increment: totalCalls },
        totalTokensUsed: { increment: totalTokens },
      },
    });

    // Reset counters after DB write so we don't double-count
    totalCalls = 0;
    totalTokens = 0;

    onSpeechComplete?.(speech.index);
  }

  return {
    lensResults: lensAnalyses,
    tokensUsed: totalTokens,
    apiCalls: totalCalls,
  };
}
