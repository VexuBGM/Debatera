import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTournamentOrganizer } from '@/lib/auth';
import { CallRole, DebateSide } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        debates: {
          include: {
            propTeam: true,
            oppTeam: true,
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json(round);
  } catch (error) {
    console.error('Error fetching draw:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draw' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

  try {
    // Get round and check permissions
    const round = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    const { error } = await requireTournamentOrganizer(round.tournamentId);
    if (error) return error;

    // Don't allow edits for published rounds
    if (round.isPublished) {
      return NextResponse.json(
        { error: 'Cannot edit published round' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { debates } = body;

    if (!debates || !Array.isArray(debates)) {
      return NextResponse.json(
        { error: 'Invalid debates data' },
        { status: 400 }
      );
    }

    // Update debates in transaction
    await prisma.$transaction(async (tx) => {
      for (const debate of debates) {
        const { id, propTeamId, oppTeamId, judges } = debate;

        // Update teams if changed
        if (propTeamId || oppTeamId) {
          await tx.debate.update({
            where: { id },
            data: {
              ...(propTeamId && { propTeamId }),
              ...(oppTeamId && { oppTeamId }),
            },
          });
        }

        // Update judges if provided
        if (judges && Array.isArray(judges)) {
          // Remove existing judges
          await tx.debateParticipant.deleteMany({
            where: {
              debateId: id,
              role: CallRole.JUDGE,
            },
          });

          // Add new judges
          for (const judgeId of judges) {
            await tx.debateParticipant.create({
              data: {
                debateId: id,
                userId: judgeId,
                role: CallRole.JUDGE,
                side: DebateSide.NEUTRAL,
              },
            });
          }
        }
      }
    });

    // Fetch and return updated draw
    const updatedRound = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        debates: {
          include: {
            propTeam: true,
            oppTeam: true,
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedRound);
  } catch (error) {
    console.error('Error updating draw:', error);
    return NextResponse.json(
      { error: 'Failed to update draw' },
      { status: 500 }
    );
  }
}
