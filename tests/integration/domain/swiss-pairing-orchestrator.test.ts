import { describe, expect, it } from 'vitest';
import { generateSwissPairings } from '@/lib/pairings/generateSwissPairings';
import { createInstitution } from '@tests/factories/institution.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createRound } from '@tests/factories/round.factory';
import { createTournamentTeam } from '@tests/factories/team.factory';
import { createTournament } from '@tests/factories/tournament.factory';
import { createUser } from '@tests/factories/user.factory';
import { testPrisma } from '@tests/setup/prisma-test-client';

async function createSwissFixture(options: { teamCount: number; judgeCount: number; prefix: string }) {
  const organizer = await createUser({ id: `${options.prefix}_organizer` });
  const tournament = await createTournament({ createdByUserId: organizer.id });
  const round = await createRound({
    tournamentId: tournament.id,
    number: 1,
    name: `${options.prefix} Round 1`,
    status: 'DRAFT',
  });

  const teams = [];
  for (let index = 0; index < options.teamCount; index += 1) {
    const institution = await createInstitution({ id: `${options.prefix}_team_inst_${index}`, name: `${options.prefix} Team Institution ${index}` });
    teams.push(
      await createTournamentTeam({
        tournamentId: tournament.id,
        institutionId: institution.id,
        createdByUserId: organizer.id,
        name: `${options.prefix} Team ${index + 1}`,
      })
    );
  }

  const judges = [];
  for (let index = 0; index < options.judgeCount; index += 1) {
    const institution = await createInstitution({ id: `${options.prefix}_judge_inst_${index}`, name: `${options.prefix} Judge Institution ${index}` });
    judges.push(
      await createTournamentParticipant({
        tournamentId: tournament.id,
        institutionId: institution.id,
        userId: (await createUser({ id: `${options.prefix}_judge_user_${index}` })).id,
        role: 'JUDGE',
      })
    );
  }

  return { organizer, tournament, round, teams, judges };
}

