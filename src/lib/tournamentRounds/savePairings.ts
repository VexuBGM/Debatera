/**
 * Save Pairings Logic
 *
 * Handles manual editing of round pairings with full validation.
 */

import { prisma } from '@/lib/prisma';
import { TournamentRoundStatus, TournamentParticipantRole } from '@prisma/client';
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

  // Track which teams and judges are used
  const usedTeamIds = new Set<string>();
  const usedJudgeIds = new Set<string>();

  for (let i = 0; i < debates.length; i++) {
    const debate = debates[i];
    const debateLabel = `Debate ${i + 1}`;

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
      if (debate.judgeParticipantIds.length > 0) {
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
      if (debate.judgeParticipantIds.length === 0) {
        errors.push(`${debateLabel}: Must have at least 1 judge.`);
      }
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

    // Validate judge IDs and check for duplicates
    for (const judgeId of debate.judgeParticipantIds) {
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

      // Judge conflicts
      for (const judgeId of debate.judgeParticipantIds) {
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

      // Even panel warning
      if (debate.judgeParticipantIds.length > 0 && debate.judgeParticipantIds.length % 2 === 0) {
        warnings.push(`${debateLabel}: Even number of judges (${debate.judgeParticipantIds.length}).`);
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

    // Create new debates with judges
    for (const debate of debates) {
      await tx.tournamentDebate.create({
        data: {
          roundId,
          order: debate.order,
          propTeamId: debate.propTeamId,
          oppTeamId: debate.oppTeamId,
          isBye: debate.isBye,
          judges: {
            create: debate.judgeParticipantIds.map((participantId) => ({
              participantId,
            })),
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
