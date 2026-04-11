import { describe, expect, it } from 'vitest';
import { computeDebateResult } from '@/lib/ballots/computeResult';
import { buildValidBallotSubmission, createBallot } from '@tests/factories/ballot.factory';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createDebate, createJudgeAssignment, createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { testPrisma } from '@tests/setup/prisma-test-client';

async function createResultScenario(judgeCount: number, roundStatus: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS') {
  const organizer = await createUser({ id: `organizer_${judgeCount}` });
  const institution = await createInstitution({ name: `Result Institution ${judgeCount}` });
  const tournament = await createTournament({ createdByUserId: organizer.id });
  const prop = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: `Prop ${judgeCount}`,
  });
  const opp = await createTournamentTeam({
    tournamentId: tournament.id,
    institutionId: institution.id,
    createdByUserId: organizer.id,
    name: `Opp ${judgeCount}`,
  });
  const round = await createRound({ tournamentId: tournament.id, status: roundStatus });
  const debate = await createDebate({
    roundId: round.id,
    propTeamId: prop.team.id,
    oppTeamId: opp.team.id,
  });

  const assignments = [];
  const ballots = [];
  for (let index = 0; index < judgeCount; index += 1) {
    const judgeUser = await createUser({ id: `judge_${judgeCount}_${index}` });
    const participant = await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: institution.id,
      userId: judgeUser.id,
      role: 'JUDGE',
    });
    const assignment = await createJudgeAssignment({
      debateId: debate.id,
      participantId: participant.id,
      role: index === 0 ? 'CHAIR' : 'PANELIST',
    });
    assignments.push(assignment);
    ballots.push(await createBallot({ debateId: debate.id, adjudicatorId: assignment.id }));
  }

  return { tournament, prop, opp, round, debate, assignments, ballots };
}

async function submitStoredBallot(ballotId: string, vote: 'PROPOSITION' | 'OPPOSITION') {
  const submission = buildValidBallotSubmission(vote);

  await testPrisma.ballot.update({
    where: { id: ballotId },
    data: {
      status: 'SUBMITTED',
      vote,
      propTotal: vote === 'PROPOSITION' ? 266 : 255,
      oppTotal: vote === 'PROPOSITION' ? 258 : 266,
      submittedAt: new Date(),
      speeches: {
        updateMany: submission.speeches.map((speech) => ({
          where: { role: speech.role },
          data: {
            speakerName: speech.speakerId,
            score: speech.score,
          },
        })),
      },
    },
  });
}

describe('computeDebateResult integration', () => {
  it('waits until all ballots in a normal panel have been submitted', async () => {
    const scenario = await createResultScenario(3);
    await submitStoredBallot(scenario.ballots[0].id, 'PROPOSITION');
    await submitStoredBallot(scenario.ballots[1].id, 'PROPOSITION');

    expect(await computeDebateResult(scenario.debate.id)).toBeNull();
  });

  it('computes a 2-1 panel result by majority vote', async () => {
    const scenario = await createResultScenario(3);
    await submitStoredBallot(scenario.ballots[0].id, 'OPPOSITION');
    await submitStoredBallot(scenario.ballots[1].id, 'PROPOSITION');
    await submitStoredBallot(scenario.ballots[2].id, 'PROPOSITION');

    const result = await computeDebateResult(scenario.debate.id);

    expect(result).toMatchObject({
      winningSide: 'PROPOSITION',
      winningTeamId: scenario.prop.team.id,
      voteProp: 2,
      voteOpp: 1,
      decidedByChair: false,
    });
  });

  it('uses chair vote for an even-panel tie', async () => {
    const scenario = await createResultScenario(2);
    await submitStoredBallot(scenario.ballots[0].id, 'OPPOSITION');
    await submitStoredBallot(scenario.ballots[1].id, 'PROPOSITION');

    const result = await computeDebateResult(scenario.debate.id);

    expect(result).toMatchObject({
      winningSide: 'OPPOSITION',
      winningTeamId: scenario.opp.team.id,
      voteProp: 1,
      voteOpp: 1,
      decidedByChair: true,
    });
  });

  it('allows the intentional completed-round chair-only fallback for a 2-judge panel', async () => {
    const scenario = await createResultScenario(2, 'COMPLETED');
    await submitStoredBallot(scenario.ballots[0].id, 'PROPOSITION');

    const result = await computeDebateResult(scenario.debate.id);

    expect(result).toMatchObject({
      winningSide: 'PROPOSITION',
      voteProp: 1,
      voteOpp: 0,
    });
  });
});
