import prisma from "@/lib/prisma";
import type { ParsedTranscript } from "../types";
import { createProviderAssignment, getModelsUsed } from "../providers/factory";
import { createContentLens } from "../lenses/content-lens";
import { createStyleLens } from "../lenses/style-lens";
import { createStrategyLens } from "../lenses/strategy-lens";
import { runPhase1 } from "./phase1-context";
import { runPhase2 } from "./phase2-analysis";
import { runPhase3 } from "./phase3-synthesis";
import { runPhase4 } from "./phase4-calibration";
import { runPhase5 } from "./phase5-ballot";

/**
 * Runs the full AI judging pipeline for a session.
 * This is a long-running async function — call with void (fire-and-forget).
 */
export async function runPipeline(
  sessionId: string,
  transcript: ParsedTranscript,
): Promise<void> {
  const startTime = Date.now();

  try {
    // Set up providers
    const assignment = createProviderAssignment();
    const modelsUsed = getModelsUsed(assignment);

    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        modelsUsed: JSON.parse(JSON.stringify(modelsUsed)),
      },
    });

    // Create lenses
    const contentLens = createContentLens(assignment.contentLens);
    const styleLens = createStyleLens(assignment.styleLens);
    const strategyLens = createStrategyLens(assignment.strategyLens);
    const lenses = [contentLens, styleLens, strategyLens];

    // Initialize lens analysis records
    for (const lens of lenses) {
      const providerName =
        lens.lensType === "CONTENT"
          ? assignment.contentLens.name
          : lens.lensType === "STYLE"
            ? assignment.styleLens.name
            : assignment.strategyLens.name;

      // Map STYLE -> ENGAGEMENT for Prisma enum compatibility
      const dbLensType = lens.lensType === "STYLE" ? "ENGAGEMENT" : lens.lensType;
      await prisma.aILensAnalysis.upsert({
        where: {
          sessionId_lensType: { sessionId, lensType: dbLensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT" },
        },
        update: { modelUsed: providerName },
        create: {
          sessionId,
          lensType: dbLensType as "CONTENT" | "STRATEGY" | "ENGAGEMENT",
          modelUsed: providerName,
        },
      });
    }

    // ========== PHASE 1: Context Building ==========
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: { status: "CONTEXT_BUILDING", currentPhase: 1 },
    });

    const phase1 = await runPhase1(
      assignment.contextBuilder,
      transcript.motion,
      transcript.infoSlide,
    );

    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        debateContext: JSON.parse(JSON.stringify(phase1.context)),
        totalApiCalls: { increment: phase1.apiCalls },
        totalTokensUsed: { increment: phase1.tokensUsed },
      },
    });

    // ========== PHASE 2: Iterative Chronological Analysis ==========
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: { status: "ANALYZING", currentPhase: 2 },
    });

    const phase2 = await runPhase2(
      transcript.speeches,
      phase1.context,
      lenses,
      sessionId,
    );

    // Validate completeness: each lens must have analyzed at least half the speeches
    const minRequired = Math.ceil(transcript.speeches.length / 2);
    for (const lens of lenses) {
      const analyses = phase2.lensResults.get(lens.lensType) ?? [];
      if (analyses.length < minRequired) {
        throw new Error(
          `Lens ${lens.lensType} only analyzed ${analyses.length}/${transcript.speeches.length} speeches (minimum ${minRequired} required). ` +
          `This usually indicates all AI providers are rate-limited or unavailable.`,
        );
      }
      if (analyses.length < transcript.speeches.length) {
        console.warn(
          `[AI Judge] Lens ${lens.lensType} analyzed ${analyses.length}/${transcript.speeches.length} speeches — proceeding with partial data`,
        );
      }
    }

    // ========== PHASE 3: Per-Lens Synthesis ==========
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        status: "SYNTHESIZING",
        currentPhase: 3,
      },
    });

    const phase3 = await runPhase3(
      lenses,
      phase2.lensResults,
      phase1.context,
      sessionId,
    );

    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        totalApiCalls: { increment: phase3.apiCalls },
        totalTokensUsed: { increment: phase3.tokensUsed },
      },
    });

    if (phase3.verdicts.length === 0) {
      throw new Error("All lenses failed during synthesis — cannot proceed");
    }

    // ========== PHASE 4: Calibration ==========
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: { status: "CALIBRATING", currentPhase: 4 },
    });

    const phase4 = await runPhase4(assignment.calibrator, phase3.verdicts);

    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        calibration: JSON.parse(JSON.stringify(phase4.calibration)),
        totalApiCalls: { increment: phase4.apiCalls },
        totalTokensUsed: { increment: phase4.tokensUsed },
      },
    });

    // ========== PHASE 5: Ballot Writing ==========
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: { status: "WRITING_BALLOT", currentPhase: 5 },
    });

    const phase5 = await runPhase5(assignment.ballotWriter, phase4.calibration);

    const winner =
      phase5.ballot.winner === "PROP" ? "PROPOSITION" : "OPPOSITION";

    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETE",
        finalBallot: JSON.parse(JSON.stringify(phase5.ballot)),
        finalScores: JSON.parse(
          JSON.stringify({
            prop: phase5.ballot.propTotal,
            opp: phase5.ballot.oppTotal,
            speakers: phase5.ballot.speakerScores,
          }),
        ),
        winner,
        totalApiCalls: { increment: phase5.apiCalls },
        totalTokensUsed: { increment: phase5.tokensUsed },
        processingTimeMs: Date.now() - startTime,
        completedAt: new Date(),
      },
    });

    console.log(
      `[AI Judge] Pipeline completed for session ${sessionId} in ${Date.now() - startTime}ms`,
    );
  } catch (error) {
    console.error(`[AI Judge] Pipeline failed for session ${sessionId}:`, error);

    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
        processingTimeMs: Date.now() - startTime,
      },
    });
  }
}
