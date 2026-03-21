export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runPipeline } from "@/lib/ai-judge/pipeline";
import { parseTranscript } from "@/lib/ai-judge/transcript/parser";

// POST: Start the AI judging pipeline for a session
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const session = await prisma.aIJudgingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    if (session.status !== "PENDING" && session.status !== "FAILED") {
      return NextResponse.json(
        {
          error: `Session is already ${session.status.toLowerCase()}. Only PENDING or FAILED sessions can be started.`,
        },
        { status: 400 },
      );
    }

    // Parse the transcript
    const transcript = parseTranscript(session.transcriptText);

    if (transcript.speeches.length === 0) {
      return NextResponse.json(
        { error: "No speeches found in the transcript. Check the format." },
        { status: 400 },
      );
    }

    // Use the motion from the transcript if it was parsed, otherwise keep session motion
    if (transcript.motion && !session.motion) {
      await prisma.aIJudgingSession.update({
        where: { id: sessionId },
        data: { motion: transcript.motion },
      });
    }

    // Override transcript motion with session motion (user-provided takes priority)
    if (session.motion) {
      transcript.motion = session.motion;
    }

    // Reset session state for retry
    await prisma.aIJudgingSession.update({
      where: { id: sessionId },
      data: {
        status: "PENDING",
        currentPhase: 0,
        currentSpeech: 0,
        errorMessage: null,
        totalApiCalls: 0,
        totalTokensUsed: 0,
        processingTimeMs: null,
        completedAt: null,
      },
    });

    // Fire-and-forget: start the pipeline in the background
    void runPipeline(sessionId, transcript);

    return NextResponse.json({
      message: "Pipeline started",
      sessionId,
      speechCount: transcript.speeches.length,
    });
  } catch (error) {
    console.error("[ai-judge/sessions/[id]/start] POST error:", error);
    return NextResponse.json(
      { error: "Failed to start pipeline" },
      { status: 500 },
    );
  }
}
