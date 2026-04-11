import { testPrisma } from '@tests/setup/prisma-test-client';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { createBallot } from '@tests/factories/ballot.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';

export async function createSingleDebateScenario(status: 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS') {
  const organizer = await createUser({ id: 'organizer_user', email: 'organizer@example.com' });
  const judgeUser = await createUser({ id: 'judge_user', email: 'judge@example.com' });
  const institution = await createInstitution({ name: 'Scenario Institution' });
  const tournament = await createTournament({ createdByUserId: organizer.id });
  const prop = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: 'Proposition Team',
    memberCount: 3,
  });
  const opp = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: 'Opposition Team',
    memberCount: 3,
  });
  const judgeParticipant = await createTournamentParticipant({
    tournamentId: tournament.id,
    institutionId: institution.id,
    userId: judgeUser.id,
    role: 'JUDGE',
  });
  const round = await createRound({ tournamentId: tournament.id, status });
  const debate = await createDebate({
    roundId: round.id,
    propTeamId: prop.team.id,
    oppTeamId: opp.team.id,
    order: 0,
  });
  const judgeAssignment = await createJudgeAssignment({
    debateId: debate.id,
    participantId: judgeParticipant.id,
    role: 'CHAIR',
  });
  const ballot = await createBallot({
    debateId: debate.id,
    adjudicatorId: judgeAssignment.id,
  });

  return {
    prisma: testPrisma,
    organizer,
    judgeUser,
    institution,
    tournament,
    prop,
    opp,
    judgeParticipant,
    round,
    debate,
    judgeAssignment,
    ballot,
  };
}
