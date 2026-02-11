/**
 * Institution Conflict Checks
 *
 * Shared utilities for detecting institution conflicts between judges and teams.
 * Used by auto-allocation, save-time validation, and the UI.
 *
 * Institution conflict = a judge shares institution with either the prop or opp team.
 */

// =============================================================================
// Core check
// =============================================================================

/**
 * Returns `true` when a judge's institution matches either team's institution.
 *
 * `null` / `undefined` institution IDs are treated as "no institution" and
 * therefore never conflict.
 */
export function hasInstitutionConflict(
  judgeInstitutionId: string | null | undefined,
  propInstitutionId: string | null | undefined,
  oppInstitutionId: string | null | undefined
): boolean {
  if (!judgeInstitutionId) return false;
  if (propInstitutionId && judgeInstitutionId === propInstitutionId) return true;
  if (oppInstitutionId && judgeInstitutionId === oppInstitutionId) return true;
  return false;
}

// =============================================================================
// Higher-level helpers (work with objects matching the editor shapes)
// =============================================================================

/** Minimal judge shape needed for the eligibility check. */
export interface JudgeForConflict {
  id: string;
  institutionId: string;
}

/** Minimal debate shape needed for the eligibility check. */
export interface DebateForConflict {
  propTeamInstitutionId?: string | null;
  oppTeamInstitutionId?: string | null;
}

/**
 * Returns `true` when the judge has **no** institution conflict with the debate.
 */
export function isJudgeEligibleForDebate(
  judge: JudgeForConflict,
  debate: DebateForConflict
): boolean {
  return !hasInstitutionConflict(
    judge.institutionId,
    debate.propTeamInstitutionId ?? null,
    debate.oppTeamInstitutionId ?? null
  );
}

// =============================================================================
// Structured conflict result (for save-time validation)
// =============================================================================

export interface InstitutionConflictDetail {
  debateId: string;
  judgeId: string;
  judgeInstitutionId: string;
  teamInstitutionIds: string[];
}
