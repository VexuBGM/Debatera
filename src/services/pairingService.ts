import prisma from '@/lib/prisma';
import { DebateSide, RoundStage } from '@prisma/client';

interface TeamWithHistory {
  id: string;
  name: string;
  wins: number;
  propCount: number;
  oppCount: number;
  oppIds: string[];
}

interface Pairing {
  propTeamId: string;
  oppTeamId: string;
  propTeam: TeamWithHistory;
  oppTeam: TeamWithHistory;
}

/**
 * Get team history including wins, side counts, and opponents faced
 */
async function getTeamHistory(
  tournamentId: string,
  teamIds: string[]
): Promise<Map<string, TeamWithHistory>> {
  const teams = await prisma.team.findMany({
    where: {
      id: { in: teamIds },
      tournamentId,
    },
    include: {
      propDebates: {
        where: {
          round: { tournamentId, isPublished: true },
        },
        select: {
          winningSide: true,
          oppTeamId: true,
        },
      },
      oppDebates: {
        where: {
          round: { tournamentId, isPublished: true },
        },
        select: {
          winningSide: true,
          propTeamId: true,
        },
      },
    },
  });

  const historyMap = new Map<string, TeamWithHistory>();

  for (const team of teams) {
    const propWins = team.propDebates.filter(
      (d) => d.winningSide === DebateSide.PROP
    ).length;
    const oppWins = team.oppDebates.filter(
      (d) => d.winningSide === DebateSide.OPP
    ).length;
    const wins = propWins + oppWins;

    const oppIds = [
      ...team.propDebates.map((d) => d.oppTeamId),
      ...team.oppDebates.map((d) => d.propTeamId),
    ];

    historyMap.set(team.id, {
      id: team.id,
      name: team.name,
      wins,
      propCount: team.propDebates.length,
      oppCount: team.oppDebates.length,
      oppIds,
    });
  }

  return historyMap;
}

/**
 * Group teams into brackets by wins
 */
function createBrackets(
  teams: TeamWithHistory[]
): Map<number, TeamWithHistory[]> {
  const brackets = new Map<number, TeamWithHistory[]>();

  for (const team of teams) {
    const bracket = brackets.get(team.wins) || [];
    bracket.push(team);
    brackets.set(team.wins, bracket);
  }

  return brackets;
}

/**
 * Apply pull-ups to handle odd-sized brackets
 */
function applyPullUps(brackets: Map<number, TeamWithHistory[]>): void {
  const sortedWins = Array.from(brackets.keys()).sort((a, b) => b - a);

  for (let i = 0; i < sortedWins.length - 1; i++) {
    const currentWins = sortedWins[i];
    const bracket = brackets.get(currentWins)!;

    if (bracket.length % 2 === 1) {
      // Pull up one team from next bracket
      const nextWins = sortedWins[i + 1];
      const nextBracket = brackets.get(nextWins);

      if (nextBracket && nextBracket.length > 0) {
        // Pull up the highest-ranked team (last in sorted order)
        const pulledTeam = nextBracket.pop()!;
        bracket.push(pulledTeam);
      }
    }
  }
}

/**
 * Check if two teams have faced each other before
 */
function hasRematch(team1: TeamWithHistory, team2: TeamWithHistory): boolean {
  return team1.oppIds.includes(team2.id);
}

/**
 * Pair teams within a bracket, avoiding rematches and balancing sides
 */
function pairWithinBracket(
  bracket: TeamWithHistory[],
  constraints: { avoidRematches: boolean }
): Pairing[] {
  const pairings: Pairing[] = [];
  const paired = new Set<string>();

  // Sort by side balance (prefer teams that have had fewer debates on their assigned side)
  const sorted = [...bracket].sort((a, b) => {
    const aBalance = Math.abs(a.propCount - a.oppCount);
    const bBalance = Math.abs(b.propCount - b.oppCount);
    return bBalance - aBalance;
  });

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].id)) continue;

    const team1 = sorted[i];
    let team2: TeamWithHistory | null = null;

    // Find a suitable opponent
    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].id)) continue;

      const candidate = sorted[j];
      
      if (constraints.avoidRematches && hasRematch(team1, candidate)) {
        continue;
      }

      team2 = candidate;
      break;
    }

    if (!team2 && i + 1 < sorted.length) {
      // If we couldn't find a non-rematch, accept a rematch
      for (let j = i + 1; j < sorted.length; j++) {
        if (!paired.has(sorted[j].id)) {
          team2 = sorted[j];
          break;
        }
      }
    }

    if (team2) {
      // Assign sides based on balance
      const team1PropBalance = team1.propCount - team1.oppCount;
      const team2PropBalance = team2.propCount - team2.oppCount;

      let propTeam: TeamWithHistory;
      let oppTeam: TeamWithHistory;

      if (team1PropBalance < team2PropBalance) {
        // team1 needs prop more
        propTeam = team1;
        oppTeam = team2;
      } else if (team2PropBalance < team1PropBalance) {
        // team2 needs prop more
        propTeam = team2;
        oppTeam = team1;
      } else {
        // Equal balance, alternate randomly
        if (Math.random() < 0.5) {
          propTeam = team1;
          oppTeam = team2;
        } else {
          propTeam = team2;
          oppTeam = team1;
        }
      }

      pairings.push({
        propTeamId: propTeam.id,
        oppTeamId: oppTeam.id,
        propTeam,
        oppTeam,
      });

      paired.add(team1.id);
      paired.add(team2.id);
    }
  }

  return pairings;
}

