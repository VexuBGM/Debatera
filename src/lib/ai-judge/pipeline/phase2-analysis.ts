import type { Speech, DebateContext, SpeechAnalysis } from "../types";
import type { LensRunner } from "../lenses/types";
import prisma from "@/lib/prisma";

interface Phase2Result {
  lensResults: Map<string, SpeechAnalysis[]>;
  tokensUsed: number;
  apiCalls: number;
}

/**
 * Phase 2: Iterative chronological analysis
 * For each speech (sequentially), run all 3 lenses in parallel.
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

  // Process speeches sequentially
  for (const speech of speeches) {
    // Run all lenses in parallel for this speech
    const lensPromises = lenses.map(async (lens) => {
      const previous = lensAnalyses.get(lens.lensType) ?? [];
      try {
        const { analysis, tokensUsed } = await lens.analyzeSpeech(
          speech,
          debateContext,
          previous,
        );
        return { lensType: lens.lensType, analysis, tokensUsed, error: null };
      } catch (error) {
        console.error(
          `[AI Judge] Lens ${lens.lensType} failed on speech ${speech.index}:`,
          error,
        );
        return {
          lensType: lens.lensType,
          analysis: null,
          tokensUsed: 0,
          error,
        };
      }
    });

    const results = await Promise.all(lensPromises);

    for (const result of results) {
      if (result.analysis) {
        const analyses = lensAnalyses.get(result.lensType)!;
        analyses.push(result.analysis);
        totalTokens += result.tokensUsed;
        totalCalls++;

        // Persist lens analysis progress to DB
        await prisma.aILensAnalysis.upsert({
          where: {
            sessionId_lensType: {
              sessionId,
              lensType: result.lensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT",
            },
          },
          update: {
            speechAnalyses: JSON.parse(JSON.stringify(analyses)),
            currentMemory: JSON.parse(
              JSON.stringify({ summary: result.analysis.memory }),
            ),
          },
          create: {
            sessionId,
            lensType: result.lensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT",
            modelUsed: "unknown",
            speechAnalyses: JSON.parse(JSON.stringify(analyses)),
            currentMemory: JSON.parse(
              JSON.stringify({ summary: result.analysis.memory }),
            ),
          },
        });
      }
    }

    // Update session progress
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        currentSpeech: speech.index + 1,
        totalApiCalls: { increment: results.filter((r) => r.analysis).length },
        totalTokensUsed: { increment: results.reduce((s, r) => s + r.tokensUsed, 0) },
      },
    });

    onSpeechComplete?.(speech.index);
  }

  return {
    lensResults: lensAnalyses,
    tokensUsed: totalTokens,
    apiCalls: totalCalls,
  };
}
