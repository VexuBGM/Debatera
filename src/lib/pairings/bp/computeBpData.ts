/**
 * BP Swiss Data Computation
 *
 * Queries the database to build per-team BP records (team points,
 * speaker points, past roommates, position counts, bye history)
 * needed by the BP pairing algorithm.
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { BpTeamRecord } from './types';

/**
 * Build BP records for every active team in a tournament, computed
 * from all rounds with number < currentRoundNumber.
 */
export async function computeBpTeamRecords(
  tournamentId: string,
  currentRoundNumber: number
): Promise<BpTeamRecord[]> {
  // 1. Fetch all teams
  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    select: { id: true, name: true, institutionId: true },
  });

  // 2. Fetch all debates from prior rounds that have BP results
  const debates = await prisma.tournamentDebate.findMany({
    where: {
      round: {
        tournamentId,
        number: { lt: currentRoundNumber },
      },
    },
    select: {
      id: true,
      isBye: true,
      teamSlots: {
        select: {
          teamId: true,
          position: true,
        },
      },
      bpTeamResults: {
        select: {
          teamId: true,
          position: true,
          rank: true,
          teamPoints: true,
          totalSpeakerPoints: true,
        },
      },
    },
  });

  // 3. Build accumulators
  const records = new Map<string, BpTeamRecord>();
  for (const team of teams) {
    records.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      institutionId: team.institutionId,
      teamPoints: 0,
      speakerPoints: 0,
      pastRoommates: new Set<string>(),
      positionCounts: {
        BP_OG: 0,
        BP_OO: 0,
        BP_CG: 0,
        BP_CO: 0,
      },
      hadBye: false,
    });
  }

  // 4. Process debates
  for (const debate of debates) {
    if (debate.isBye) {
      // Mark bye teams
      for (const slot of debate.teamSlots) {
        const record = records.get(slot.teamId);
        if (record) record.hadBye = true;
      }
      continue;
    }

    // Track roommates
    const teamsInRoom = debate.teamSlots.map((s) => s.teamId);
    for (const teamId of teamsInRoom) {
      const record = records.get(teamId);
      if (!record) continue;
      for (const otherId of teamsInRoom) {
        if (otherId !== teamId) record.pastRoommates.add(otherId);
      }
    }

    // Track position counts
    for (const slot of debate.teamSlots) {
      const record = records.get(slot.teamId);
      if (record) {
        record.positionCounts[slot.position] =
          (record.positionCounts[slot.position] ?? 0) + 1;
      }
    }

    // Accumulate results
    for (const result of debate.bpTeamResults) {
      const record = records.get(result.teamId);
      if (!record) continue;
      record.teamPoints += result.teamPoints;
      record.speakerPoints += safeDecimalToNumber(result.totalSpeakerPoints);
    }
  }

  return Array.from(records.values());
}

function safeDecimalToNumber(
  value: Prisma.Decimal | string | number | null | undefined
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}
