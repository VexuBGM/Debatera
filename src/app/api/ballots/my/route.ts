/**
 * API: My Ballots
 *
 * GET /api/ballots/my?tournamentId=xxx
 * Returns all ballots assigned to the current user for a tournament.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TournamentRoundStatus } from '@prisma/client';
import { getBallotsForAdjudicator } from '@/lib/ballots';

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

    const allBallots = await getBallotsForAdjudicator(userId, tournamentId);

    // Only show ballots whose round is IN_PROGRESS or COMPLETED
    const ballots = allBallots.filter((ballot) => {
      const roundStatus = ballot.adjudicator.debate.round.status;
      return (
        roundStatus === TournamentRoundStatus.IN_PROGRESS ||
        roundStatus === TournamentRoundStatus.COMPLETED
      );
    });

    // Map to a safe shape (never expose other judges' data)
    const response = ballots.map((ballot) => ({
      id: ballot.id,
      status: ballot.status,
      vote: ballot.vote,
      createdAt: ballot.createdAt,
      updatedAt: ballot.updatedAt,
      submittedAt: ballot.submittedAt,
      adjudicatorRole: ballot.adjudicator.role,
      round: {
        id: ballot.adjudicator.debate.round.id,
        number: ballot.adjudicator.debate.round.number,
        name: ballot.adjudicator.debate.round.name,
        status: ballot.adjudicator.debate.round.status,
      },
      debate: {
        id: ballot.adjudicator.debate.id,
        propTeam: ballot.adjudicator.debate.propTeam
          ? {
              id: ballot.adjudicator.debate.propTeam.id,
              name: ballot.adjudicator.debate.propTeam.name,
              institution: ballot.adjudicator.debate.propTeam.institution.name,
            }
          : null,
        oppTeam: ballot.adjudicator.debate.oppTeam
          ? {
              id: ballot.adjudicator.debate.oppTeam.id,
              name: ballot.adjudicator.debate.oppTeam.name,
              institution: ballot.adjudicator.debate.oppTeam.institution.name,
            }
          : null,
        venue: ballot.adjudicator.debate.venue
          ? {
              id: ballot.adjudicator.debate.venue.id,
              name: ballot.adjudicator.debate.venue.name,
            }
          : null,
      },
    }));

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error('Error fetching my ballots:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
