export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSessionSchema } from "@/lib/ai-judge/schemas";

// POST: Create a new AI judging session
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { motion, transcriptText, infoSlide, debateId } = parsed.data;

    const session = await prisma.aIJudgingSession.create({
      data: {
        motion,
        transcriptText,
        infoSlide: infoSlide ?? null,
        debateId: debateId ?? null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: session.id, status: session.status });
  } catch (error) {
    console.error("[ai-judge/sessions] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

// GET: List all AI judging sessions
export async function GET() {
  try {
    const sessions = await prisma.aIJudgingSession.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        motion: true,
        status: true,
        currentPhase: true,
        currentSpeech: true,
        winner: true,
        processingTimeMs: true,
        createdAt: true,
        completedAt: true,
      },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[ai-judge/sessions] GET error:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 },
    );
  }
}