/**
 * Generate preliminary round draw using power pairing
 */
export async function generatePrelimDraw(
  tournamentId: string,
  roundNumber: number
): Promise<Pairing[]> {
  // Get all teams in the tournament
  const teams = await prisma.team.findMany({
    where: { tournamentId },
  });

  if (teams.length < 2) {
    throw new Error('At least 2 teams are required for a draw');
  }

  const teamIds = teams.map((t) => t.id);

  // For round 1, do random pairing
  if (roundNumber === 1) {
    const shuffled = [...teams]
      .map((team) => ({
        id: team.id,
        name: team.name,
        wins: 0,
        propCount: 0,
        oppCount: 0,
        oppIds: [],
      }))
      .sort(() => Math.random() - 0.5);

    const pairings: Pairing[] = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      pairings.push({
        propTeamId: shuffled[i].id,
        oppTeamId: shuffled[i + 1].id,
        propTeam: shuffled[i],
        oppTeam: shuffled[i + 1],
      });
    }

    // Handle bye if odd number
    if (shuffled.length % 2 === 1) {
      // For now, just skip the last team (bye handling to be implemented)
      console.log('Warning: Odd number of teams, last team gets a bye');
    }

    return pairings;
  }

  // For subsequent rounds, use power pairing
  const historyMap = await getTeamHistory(tournamentId, teamIds);
  const teamsWithHistory = teamIds.map((id) => historyMap.get(id)!);

  const brackets = createBrackets(teamsWithHistory);
  applyPullUps(brackets);

  const pairings: Pairing[] = [];

  // Pair within each bracket
  const sortedBrackets = Array.from(brackets.entries()).sort(
    ([a], [b]) => b - a
  );

  for (const [, bracket] of sortedBrackets) {
    const bracketPairings = pairWithinBracket(bracket, {
      avoidRematches: true,
    });
    pairings.push(...bracketPairings);
  }

  return pairings;
}

/**
 * Create debates for a round
 */
export async function createDebatesForRound(
  roundId: string,
  pairings: Pairing[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const pairing of pairings) {
      await tx.debate.create({
        data: {
          roundId,
          propTeamId: pairing.propTeamId,
          oppTeamId: pairing.oppTeamId,
          status: 'SCHEDULED',
        },
      });
    }
  });
}

/**
 * Generate and create round draw
 */
export async function generateRoundDraw(
  tournamentId: string,
  roundNumber: number,
  stage: RoundStage = RoundStage.PRELIM
): Promise<string> {
  // Check if round already exists
  const existingRound = await prisma.round.findUnique({
    where: {
      tournamentId_number: { tournamentId, number: roundNumber },
    },
  });

  if (existingRound) {
    throw new Error(`Round ${roundNumber} already exists`);
  }

  // Generate pairings
  const pairings = await generatePrelimDraw(tournamentId, roundNumber);

  // Create round and debates in transaction
  const round = await prisma.$transaction(async (tx) => {
    const newRound = await tx.round.create({
      data: {
        tournamentId,
        number: roundNumber,
        stage,
        isPublished: false,
      },
    });

    for (const pairing of pairings) {
      await tx.debate.create({
        data: {
          roundId: newRound.id,
          tournamentId,
          propTeamId: pairing.propTeamId,
          oppTeamId: pairing.oppTeamId,
          status: 'SCHEDULED',
        },
      });
    }

    return newRound;
  });

  return round.id;
}
