/**
 * API: My Debates
 *
 * GET /api/debates/my?tournamentId=xxx
 * Returns all debates the current user participates in (as a debater) for a tournament.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getDebatesForDebater } from '@/lib/debates';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
      return NextResponse.json(
        { error: 'tournamentId query parameter is required' },
        { status: 400 }
      );
    }

    // Only registered debaters may access this endpoint
    const isDebater = await prisma.tournamentParticipant.findFirst({
      where: { tournamentId, userId, role: 'DEBATER' },
      select: { id: true },
    });

    if (!isDebater) {
      return NextResponse.json(
        { error: 'You are not registered as a debater in this tournament' },
        { status: 403 }
      );
    }

    // Fetch tournament event mode to determine if "Join Call" should appear
    const tournamentSettings = await prisma.tournamentSettings.findUnique({
      where: { tournamentId },
      select: { eventMode: true },
    });

    const debates = await getDebatesForDebater(userId, tournamentId);

    // Map to a safe response shape
    const response = debates.map((debate) => ({
      id: debate.id,
      order: debate.order,
      isBye: debate.isBye,
      createdAt: debate.createdAt,
      round: {
        id: debate.round.id,
        number: debate.round.number,
        name: debate.round.name,
        status: debate.round.status,
      },
      propTeam: debate.propTeam
        ? {
            id: debate.propTeam.id,
            name: debate.propTeam.name,
            institution: debate.propTeam.institution.name,
            members: debate.propTeam.members.map((m) => ({
              id: m.id,
              name:
                m.participant.user.username ||
                m.participant.user.email ||
                'Unknown',
            })),
          }
        : null,
      oppTeam: debate.oppTeam
        ? {
            id: debate.oppTeam.id,
            name: debate.oppTeam.name,
            institution: debate.oppTeam.institution.name,
            members: debate.oppTeam.members.map((m) => ({
              id: m.id,
              name:
                m.participant.user.username ||
                m.participant.user.email ||
                'Unknown',
            })),
          }
        : null,
      venue: debate.venue
        ? {
            id: debate.venue.id,
            name: debate.venue.name,
          }
        : null,
      judges: debate.judges.map((j) => ({
        id: j.id,
        role: j.role,
        name:
          j.participant.user.username ||
          j.participant.user.email ||
          'Unknown',
      })),
      result: debate.result
        ? {
            winningSide: debate.result.winningSide,
            winningTeamName: debate.result.winningTeam?.name ?? null,
            propTotalAvg: debate.result.propTotalAvg
              ? Number(debate.result.propTotalAvg)
              : null,
            oppTotalAvg: debate.result.oppTotalAvg
              ? Number(debate.result.oppTotalAvg)
              : null,
            voteProp: debate.result.voteProp,
            voteOpp: debate.result.voteOpp,
          }
        : null,
    }));

    return NextResponse.json(
      { eventMode: tournamentSettings?.eventMode ?? 'IRL', debates: response },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error fetching my debates:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
