/**
 * Tournament Standings Authorization Policy
 *
 * Determines who is allowed to view tournament standings.
 *
 * MVP rule – allow if the viewer is:
 *  1. the tournament creator (organizer), OR
 *  2. a tournament participant (debater / judge), OR
 *  3. a member of an institution that is APPROVED in the tournament
 */

import {
  isTournamentCreator,
  isTournamentParticipant,
  isApprovedInstitutionMember,
} from './queries';

export async function canViewTournamentStandings(
  viewerUserId: string,
  tournamentId: string
): Promise<boolean> {
  // Fast path: tournament creator
  if (await isTournamentCreator(viewerUserId, tournamentId)) return true;

  // Direct participant (debater or judge)
  if (await isTournamentParticipant(viewerUserId, tournamentId)) return true;

  // Member of an approved institution
  if (await isApprovedInstitutionMember(viewerUserId, tournamentId)) return true;

  return false;
}
