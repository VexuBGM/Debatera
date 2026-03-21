export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Get session status and results
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.aIJudgingSession.findUnique({
      where: { id: sessionId },
      include: {
        lensAnalyses: {
          select: {
            lensType: true,
            modelUsed: true,
            verdict: true,
            confidence: true,
            speechAnalyses: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: session.id,
      motion: session.motion,
      infoSlide: session.infoSlide,
      status: session.status,
      currentPhase: session.currentPhase,
      currentSpeech: session.currentSpeech,
      errorMessage: session.errorMessage,
      debateContext: session.debateContext,
      calibration: session.calibration,
      finalBallot: session.finalBallot,
      finalScores: session.finalScores,
      winner: session.winner,
      modelsUsed: session.modelsUsed,
      totalApiCalls: session.totalApiCalls,
      totalTokensUsed: session.totalTokensUsed,
      processingTimeMs: session.processingTimeMs,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      lensAnalyses: session.lensAnalyses,
    });
  } catch (error) {
    console.error("[ai-judge/sessions/[id]] GET error:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 },
    );
  }
}
