/**
 * GET /api/tournaments/[id]/standings
 *
 * Public endpoint – returns team standings and speaker standings for a tournament.
 * Only includes data from rounds with status == COMPLETED (unless ?includeInProgress=1).
 * Returns ONLY safe fields: names, points, ranks.  No comments, no private notes.
 * Supports ?teamPage=1&teamPageSize=20 and ?speakerPage=1&speakerPageSize=20 for pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TournamentRoundStatus } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getTeamDisplayName } from '@/lib/teams/teamDisplayName';
import { REPLY_ROLES } from '@/lib/ballots/constants';
import { parsePaginationParams, buildPaginationMeta, type PaginationMeta } from '@/lib/pagination';
import { filterTopSpeakers } from '@/lib/domains/reporting/filterTopSpeakers';
import { getTournamentViewAccess } from '@/lib/security/access';

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
  replyTotalPoints: number;
  replyAveragePoints: number;
  replySpeechesCount: number;
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
  const { userId } = await auth();
  const access = await getTournamentViewAccess(tournamentId, userId);

  if (!access.exists || !access.canView) {
    return NextResponse.json(
      { error: 'Tournament not found' },
      { status: 404 },
    );
  }

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
    select: { showDebaterNames: true, speakerTopN: true, hideSpeakerPoints: true },
  });
  const showDebaterNames = settings?.showDebaterNames ?? false;
  const speakerTopNSetting = settings?.speakerTopN ?? null;
  const hideSpeakerPoints = settings?.hideSpeakerPoints ?? false;

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

  // Separate substantive speeches from reply speeches
  const replyRoleSet = new Set<string>(REPLY_ROLES);
  const substantiveSpeeches = speeches.filter((s) => !replyRoleSet.has(s.role));
  const replySpeeches = speeches.filter((s) => replyRoleSet.has(s.role));

  // Group by (debateId, speakerId) → compute average score per debate-speech
  const debateSpeakerKey = (debateId: string, speakerId: string) =>
    `${debateId}::${speakerId}`;

  // Substantive speech scores
  const debateSpeakerSubstantiveScores = new Map<string, number[]>();
  for (const s of substantiveSpeeches) {
    const key = debateSpeakerKey(s.ballot.debateId, s.speakerId!);
    let arr = debateSpeakerSubstantiveScores.get(key);
    if (!arr) {
      arr = [];
      debateSpeakerSubstantiveScores.set(key, arr);
    }
    arr.push(safeDecimalToNumber(s.score));
  }

  // Reply speech scores
  const debateSpeakerReplyScores = new Map<string, number[]>();
  for (const s of replySpeeches) {
    const key = debateSpeakerKey(s.ballot.debateId, s.speakerId!);
    let arr = debateSpeakerReplyScores.get(key);
    if (!arr) {
      arr = [];
      debateSpeakerReplyScores.set(key, arr);
    }
    arr.push(safeDecimalToNumber(s.score));
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
    replyTotalPoints: number;
    replySpeechesCount: number;
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

  function getOrCreateAcc(speakerId: string): SpeakerAcc | null {
    let acc = speakerAccMap.get(speakerId);
    if (!acc) {
      const meta = speakerMeta.get(speakerId);
      if (!meta) return null;
      acc = {
        speakerId,
        ...meta,
        totalPoints: 0,
        speechesCount: 0,
        replyTotalPoints: 0,
        replySpeechesCount: 0,
      };
      speakerAccMap.set(speakerId, acc);
    }
    return acc;
  }

  // Accumulate substantive speech scores
  for (const [key, scores] of debateSpeakerSubstantiveScores) {
    const speakerId = key.split('::')[1];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const acc = getOrCreateAcc(speakerId);
    if (!acc) continue;
    acc.totalPoints += avg;
    acc.speechesCount += 1;
  }

  // Accumulate reply speech scores (tracked separately)
  for (const [key, scores] of debateSpeakerReplyScores) {
    const speakerId = key.split('::')[1];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const acc = getOrCreateAcc(speakerId);
    if (!acc) continue;
    acc.replyTotalPoints += avg;
    acc.replySpeechesCount += 1;
  }

  // Sort: totalPoints DESC, name ASC
  const speakerSorted = Array.from(speakerAccMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
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
      averagePoints:
        row.speechesCount > 0
          ? roundTo1(row.totalPoints / row.speechesCount)
          : 0,
      speechesCount: row.speechesCount,
      replyTotalPoints: roundTo1(row.replyTotalPoints),
      replyAveragePoints:
        row.replySpeechesCount > 0
          ? roundTo1(row.replyTotalPoints / row.replySpeechesCount)
          : 0,
      replySpeechesCount: row.replySpeechesCount,
    }),
  );

  // ===================================================================
  // Pagination for standings
  // ===================================================================
  const sp = request.nextUrl.searchParams;

  // team standings pagination uses teamPage / teamPageSize params
  const teamPaginationParams = parsePaginationParams(
    new URLSearchParams({
      page: sp.get('teamPage') ?? '1',
      pageSize: sp.get('teamPageSize') ?? '20',
    }),
  );
  const teamStart = (teamPaginationParams.page - 1) * teamPaginationParams.pageSize;
  const paginatedTeamStandings = teamStandings.slice(
    teamStart,
    teamStart + teamPaginationParams.pageSize,
  );

  // speaker standings: Top N filter (from settings) or normal pagination
  let paginatedSpeakerStandings: SpeakerStanding[];
  let speakerPaginationMeta: PaginationMeta;

  if (speakerTopNSetting !== null && speakerTopNSetting > 0) {
    const topN = filterTopSpeakers(speakerStandings, speakerTopNSetting);
    paginatedSpeakerStandings = topN;
    speakerPaginationMeta = buildPaginationMeta(topN.length, {
      page: 1,
      pageSize: Math.max(1, topN.length),
    });
  } else {
    // Normal pagination
    const speakerPaginationParams = parsePaginationParams(
      new URLSearchParams({
        page: sp.get('speakerPage') ?? '1',
        pageSize: sp.get('speakerPageSize') ?? '20',
      }),
    );
    const speakerStart = (speakerPaginationParams.page - 1) * speakerPaginationParams.pageSize;
    paginatedSpeakerStandings = speakerStandings.slice(
      speakerStart,
      speakerStart + speakerPaginationParams.pageSize,
    );
    speakerPaginationMeta = buildPaginationMeta(speakerStandings.length, speakerPaginationParams);
  }

  // ===================================================================
  // Response
  // ===================================================================
  return NextResponse.json({
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    teamStandings: paginatedTeamStandings,
    teamPagination: buildPaginationMeta(teamStandings.length, teamPaginationParams),
    speakerStandings: paginatedSpeakerStandings,
    speakerPagination: speakerPaginationMeta,
    hideSpeakerPoints,
  });
}
