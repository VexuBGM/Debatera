import prisma from '@/lib/prisma';
import { CallRole, DebateSide } from '@prisma/client';

interface JudgeInfo {
  id: string;
  username: string;
  strength: number;
  allocatedDebates: Set<string>;
  conflicts: Set<string>; // Set of team IDs this judge has conflicts with
}

interface DebateInfo {
  id: string;
  importance: number;
  propTeamId: string;
  oppTeamId: string;
  allocatedJudges: string[];
}

interface AllocationCost {
  judgeId: string;
  debateId: string;
  cost: number;
}

/**
 * Get judge strength (placeholder: based on feedback count or default)
 */
async function getJudgeStrength(judgeId: string): Promise<number> {
  const feedbackCount = await prisma.judgeFeedback.count({
    where: { judgeId },
  });

  // Simple heuristic: base strength of 5, +1 for every 5 feedbacks (capped at 10)
  return Math.min(5 + Math.floor(feedbackCount / 5), 10);
}

/**
 * Calculate debate importance based on round and bracket
 */
function calculateDebateImportance(
  roundNumber: number,
  teamWins: { prop: number; opp: number }
): number {
  // Higher rounds are more important
  const roundWeight = roundNumber * 2;

  // Higher brackets (more wins) are more important
  const avgWins = (teamWins.prop + teamWins.opp) / 2;
  const bracketWeight = avgWins * 3;

  return roundWeight + bracketWeight;
}

/**
 * Get conflicts for a judge (teams they've judged before)
 */
async function getJudgeConflicts(judgeId: string): Promise<Set<string>> {
  const pastDebates = await prisma.debateParticipant.findMany({
    where: {
      userId: judgeId,
      role: CallRole.JUDGE,
    },
    include: {
      debate: {
        select: {
          propTeamId: true,
          oppTeamId: true,
        },
      },
    },
  });

  const conflicts = new Set<string>();
  for (const participant of pastDebates) {
    conflicts.add(participant.debate.propTeamId);
    conflicts.add(participant.debate.oppTeamId);
  }

  return conflicts;
}

/**
 * Calculate cost of allocating a judge to a debate
 */
function calculateAllocationCost(
  judge: JudgeInfo,
  debate: DebateInfo,
  weights: {
    importanceWeight: number;
    conflictPenalty: number;
    strengthMismatchPenalty: number;
  }
): number {
  let cost = 0;

  // Penalty for weak judges on important debates
  const strengthMismatch = Math.max(0, debate.importance - judge.strength);
  cost += strengthMismatch * weights.strengthMismatchPenalty;

  // Heavy penalty for conflicts
  if (
    judge.conflicts.has(debate.propTeamId) ||
    judge.conflicts.has(debate.oppTeamId)
  ) {
    cost += weights.conflictPenalty;
  }

  // Preference for judges with fewer allocations (load balancing)
  cost += judge.allocatedDebates.size * 2;

  return cost;
}

/**
 * Greedy judge allocation algorithm
 */
function greedyAllocate(
  judges: JudgeInfo[],
  debates: DebateInfo[],
  weights: {
    importanceWeight: number;
    conflictPenalty: number;
    strengthMismatchPenalty: number;
  }
): Map<string, string[]> {
  const allocation = new Map<string, string[]>();

  // Sort debates by importance (highest first)
  const sortedDebates = [...debates].sort(
    (a, b) => b.importance - a.importance
  );

  for (const debate of sortedDebates) {
    const costs: AllocationCost[] = [];

    // Calculate cost for each judge
    for (const judge of judges) {
      // Skip if judge is already allocated to too many debates
      if (judge.allocatedDebates.size >= 3) continue;

      const cost = calculateAllocationCost(judge, debate, weights);
      costs.push({ judgeId: judge.id, debateId: debate.id, cost });
    }

    // Sort by cost (lowest first)
    costs.sort((a, b) => a.cost - b.cost);

    // Allocate best judge (or up to 3 judges if available)
    const allocated: string[] = [];
    for (let i = 0; i < Math.min(1, costs.length); i++) {
      const { judgeId } = costs[i];
      allocated.push(judgeId);

      // Update judge's allocated debates
      const judge = judges.find((j) => j.id === judgeId)!;
      judge.allocatedDebates.add(debate.id);
    }

    allocation.set(debate.id, allocated);
  }

  return allocation;
}

