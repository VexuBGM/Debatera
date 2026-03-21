import type { DebateContext, SpeechAnalysis, LensVerdict } from "../types";
import type { LensRunner } from "../lenses/types";
import prisma from "@/lib/prisma";

interface Phase3Result {
  verdicts: LensVerdict[];
  tokensUsed: number;
  apiCalls: number;
}

/**
 * Phase 3: Per-lens synthesis
 * All 3 lenses produce their final verdicts in parallel.
 */
export async function runPhase3(
  lenses: LensRunner[],
  lensAnalyses: Map<string, SpeechAnalysis[]>,
  debateContext: DebateContext,
  sessionId: string,
): Promise<Phase3Result> {
  const verdictPromises = lenses.map(async (lens) => {
    const analyses = lensAnalyses.get(lens.lensType) ?? [];
    try {
      const { verdict, tokensUsed } = await lens.synthesize(analyses, debateContext);
      return { verdict, tokensUsed, error: null, lensType: lens.lensType };
    } catch (error) {
      console.error(`[AI Judge] Synthesis failed for lens ${lens.lensType}:`, error);
      return { verdict: null, tokensUsed: 0, error, lensType: lens.lensType };
    }
  });

  const results = await Promise.all(verdictPromises);

  const verdicts: LensVerdict[] = [];
  let totalTokens = 0;
  let apiCalls = 0;

  for (const result of results) {
    if (result.verdict) {
      verdicts.push(result.verdict);
      totalTokens += result.tokensUsed;
      apiCalls++;

      // Persist verdict to DB (map STYLE -> ENGAGEMENT for Prisma enum)
      const dbLensType = result.lensType === "STYLE" ? "ENGAGEMENT" : result.lensType;
      await prisma.aILensAnalysis.update({
        where: {
          sessionId_lensType: {
            sessionId,
            lensType: dbLensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT",
          },
        },
        data: {
          verdict: JSON.parse(JSON.stringify(result.verdict)),
          confidence: result.verdict.confidence,
        },
      });
    }
  }

  return { verdicts, tokensUsed: totalTokens, apiCalls };
}
