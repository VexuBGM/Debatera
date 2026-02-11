/**
 * Save Pairings Logic
 *
 * Handles manual editing of round pairings with full validation.
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, TournamentParticipantRole, JudgeRole } from '@prisma/client';
import type { DebatePairingInput } from './validation';

// =============================================================================
// Types
// =============================================================================

export interface SavePairingsResult {
  success: boolean;
  debatesSaved: number;
  warnings: string[];
  errors: string[];
}

interface TeamLookup {
  id: string;
  institutionId: string;
}

interface JudgeLookup {
  id: string;
  institutionId: string;
}

// =============================================================================
// Helpers
// =============================================================================

/** Collect every judge participant ID referenced by a debate input. */
function getAllJudgeIds(debate: DebatePairingInput): string[] {
  const ids: string[] = [...debate.panelistJudgeParticipantIds];
  if (debate.chairJudgeParticipantId) ids.push(debate.chairJudgeParticipantId);
  return ids;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate the pairings before saving.
 * Returns errors (block save) and warnings (don't block, just inform).
 */
function validatePairings(
  debates: DebatePairingInput[],
  validTeamIds: Set<string>,
  validJudgeIds: Set<string>,
  teamLookup: Map<string, TeamLookup>,
  judgeLookup: Map<string, JudgeLookup>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Track which teams, judges, and venues are used
  const usedTeamIds = new Set<string>();
  const usedJudgeIds = new Set<string>();
  const usedVenueIds = new Set<string>();

  for (let i = 0; i < debates.length; i++) {
    const debate = debates[i];
    const debateLabel = `Debate ${i + 1}`;
    const allJudgeIds = getAllJudgeIds(debate);

    // Validate BYE logic
    if (debate.isBye) {
      // BYE: exactly one team, no judges required
      const hasProp = debate.propTeamId !== null;
      const hasOpp = debate.oppTeamId !== null;

      if (!hasProp && !hasOpp) {
        errors.push(`${debateLabel}: BYE debate must have exactly one team.`);
      } else if (hasProp && hasOpp) {
        errors.push(`${debateLabel}: BYE debate cannot have both teams.`);
      }

      // BYE debates should not have judges
      if (allJudgeIds.length > 0) {
        warnings.push(`${debateLabel}: BYE debates typically don't need judges.`);
      }
    } else {
      // Normal debate: must have both teams
      if (!debate.propTeamId) {
        errors.push(`${debateLabel}: Missing proposition team.`);
      }
      if (!debate.oppTeamId) {
        errors.push(`${debateLabel}: Missing opposition team.`);
      }

      // Must have at least 1 judge (the chair)
      if (allJudgeIds.length === 0) {
        errors.push(`${debateLabel}: Must have at least 1 judge.`);
      }

      // Must have exactly 1 chair
      if (!debate.chairJudgeParticipantId) {
        errors.push(`${debateLabel}: Must have exactly 1 chair judge.`);
      }

      // Chair must not also appear as panelist
      if (
        debate.chairJudgeParticipantId &&
        debate.panelistJudgeParticipantIds.includes(debate.chairJudgeParticipantId)
      ) {
        errors.push(`${debateLabel}: Chair judge cannot also be a panelist.`);
      }
    }

    // Validate venue uniqueness
    if (debate.venueId) {
      if (usedVenueIds.has(debate.venueId)) {
        errors.push(`${debateLabel}: Venue is already assigned to another debate.`);
      }
      usedVenueIds.add(debate.venueId);
    }

    // Validate team IDs exist
    if (debate.propTeamId && !validTeamIds.has(debate.propTeamId)) {
      errors.push(`${debateLabel}: Invalid proposition team ID.`);
    }
    if (debate.oppTeamId && !validTeamIds.has(debate.oppTeamId)) {
      errors.push(`${debateLabel}: Invalid opposition team ID.`);
    }

    // Check for duplicate teams across debates
    if (debate.propTeamId) {
      if (usedTeamIds.has(debate.propTeamId)) {
        errors.push(`${debateLabel}: Team assigned to multiple debates.`);
      }
      usedTeamIds.add(debate.propTeamId);
    }
    if (debate.oppTeamId) {
      if (usedTeamIds.has(debate.oppTeamId)) {
        errors.push(`${debateLabel}: Team assigned to multiple debates.`);
      }
      usedTeamIds.add(debate.oppTeamId);
    }

    // Validate judge IDs and check for duplicates (across all debates in the round)
    for (const judgeId of allJudgeIds) {
      if (!validJudgeIds.has(judgeId)) {
        errors.push(`${debateLabel}: Invalid judge ID.`);
      }
      if (usedJudgeIds.has(judgeId)) {
        errors.push(`${debateLabel}: Judge assigned to multiple debates in this round.`);
      }
      usedJudgeIds.add(judgeId);
    }

    // Warnings (don't block save)
    if (!debate.isBye) {
      // Same-institution matchup
      if (debate.propTeamId && debate.oppTeamId) {
        const propTeam = teamLookup.get(debate.propTeamId);
        const oppTeam = teamLookup.get(debate.oppTeamId);
        if (propTeam && oppTeam && propTeam.institutionId === oppTeam.institutionId) {
          warnings.push(`${debateLabel}: Same-institution matchup.`);
        }
      }

      // Judge conflicts (check all judges – chair + panelists)
      for (const judgeId of allJudgeIds) {
        const judge = judgeLookup.get(judgeId);
        if (judge) {
          const propTeam = debate.propTeamId ? teamLookup.get(debate.propTeamId) : null;
          const oppTeam = debate.oppTeamId ? teamLookup.get(debate.oppTeamId) : null;

          if (
            (propTeam && judge.institutionId === propTeam.institutionId) ||
            (oppTeam && judge.institutionId === oppTeam.institutionId)
          ) {
            warnings.push(`${debateLabel}: Judge has institution conflict.`);
          }
        }
      }

      // Even panel warning (total judges = chair + panelists)
      if (allJudgeIds.length > 0 && allJudgeIds.length % 2 === 0) {
        warnings.push(`${debateLabel}: Even number of judges (${allJudgeIds.length}).`);
      }
    }
  }

  return { errors, warnings };
}

// =============================================================================
// Save Function
// =============================================================================

/**
 * Save manual pairings edits for a round.
 *
 * Only allowed when round is in DRAFT status.
 * Replaces all existing debates and judge assignments.
 */
export async function savePairings(
  roundId: string,
  tournamentId: string,
  debates: DebatePairingInput[]
): Promise<SavePairingsResult> {
  // Step 1: Verify round exists and is DRAFT
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    select: { id: true, status: true, tournamentId: true },
  });

  if (!round) {
    return { success: false, debatesSaved: 0, warnings: [], errors: ['Round not found'] };
  }

  if (round.tournamentId !== tournamentId) {
    return { success: false, debatesSaved: 0, warnings: [], errors: ['Round does not belong to this tournament'] };
  }

  if (round.status !== TournamentRoundStatus.DRAFT) {
    return { success: false, debatesSaved: 0, warnings: [], errors: ['Can only edit pairings for DRAFT rounds'] };
  }

  // Step 2: Load valid teams and judges for this tournament
  const [teams, judges] = await Promise.all([
    prisma.tournamentTeam.findMany({
      where: { tournamentId },
      select: { id: true, institutionId: true },
    }),
    prisma.tournamentParticipant.findMany({
      where: { tournamentId, role: TournamentParticipantRole.JUDGE },
      select: { id: true, institutionId: true },
    }),
  ]);

  const validTeamIds = new Set(teams.map((t) => t.id));
  const validJudgeIds = new Set(judges.map((j) => j.id));

  const teamLookup = new Map<string, TeamLookup>();
  teams.forEach((t) => teamLookup.set(t.id, t));

  const judgeLookup = new Map<string, JudgeLookup>();
  judges.forEach((j) => judgeLookup.set(j.id, j));

  // Step 3: Validate
  const { errors, warnings } = validatePairings(
    debates,
    validTeamIds,
    validJudgeIds,
    teamLookup,
    judgeLookup
  );

  if (errors.length > 0) {
    return { success: false, debatesSaved: 0, warnings, errors };
  }

  // Step 4: Save in transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing debates for this round (cascades to judges)
    await tx.tournamentDebate.deleteMany({ where: { roundId } });

    // Create new debates with chair + panelist judges
    for (const debate of debates) {
      const judgeRecords: { participantId: string; role: JudgeRole }[] = [];

      if (debate.chairJudgeParticipantId) {
        judgeRecords.push({
          participantId: debate.chairJudgeParticipantId,
          role: JudgeRole.CHAIR,
        });
      }

      for (const panelistId of debate.panelistJudgeParticipantIds) {
        judgeRecords.push({
          participantId: panelistId,
          role: JudgeRole.PANELIST,
        });
      }

      await tx.tournamentDebate.create({
        data: {
          roundId,
          order: debate.order,
          propTeamId: debate.propTeamId,
          oppTeamId: debate.oppTeamId,
          isBye: debate.isBye,
          venueId: debate.venueId ?? null,
          judges: {
            create: judgeRecords,
          },
        },
      });
    }
  });

  return {
    success: true,
    debatesSaved: debates.length,
    warnings,
    errors: [],
  };
}
