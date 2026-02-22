/**
 * API: Portal Judge Context
 *
 * GET /api/tournaments/[id]/portal/judge
 *
 * Token-authenticated endpoint (no Clerk session required).
 * Returns the judge's tournament context and ballot assignments.
 *
 * Auth: Bearer token in Authorization header or ?token= query param.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractToken, validatePortalToken } from '@/lib/portal';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { getTeamDisplayName } from '@/lib/teams/teamDisplayName';
import { createBallotForJudge } from '@/lib/ballots';
import { TournamentRoundStatus } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId } = await params;

    // Extract and validate token
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const portalAuth = await validatePortalToken(token, tournamentId);
    if (!portalAuth) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please contact the tournament organizer.' },
        { status: 401 }
      );
    }

    // Load the tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        settings: { select: { eventMode: true, showDebaterNames: true } },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Load the judge participant + user info
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { id: portalAuth.participantId },
      include: {
        user: true,
        institution: { select: { id: true, name: true } },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Load all judge assignments for this participant, grouped by round
    const assignments = await prisma.tournamentDebateJudge.findMany({
      where: {
        participantId: portalAuth.participantId,
      },
      include: {
        ballot: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
        },
        debate: {
          include: {
            round: true,
            propTeam: {
              include: {
                institution: true,
                members: {
                  include: {
                    participant: { include: { user: true } },
                  },
                },
              },
            },
            oppTeam: {
              include: {
                institution: true,
                members: {
                  include: {
                    participant: { include: { user: true } },
                  },
                },
              },
            },
            venue: true,
          },
        },
      },
      orderBy: [
        { debate: { round: { number: 'asc' } } },
        { debate: { order: 'asc' } },
      ],
    });

    // Ensure ballots exist for all assignments (create on demand)
    for (const assignment of assignments) {
      if (!assignment.ballot) {
        await prisma.$transaction(async (tx) => {
          await createBallotForJudge(tx, assignment.debateId, assignment.id);
        });
      }
    }

    // Re-fetch assignments to get newly created ballots
    const refreshedAssignments = await prisma.tournamentDebateJudge.findMany({
      where: {
        participantId: portalAuth.participantId,
      },
      include: {
        ballot: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
        },
        debate: {
          include: {
            round: true,
            propTeam: {
              include: {
                institution: true,
                members: {
                  include: {
                    participant: { include: { user: true } },
                  },
                },
              },
            },
            oppTeam: {
              include: {
                institution: true,
                members: {
                  include: {
                    participant: { include: { user: true } },
                  },
                },
              },
            },
            venue: true,
          },
        },
      },
      orderBy: [
        { debate: { round: { number: 'asc' } } },
        { debate: { order: 'asc' } },
      ],
    });

    // Filter to only show rounds that are PUBLISHED, IN_PROGRESS, or COMPLETED
    const visibleAssignments = refreshedAssignments.filter((a) => {
      const status = a.debate.round.status;
      return (
        status === TournamentRoundStatus.PUBLISHED ||
        status === TournamentRoundStatus.IN_PROGRESS ||
        status === TournamentRoundStatus.COMPLETED
      );
    });

    // Group by round
    const roundsMap = new Map<
      string,
      {
        id: string;
        number: number;
        name: string;
        status: string;
        motion: string | null;
        infoSlide: string | null;
        debates: Array<{
          debateId: string;
          order: number;
          propTeamName: string | null;
          oppTeamName: string | null;
          isBye: boolean;
          venueName: string | null;
          judgeRole: string;
          ballotId: string | null;
          ballotStatus: string | null;
          submittedAt: string | null;
        }>;
      }
    >();

    for (const assignment of visibleAssignments) {
      const round = assignment.debate.round;
      if (!roundsMap.has(round.id)) {
        roundsMap.set(round.id, {
          id: round.id,
          number: round.number,
          name: round.name,
          status: round.status,
          motion: round.motion,
          infoSlide: round.infoSlide,
          debates: [],
        });
      }

      const showNames = tournament!.settings?.showDebaterNames ?? false;

      roundsMap.get(round.id)!.debates.push({
        debateId: assignment.debate.id,
        order: assignment.debate.order,
        propTeamName: assignment.debate.propTeam
          ? getTeamDisplayName(assignment.debate.propTeam, showNames)
          : null,
        oppTeamName: assignment.debate.oppTeam
          ? getTeamDisplayName(assignment.debate.oppTeam, showNames)
          : null,
        isBye: assignment.debate.isBye,
        venueName: assignment.debate.venue?.name ?? null,
        judgeRole: assignment.role,
        ballotId: assignment.ballot?.id ?? null,
        ballotStatus: assignment.ballot?.status ?? null,
        submittedAt: assignment.ballot?.submittedAt?.toISOString() ?? null,
      });
    }

    const rounds = Array.from(roundsMap.values()).sort(
      (a, b) => a.number - b.number
    );

    return NextResponse.json(
      {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          eventMode: tournament.settings?.eventMode ?? 'IRL',
        },
        judge: {
          participantId: participant.id,
          displayName: displayNameFromDbUser(participant.user),
          institution: participant.institution.name,
        },
        rounds,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in portal judge context:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
