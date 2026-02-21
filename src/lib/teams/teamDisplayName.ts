/**
 * Team Display Name Utility
 *
 * When the tournament setting `showDebaterNames` is enabled, teams are displayed
 * using the names of their debaters (e.g. "Alice & Bob") instead of the team name.
 */

import { displayNameFromDbUser, type DbUserLike } from '@/lib/users/displayName';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal member shape — matches the data already included by getTeamsForTournament. */
export interface TeamMemberLike {
  participant: {
    user: DbUserLike | null;
  };
}

/** Minimal team shape with optional members. */
export interface TeamLike {
  name: string;
  members?: TeamMemberLike[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the display name for a team based on the tournament setting.
 *
 * - `showDebaterNames === false` → returns `team.name` (default behaviour).
 * - `showDebaterNames === true`  → returns debater names joined with " & ",
 *    falling back to `team.name` if no members are available.
 */
export function getTeamDisplayName(
  team: TeamLike | null | undefined,
  showDebaterNames: boolean
): string {
  if (!team) return 'Unknown Team';

  if (!showDebaterNames) return team.name;

  const members = team.members;
  if (!members || members.length === 0) return team.name;

  const names = members
    .map((m) => displayNameFromDbUser(m.participant?.user))
    .filter((n) => n !== 'Unknown User');

  return names.length > 0 ? names.join(' & ') : team.name;
}
