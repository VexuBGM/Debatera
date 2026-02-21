/**
 * Shared institution helpers for tournament guest-entry flows.
 *
 * All functions here are server-only (they use prisma directly).
 */

import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────────────
// Name normalisation
// ─────────────────────────────────────────────────────

/**
 * Normalise an institution name:
 *  - trim leading/trailing whitespace
 *  - collapse runs of whitespace to a single space
 */
export function normalizeInstitutionName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

// ─────────────────────────────────────────────────────
// Ensure institution exists + approved for tournament
// ─────────────────────────────────────────────────────

export interface EnsureInstitutionResult {
  institutionId: string;
  institutionName: string;
  created: boolean; // true if a brand-new Institution row was inserted
}

/**
 * Resolve an institution for a tournament.
 *
 * Accepts EITHER an existing `institutionId` OR a `institutionName` (for inline create).
 * - If `institutionId` is given, validates it exists.
 * - If `institutionName` is given, upserts `Institution` by normalised name.
 * - In both cases ensures a `TournamentInstitution` row exists with status APPROVED.
 *
 * @param tournamentId  The tournament to link to
 * @param currentUserId The Clerk user performing the action (used as requestedByUserId)
 * @param opts          Provide one of `institutionId` or `institutionName`
 */
export async function ensureInstitutionForTournament(
  tournamentId: string,
  currentUserId: string,
  opts: { institutionId?: string; institutionName?: string },
): Promise<EnsureInstitutionResult> {
  let institutionId: string;
  let institutionName: string;
  let created = false;

  if (opts.institutionId) {
    // ── Existing institution by ID ──────────────────
    const inst = await prisma.institution.findUnique({
      where: { id: opts.institutionId },
      select: { id: true, name: true },
    });
    if (!inst) throw new Error('Institution not found');
    institutionId = inst.id;
    institutionName = inst.name;
  } else if (opts.institutionName) {
    // ── Inline create / upsert by name ──────────────
    const name = normalizeInstitutionName(opts.institutionName);
    if (name.length === 0) throw new Error('Institution name cannot be empty');
    if (name.length > 200) throw new Error('Institution name too long');

    const inst = await prisma.institution.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    institutionId = inst.id;
    institutionName = inst.name;
    created = !opts.institutionId; // technically always true in this branch
  } else {
    throw new Error('Either institutionId or institutionName must be provided');
  }

  // ── Ensure TournamentInstitution APPROVED ────────
  await prisma.tournamentInstitution.upsert({
    where: {
      tournamentId_institutionId: {
        tournamentId,
        institutionId,
      },
    },
    update: { status: 'APPROVED' },
    create: {
      tournamentId,
      institutionId,
      status: 'APPROVED',
      requestedByUserId: currentUserId,
    },
  });

  return { institutionId, institutionName, created };
}

// ─────────────────────────────────────────────────────
// "Independent Adjudicators" per-tournament institution
// ─────────────────────────────────────────────────────

const INDEPENDENT_ADJ_NAME = 'Independent Adjudicators';

/**
 * Ensure the per-tournament "Independent Adjudicators" institution exists
 * and is APPROVED. Used as a default for judges.
 */
export async function ensureIndependentAdjudicatorsInstitution(
  tournamentId: string,
  currentUserId: string,
): Promise<string> {
  const { institutionId } = await ensureInstitutionForTournament(
    tournamentId,
    currentUserId,
    { institutionName: INDEPENDENT_ADJ_NAME },
  );
  return institutionId;
}

/**
 * Returns the approved institutions list for a tournament.
 */
export async function getApprovedInstitutions(tournamentId: string) {
  const rows = await prisma.tournamentInstitution.findMany({
    where: { tournamentId, status: 'APPROVED' },
    include: { institution: { select: { id: true, name: true } } },
    orderBy: { institution: { name: 'asc' } },
  });
  return rows.map((r) => r.institution);
}
