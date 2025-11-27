import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const ApproveParticipantSchema = z.object({
  participationId: z.string(),
  action: z.enum(['approve', 'reject']),
});

/**
 * POST /api/tournaments/[id]/registrations/participant/approve
 * Approve or reject a participant registration
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;
    const json = await req.json();
    const parsed = ApproveParticipantSchema.parse(json);

    // Check if tournament exists and user is the owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== currentUserId) {
      return NextResponse.json(
        { error: 'Only tournament owner can approve registrations' },
        { status: 403 }
      );
    }

    // Get the participation
    const participation = await prisma.tournamentParticipation.findUnique({
      where: { id: parsed.participationId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!participation) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    if (participation.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Participation does not belong to this tournament' },
        { status: 400 }
      );
    }

    if (participation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Participation has already been processed' },
        { status: 400 }
      );
    }

    // Update the participation status
    const updated = await prisma.tournamentParticipation.update({
      where: { id: parsed.participationId },
      data:
        parsed.action === 'approve'
          ? {
              status: 'APPROVED',
              approvedAt: new Date(),
              approvedById: currentUserId,
            }
          : {
              status: 'REJECTED',
              rejectedAt: new Date(),
              rejectedById: currentUserId,
            },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: `Participant registration ${parsed.action}d successfully`,
      participation: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