/**
 * Auto-allocate judges to debates in a round
 */
export async function autoAllocateJudges(
  roundId: string,
  options?: {
    importanceWeight?: number;
    conflictPenalty?: number;
    strengthMismatchPenalty?: number;
  }
): Promise<void> {
  const weights = {
    importanceWeight: options?.importanceWeight ?? 5,
    conflictPenalty: options?.conflictPenalty ?? 1000,
    strengthMismatchPenalty: options?.strengthMismatchPenalty ?? 10,
  };

  // Get round with debates
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      debates: {
        include: {
          propTeam: {
            include: {
              propDebates: {
                where: {
                  round: { isPublished: true },
                },
                select: { winningSide: true },
              },
              oppDebates: {
                where: {
                  round: { isPublished: true },
                },
                select: { winningSide: true },
              },
            },
          },
          oppTeam: {
            include: {
              propDebates: {
                where: {
                  round: { isPublished: true },
                },
                select: { winningSide: true },
              },
              oppDebates: {
                where: {
                  round: { isPublished: true },
                },
                select: { winningSide: true },
              },
            },
          },
        },
      },
    },
  });

  if (!round) {
    throw new Error('Round not found');
  }

  // Get all potential judges (users who are not team members)
  const teamMemberIds = await prisma.teamMember.findMany({
    where: {
      team: {
        tournamentId: round.tournamentId,
      },
    },
    select: { userId: true },
  });

  const excludeUserIds = teamMemberIds.map((tm) => tm.userId);

  const potentialJudges = await prisma.user.findMany({
    where: {
      id: { notIn: excludeUserIds },
    },
  });

  // Build judge info
  const judges: JudgeInfo[] = await Promise.all(
    potentialJudges.map(async (judge) => {
      const strength = await getJudgeStrength(judge.id);
      const conflicts = await getJudgeConflicts(judge.id);

      return {
        id: judge.id,
        username: judge.username,
        strength,
        allocatedDebates: new Set<string>(),
        conflicts,
      };
    })
  );

  // Build debate info
  const debates: DebateInfo[] = round.debates.map((debate) => {
    const propWins =
      debate.propTeam.propDebates.filter((d) => d.winningSide === 'PROP')
        .length +
      debate.propTeam.oppDebates.filter((d) => d.winningSide === 'OPP').length;

    const oppWins =
      debate.oppTeam.propDebates.filter((d) => d.winningSide === 'PROP')
        .length +
      debate.oppTeam.oppDebates.filter((d) => d.winningSide === 'OPP').length;

    const importance = calculateDebateImportance(round.number, {
      prop: propWins,
      opp: oppWins,
    });

    return {
      id: debate.id,
      importance,
      propTeamId: debate.propTeamId,
      oppTeamId: debate.oppTeamId,
      allocatedJudges: [],
    };
  });

  // Perform allocation
  const allocation = greedyAllocate(judges, debates, weights);

  // Save allocation to database
  await prisma.$transaction(async (tx) => {
    for (const [debateId, judgeIds] of allocation.entries()) {
      // Remove existing judge participants
      await tx.debateParticipant.deleteMany({
        where: {
          debateId,
          role: CallRole.JUDGE,
        },
      });

      // Add new judge participants
      for (const judgeId of judgeIds) {
        await tx.debateParticipant.create({
          data: {
            debateId,
            userId: judgeId,
            role: CallRole.JUDGE,
            side: DebateSide.NEUTRAL,
          },
        });
      }
    }
  });
}
