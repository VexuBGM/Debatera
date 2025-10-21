import prisma from '@/lib/prisma';
import { DebateSide } from '@prisma/client';

export interface StandingRow {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  propCount: number;
  oppCount: number;
  opponentStrength: number; // Buchholz-style tie-breaker
}

/**
 * Compute standings for a tournament
 */
export async function computeStandings(
  tournamentId: string
): Promise<StandingRow[]> {
  // Get all teams in the tournament
  const teams = await prisma.team.findMany({
    where: { tournamentId },
    include: {
      propDebates: {
        where: {
          round: { tournamentId, isPublished: true },
          winningSide: { not: null },
        },
        select: {
          winningSide: true,
          oppTeamId: true,
        },
      },
      oppDebates: {
        where: {
          round: { tournamentId, isPublished: true },
          winningSide: { not: null },
        },
        select: {
          winningSide: true,
          propTeamId: true,
        },
      },
    },
  });

  // Build standings
  const standings: StandingRow[] = [];
  const teamWinsMap = new Map<string, number>();

  // First pass: calculate wins for each team
  for (const team of teams) {
    const propWins = team.propDebates.filter(
      (d) => d.winningSide === DebateSide.PROP
    ).length;
    const oppWins = team.oppDebates.filter(
      (d) => d.winningSide === DebateSide.OPP
    ).length;
    const wins = propWins + oppWins;

    const totalDebates = team.propDebates.length + team.oppDebates.length;
    const losses = totalDebates - wins;

    teamWinsMap.set(team.id, wins);

    standings.push({
      teamId: team.id,
      teamName: team.name,
      wins,
      losses,
      propCount: team.propDebates.length,
      oppCount: team.oppDebates.length,
      opponentStrength: 0, // Will calculate in second pass
    });
  }

  // Second pass: calculate opponent strength (Buchholz)
  for (const standing of standings) {
    const team = teams.find((t) => t.id === standing.teamId)!;
    let totalOpponentWins = 0;
    let opponentCount = 0;

    // Sum wins of all opponents faced
    for (const debate of team.propDebates) {
      const oppWins = teamWinsMap.get(debate.oppTeamId) ?? 0;
      totalOpponentWins += oppWins;
      opponentCount++;
    }

    for (const debate of team.oppDebates) {
      const oppWins = teamWinsMap.get(debate.propTeamId) ?? 0;
      totalOpponentWins += oppWins;
      opponentCount++;
    }

    standing.opponentStrength =
      opponentCount > 0 ? totalOpponentWins / opponentCount : 0;
  }

  // Sort standings by wins (desc), then opponent strength (desc)
  standings.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return b.opponentStrength - a.opponentStrength;
  });

  return standings;
}

/**
 * Get standings for display
 */
export async function getStandings(tournamentId: string) {
  return computeStandings(tournamentId);
}
