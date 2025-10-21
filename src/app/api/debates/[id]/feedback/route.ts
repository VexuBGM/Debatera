import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CallRole, DebateSide } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { notes, winnerSide } = body;

    // Verify debate exists
    const debate = await prisma.debate.findUnique({
      where: { id },
    });

    if (!debate) {
      return NextResponse.json(
        { error: 'Debate not found' },
        { status: 404 }
      );
    }

    // Verify user is a judge in this debate
    const participant = await prisma.debateParticipant.findUnique({
      where: {
        debateId_userId: {
          debateId: id,
          userId: user!.id,
        },
      },
    });

    if (!participant || participant.role !== CallRole.JUDGE) {
      return NextResponse.json(
        { error: 'Only judges in this debate can submit feedback' },
        { status: 403 }
      );
    }

    // Validate winnerSide if provided
    if (winnerSide && winnerSide !== DebateSide.PROP && winnerSide !== DebateSide.OPP) {
      return NextResponse.json(
        { error: 'winnerSide must be PROP or OPP' },
        { status: 400 }
      );
    }

    // Upsert feedback
    const feedback = await prisma.judgeFeedback.upsert({
      where: {
        debateId_judgeId: {
          debateId: id,
          judgeId: user!.id,
        },
      },
      update: {
        notes: notes || null,
        winnerSide: winnerSide || null,
      },
      create: {
        debateId: id,
        judgeId: user!.id,
        notes: notes || null,
        winnerSide: winnerSide || null,
      },
      include: {
        judge: {
          select: {
            id: true,
            username: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
