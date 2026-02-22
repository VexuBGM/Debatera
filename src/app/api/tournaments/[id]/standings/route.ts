/**
 * GET /api/tournaments/[id]/standings
 *
 * Public endpoint – returns team standings and speaker standings for a tournament.
 * Only includes data from rounds with status == COMPLETED (unless ?includeInProgress=1).
 * Returns ONLY safe fields: names, points, ranks.  No comments, no private notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TournamentRoundStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getTeamDisplayName } from '@/lib/teams/teamDisplayName';

// ============================================================================
// Types
// ============================================================================

interface SpeakerStanding {
  rank: number;
  teamId: string;
  teamName: string;
  participantId: string;
  speakerName: string;
  institutionName: string;
  totalPoints: number;
  averagePoints: number;
  speechesCount: number;
}

interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  institutionName: string;
  wins: number;
  losses: number;
  speakerPoints: number;
}

// ============================================================================
// Helpers
// ============================================================================

function safeDecimalToNumber(
  value: Prisma.Decimal | string | number | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

function getSpeakerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
}): string {
  if (user.displayName) return user.displayName;
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (user.email) return user.email.split('@')[0];
  return 'Unknown';
}

// ============================================================================
// Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tournamentId } = await params;

  // Check tournament exists & get name
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true },
  });

  if (!tournament) {
    return NextResponse.json(
      { error: 'Tournament not found' },
      { status: 404 },
    );
  }

  // Determine which round statuses to include
  const includeInProgress =
    request.nextUrl.searchParams.get('includeInProgress') === '1';

  const roundStatuses: TournamentRoundStatus[] = [
    TournamentRoundStatus.COMPLETED,
  ];
  if (includeInProgress) {
    roundStatuses.push(TournamentRoundStatus.IN_PROGRESS);
  }

  // ---- Fetch settings ----
  const settings = await prisma.tournamentSettings.findUnique({
    where: { tournamentId },
    select: { showDebaterNames: true },
  });
  const showDebaterNames = settings?.showDebaterNames ?? false;

  // ---- Fetch all tournament teams ----
  const allTeams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: {
      id: true,
      name: true,
      institution: { select: { name: true } },
      members: {
        select: {
          participant: {
            select: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Build team lookup map
  const teamMap = new Map(
    allTeams.map((t) => [
      t.id,
      {
        id: t.id,
        name: getTeamDisplayName(t, showDebaterNames),
        institutionName: t.institution.name,
      },
    ]),
  );

  // ===================================================================
  // C2) Team standings – from DebateResult
  // ===================================================================
  const debateResults = await prisma.debateResult.findMany({
    where: {
      debate: {
        round: {
          tournamentId,
          status: { in: roundStatuses },
        },
      },
    },
    select: {
      winningSide: true,
      winningTeamId: true,
      propTotalAvg: true,
      oppTotalAvg: true,
      debate: {
        select: {
          propTeamId: true,
          oppTeamId: true,
          isBye: true,
        },
      },
    },
  });

  // Accumulators per team
  const teamAcc = new Map<
    string,
    { wins: number; losses: number; speakerPoints: number }
  >();

  for (const [teamId] of teamMap) {
    teamAcc.set(teamId, { wins: 0, losses: 0, speakerPoints: 0 });
  }

  for (const dr of debateResults) {
    const { debate } = dr;

    if (debate.isBye) {
      const byeTeamId = debate.propTeamId ?? debate.oppTeamId;
      if (byeTeamId) {
        const acc = teamAcc.get(byeTeamId);
        if (acc && dr.winningTeamId === byeTeamId) {
          acc.wins += 1;
        }
      }
      continue;
    }

    // Proposition
    if (debate.propTeamId) {
      const acc = teamAcc.get(debate.propTeamId);
      if (acc) {
        if (dr.winningSide === 'PROPOSITION') {
          acc.wins += 1;
        } else {
          acc.losses += 1;
        }
        acc.speakerPoints += safeDecimalToNumber(dr.propTotalAvg);
      }
    }

    // Opposition
    if (debate.oppTeamId) {
      const acc = teamAcc.get(debate.oppTeamId);
      if (acc) {
        if (dr.winningSide === 'OPPOSITION') {
          acc.wins += 1;
        } else {
          acc.losses += 1;
        }
        acc.speakerPoints += safeDecimalToNumber(dr.oppTotalAvg);
      }
    }
  }

  // Sort: wins DESC, speakerPoints DESC, teamName ASC
  const teamStandingsSorted = Array.from(teamMap.entries())
    .map(([teamId, info]) => {
      const acc = teamAcc.get(teamId)!;
      return { ...info, ...acc };
    })
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.speakerPoints !== a.speakerPoints)
        return b.speakerPoints - a.speakerPoints;
      return a.name.localeCompare(b.name);
    });

  const teamStandings: TeamStanding[] = teamStandingsSorted.map(
    (row, idx) => ({
      rank: idx + 1,
      teamId: row.id,
      teamName: row.name,
      institutionName: row.institutionName,
      wins: row.wins,
      losses: row.losses,
      speakerPoints: roundTo1(row.speakerPoints),
    }),
  );

  // ===================================================================
  // C1) Speaker standings – from BallotSpeech
  // ===================================================================
  const speeches = await prisma.ballotSpeech.findMany({
    where: {
      score: { not: null },
      speakerId: { not: null },
      role: { notIn: ['PROP_REPLY', 'OPP_REPLY'] },
      ballot: {
        status: 'SUBMITTED',
        debate: {
          round: {
            tournamentId,
            status: { in: roundStatuses },
          },
        },
      },
    },
    select: {
      score: true,
      role: true,
      speakerId: true,
      ballot: {
        select: {
          debateId: true,
        },
      },
      speaker: {
        select: {
          id: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
              institution: { select: { name: true } },
              members: {
                select: {
                  participant: {
                    select: {
                      user: {
                        select: {
                          firstName: true,
                          lastName: true,
                          displayName: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          participant: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  displayName: true,
                  email: true,
                },
              },
              institution: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  // Group by (debateId, speakerId, role) → compute average score per speech role
  // across ballots (multiple judges). Then sum speech-role averages per (debateId, speakerId).
  // This correctly handles Ironman (same speaker gives multiple speeches in one debate):
  // each speech role gets its own average, and they are summed.
  const debateSpeakerRoleKey = (debateId: string, speakerId: string, role: string) =>
    `${debateId}::${speakerId}::${role}`;

  const debateSpeakerRoleScores = new Map<string, number[]>();

  for (const s of speeches) {
    const key = debateSpeakerRoleKey(s.ballot.debateId, s.speakerId!, s.role);
    let arr = debateSpeakerRoleScores.get(key);
    if (!arr) {
      arr = [];
      debateSpeakerRoleScores.set(key, arr);
    }
    arr.push(safeDecimalToNumber(s.score));
  }

  // Now aggregate per (debateId, speakerId): sum the per-role averages
  const debateSpeakerKey = (debateId: string, speakerId: string) =>
    `${debateId}::${speakerId}`;

  const debateSpeakerTotals = new Map<string, { total: number; speechCount: number }>();

  for (const [key, scores] of debateSpeakerRoleScores) {
    const parts = key.split('::');
    const dsKey = `${parts[0]}::${parts[1]}`;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    let acc = debateSpeakerTotals.get(dsKey);
    if (!acc) {
      acc = { total: 0, speechCount: 0 };
      debateSpeakerTotals.set(dsKey, acc);
    }
    acc.total += avg;
    acc.speechCount += 1;
  }

  // Now compute per-debate average, then group by speakerId
  interface SpeakerAcc {
    speakerId: string;
    participantId: string;
    speakerName: string;
    teamId: string;
    teamName: string;
    institutionName: string;
    totalPoints: number;
    speechesCount: number;
  }

  const speakerAccMap = new Map<string, SpeakerAcc>();

  // Build a map from speakerId -> metadata (from first speech we see)
  const speakerMeta = new Map<
    string,
    {
      participantId: string;
      speakerName: string;
      teamId: string;
      teamName: string;
      institutionName: string;
    }
  >();

  for (const s of speeches) {
    if (!s.speakerId || !s.speaker) continue;
    if (speakerMeta.has(s.speakerId)) continue;
    speakerMeta.set(s.speakerId, {
      participantId: s.speaker.participant.id,
      speakerName: getSpeakerDisplayName(s.speaker.participant.user),
      teamId: s.speaker.team.id,
      teamName: getTeamDisplayName(s.speaker.team, showDebaterNames),
      institutionName: s.speaker.participant.institution.name,
    });
  }

  for (const [key, totals] of debateSpeakerTotals) {
    const speakerId = key.split('::')[1];

    let acc = speakerAccMap.get(speakerId);
    if (!acc) {
      const meta = speakerMeta.get(speakerId);
      if (!meta) continue;
      acc = {
        speakerId,
        ...meta,
        totalPoints: 0,
        speechesCount: 0,
      };
      speakerAccMap.set(speakerId, acc);
    }
    acc.totalPoints += totals.total;
    acc.speechesCount += totals.speechCount;
  }

  // Sort: averagePoints DESC, name ASC
  const speakerSorted = Array.from(speakerAccMap.values())
    .map((row) => ({
      ...row,
      averagePoints:
        row.speechesCount > 0
          ? roundTo1(row.totalPoints / row.speechesCount)
          : 0,
    }))
    .sort((a, b) => {
      if (b.averagePoints !== a.averagePoints)
        return b.averagePoints - a.averagePoints;
      return a.speakerName.localeCompare(b.speakerName);
    });

  const speakerStandings: SpeakerStanding[] = speakerSorted.map(
    (row, idx) => ({
      rank: idx + 1,
      teamId: row.teamId,
      teamName: row.teamName,
      participantId: row.participantId,
      speakerName: row.speakerName,
      institutionName: row.institutionName,
      totalPoints: roundTo1(row.totalPoints),
      averagePoints: row.averagePoints,
      speechesCount: row.speechesCount,
    }),
  );

  // ===================================================================
  // Response
  // ===================================================================
  return NextResponse.json({
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    teamStandings,
    speakerStandings,
  });
}
