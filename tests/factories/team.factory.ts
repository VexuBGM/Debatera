import type { PrismaClient, TournamentTeam } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { createTournamentParticipant } from './participant.factory';
import { createTournament } from './tournament.factory';
import { createInstitution } from './institution.factory';
import { createUser } from './user.factory';

let teamCounter = 0;

export async function createTournamentTeam(
  overrides: Partial<TournamentTeam> & {
    tournamentId?: string;
    institutionId?: string;
    createdByUserId?: string;
    memberCount?: number;
  } = {},
  prisma: PrismaClient = testPrisma
) {
  teamCounter += 1;
  const tournamentId = overrides.tournamentId ?? (await createTournament({}, prisma)).id;
  const institutionId = overrides.institutionId ?? (await createInstitution({}, prisma)).id;
  const createdByUserId = overrides.createdByUserId ?? (await createUser({}, prisma)).id;

  const team = await prisma.tournamentTeam.create({
    data: {
      id: overrides.id,
      tournamentId,
      institutionId,
      name: overrides.name ?? `Team ${teamCounter}`,
      feedbackCode: overrides.feedbackCode ?? `${String(teamCounter).padStart(6, '0')}`,
      createdByUserId,
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    },
  });

  const memberCount = overrides.memberCount ?? 3;
  const members = [];
  for (let index = 0; index < memberCount; index += 1) {
    const participant = await createTournamentParticipant(
      {
        tournamentId,
        institutionId,
        role: 'DEBATER',
      },
      prisma
    );
    const member = await prisma.tournamentTeamMember.create({
      data: {
        teamId: team.id,
        participantId: participant.id,
      },
      include: { participant: { include: { user: true } } },
    });
    members.push(member);
  }

  return { team, members };
}