describe('Swiss pairing orchestrator', () => {
  it('generates pairings for round 1 and persists the correct number of debates', async () => {
    const fixture = await createSwissFixture({
      teamCount: 4,
      judgeCount: 6,
      prefix: 'swiss_orchestrator_round1',
    });

    const result = await generateSwissPairings({
      tournamentId: fixture.tournament.id,
      roundId: fixture.round.id,
    });

    expect(result.pairings).toHaveLength(2);
    expect(result.debatesCreated).toBe(2);
    await expect(
      testPrisma.tournamentDebate.count({ where: { roundId: fixture.round.id } })
    ).resolves.toBe(2);
  });

  it('creates draft ballots for each judge-debate assignment after generating pairings', async () => {
    const fixture = await createSwissFixture({
      teamCount: 4,
      judgeCount: 6,
      prefix: 'swiss_orchestrator_ballots',
    });

    await generateSwissPairings({
      tournamentId: fixture.tournament.id,
      roundId: fixture.round.id,
    });

    const assignments = await testPrisma.tournamentDebateJudge.findMany({
      where: { debate: { roundId: fixture.round.id } },
      select: { id: true },
    });

    await expect(
      testPrisma.ballot.count({ where: { debate: { roundId: fixture.round.id } } })
    ).resolves.toBe(assignments.length);
  });

  it('dry-run mode returns pairings without writing debates to the database', async () => {
    const fixture = await createSwissFixture({
      teamCount: 4,
      judgeCount: 6,
      prefix: 'swiss_orchestrator_dry_run',
    });

    const result = await generateSwissPairings({
      tournamentId: fixture.tournament.id,
      roundId: fixture.round.id,
      dryRun: true,
    });

    expect(result.pairings).toHaveLength(2);
    expect(result.debatesCreated).toBe(2);
    await expect(
      testPrisma.tournamentDebate.count({ where: { roundId: fixture.round.id } })
    ).resolves.toBe(0);
  });

  it('with 8 teams creates 4 debates', async () => {
    const fixture = await createSwissFixture({
      teamCount: 8,
      judgeCount: 8,
      prefix: 'swiss_orchestrator_eight_teams',
    });

    const result = await generateSwissPairings({
      tournamentId: fixture.tournament.id,
      roundId: fixture.round.id,
    });

    expect(result.pairings).toHaveLength(4);
    await expect(
      testPrisma.tournamentDebate.count({ where: { roundId: fixture.round.id } })
    ).resolves.toBe(4);
  });

  it('after round 1 results, round 2 uses match points from round 1 (verifies DB feed)', async () => {
    const organizer = await createUser({ id: 'swiss_orchestrator_round2_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const teams = [];

    for (let index = 0; index < 4; index += 1) {
      const institution = await createInstitution({
        id: `swiss_orchestrator_round2_team_inst_${index}`,
        name: `Swiss Round 2 Team Institution ${index}`,
      });
      teams.push(
        await createTournamentTeam({
          tournamentId: tournament.id,
          institutionId: institution.id,
          createdByUserId: organizer.id,
          name: `Swiss Round 2 Team ${index + 1}`,
        })
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const institution = await createInstitution({
        id: `swiss_orchestrator_round2_judge_inst_${index}`,
        name: `Swiss Round 2 Judge Institution ${index}`,
      });
      await createTournamentParticipant({
        tournamentId: tournament.id,
        institutionId: institution.id,
        userId: (await createUser({ id: `swiss_orchestrator_round2_judge_user_${index}` })).id,
        role: 'JUDGE',
      });
    }

    const roundOne = await createRound({
      tournamentId: tournament.id,
      number: 1,
      name: 'Swiss Round 1',
      status: 'DRAFT',
    });
    const roundTwo = await createRound({
      tournamentId: tournament.id,
      number: 2,
      name: 'Swiss Round 2',
      status: 'DRAFT',
    });

    await generateSwissPairings({
      tournamentId: tournament.id,
      roundId: roundOne.id,
    });

    const roundOneDebates = await testPrisma.tournamentDebate.findMany({
      where: { roundId: roundOne.id },
      orderBy: { order: 'asc' },
      select: { id: true, propTeamId: true, oppTeamId: true },
    });

    const winningTeamIds = new Set<string>();
    for (const debate of roundOneDebates) {
      winningTeamIds.add(debate.propTeamId!);
      await testPrisma.debateResult.create({
        data: {
          debateId: debate.id,
          winningSide: 'PROPOSITION',
          winningTeamId: debate.propTeamId!,
          propTotalAvg: 266,
          oppTotalAvg: 258,
          voteProp: 1,
          voteOpp: 0,
          decidedByChair: false,
        },
      });
    }

    await testPrisma.tournamentRound.update({
      where: { id: roundOne.id },
      data: { status: 'COMPLETED' },
    });

    const result = await generateSwissPairings({
      tournamentId: tournament.id,
      roundId: roundTwo.id,
    });

    expect(result.pairings).toHaveLength(2);

    const roundTwoPairings = result.pairings
      .filter((pairing) => !pairing.isBye)
      .map((pairing) => [pairing.propTeamId, pairing.oppTeamId!]);

    expect(roundTwoPairings).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(Array.from(winningTeamIds)),
      ])
    );

    const losingTeamIds = teams
      .map((team) => team.team.id)
      .filter((teamId) => !winningTeamIds.has(teamId));

    expect(roundTwoPairings).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(losingTeamIds),
      ])
    );
  });

  it('returns warnings for institution conflicts that cannot be avoided', async () => {
    const organizer = await createUser({ id: 'swiss_orchestrator_warning_organizer' });
    const tournament = await createTournament({ createdByUserId: organizer.id });
    const propInstitution = await createInstitution({
      id: 'swiss_orchestrator_warning_prop_inst',
      name: 'Swiss Warning Prop Institution',
    });
    const oppInstitution = await createInstitution({
      id: 'swiss_orchestrator_warning_opp_inst',
      name: 'Swiss Warning Opp Institution',
    });

    await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: propInstitution.id,
      createdByUserId: organizer.id,
      name: 'Swiss Warning Prop Team',
    });
    await createTournamentTeam({
      tournamentId: tournament.id,
      institutionId: oppInstitution.id,
      createdByUserId: organizer.id,
      name: 'Swiss Warning Opp Team',
    });

    await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: propInstitution.id,
      userId: (await createUser({ id: 'swiss_orchestrator_warning_judge_user_1' })).id,
      role: 'JUDGE',
    });
    await createTournamentParticipant({
      tournamentId: tournament.id,
      institutionId: oppInstitution.id,
      userId: (await createUser({ id: 'swiss_orchestrator_warning_judge_user_2' })).id,
      role: 'JUDGE',
    });

    const round = await createRound({
      tournamentId: tournament.id,
      number: 1,
      name: 'Swiss Warning Round',
      status: 'DRAFT',
    });

    const result = await generateSwissPairings({
      tournamentId: tournament.id,
      roundId: round.id,
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('No eligible chair available'),
      ])
    );
  });
});
