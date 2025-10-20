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
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { userId, role, side, speakOrder } = body;

    // Validation
    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      );
    }

    if (!Object.values(CallRole).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

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

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate speakOrder
    if (role === CallRole.DEBATER) {
      if (side !== DebateSide.PROP && side !== DebateSide.OPP) {
        return NextResponse.json(
          { error: 'Debaters must have side PROP or OPP' },
          { status: 400 }
        );
      }
    } else {
      // Judges and spectators must be NEUTRAL
      if (side && side !== DebateSide.NEUTRAL) {
        return NextResponse.json(
          { error: 'Judges and spectators must have side NEUTRAL' },
          { status: 400 }
        );
      }
      if (speakOrder !== null && speakOrder !== undefined) {
        return NextResponse.json(
          { error: 'Only debaters can have a speakOrder' },
          { status: 400 }
        );
      }
    }

    // Upsert participant
    const participant = await prisma.debateParticipant.upsert({
      where: {
        debateId_userId: {
          debateId: id,
          userId,
        },
      },
      update: {
        role,
        side: side || DebateSide.NEUTRAL,
        speakOrder: speakOrder || null,
      },
      create: {
        debateId: id,
        userId,
        role,
        side: side || DebateSide.NEUTRAL,
        speakOrder: speakOrder || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error('Error upserting debate participant:', error);
    return NextResponse.json(
      { error: 'Failed to upsert debate participant' },
      { status: 500 }
    );
  }
}
