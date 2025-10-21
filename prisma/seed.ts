import { PrismaClient, AppRole, DebateStatus, CallRole, DebateSide, OrganizerRole, RoundStage } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Upsert users
  const adminUser = await prisma.user.upsert({
    where: { clerkId: 'clerk_admin_mock_123' },
    update: {},
    create: {
      clerkId: 'clerk_admin_mock_123',
      username: 'admin_user',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      appRole: AppRole.ADMIN,
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { clerkId: 'clerk_user_mock_456' },
    update: {},
    create: {
      clerkId: 'clerk_user_mock_456',
      username: 'regular_user',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
      appRole: AppRole.USER,
    },
  });

  const debater1 = await prisma.user.upsert({
    where: { clerkId: 'clerk_debater1_789' },
    update: {},
    create: {
      clerkId: 'clerk_debater1_789',
      username: 'debater_one',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=debater1',
      appRole: AppRole.USER,
    },
  });

  const debater2 = await prisma.user.upsert({
    where: { clerkId: 'clerk_debater2_101' },
    update: {},
    create: {
      clerkId: 'clerk_debater2_101',
      username: 'debater_two',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=debater2',
      appRole: AppRole.USER,
    },
  });

  const judge1 = await prisma.user.upsert({
    where: { clerkId: 'clerk_judge1_202' },
    update: {},
    create: {
      clerkId: 'clerk_judge1_202',
      username: 'judge_alpha',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=judge1',
      appRole: AppRole.USER,
    },
  });

  const judge2 = await prisma.user.upsert({
    where: { clerkId: 'clerk_judge2_303' },
    update: {},
    create: {
      clerkId: 'clerk_judge2_303',
      username: 'judge_beta',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=judge2',
      appRole: AppRole.USER,
    },
  });

  console.log('Created users:', { adminUser, regularUser, debater1, debater2, judge1, judge2 });

  // 2. Create tournaments
  const unverifiedTournament = await prisma.tournament.create({
    data: {
      name: 'Community Debate Cup 2025',
      description: 'A friendly debate tournament for the community',
      isVerified: false,
      createdById: regularUser.id,
    },
  });

  const verifiedTournament = await prisma.tournament.create({
    data: {
      name: 'Official Championship Series',
      description: 'The official championship series verified by administrators',
      isVerified: true,
      createdById: adminUser.id,
    },
  });

  console.log('Created tournaments:', { unverifiedTournament, verifiedTournament });

  // 3. Create teams
  const teamProp = await prisma.team.create({
    data: {
      name: 'Proposition Warriors',
      tournamentId: verifiedTournament.id,
    },
  });

  const teamOpp = await prisma.team.create({
    data: {
      name: 'Opposition Fighters',
      tournamentId: verifiedTournament.id,
    },
  });

  console.log('Created teams:', { teamProp, teamOpp });

  // 4. Add team members
  await prisma.teamMember.create({
    data: {
      teamId: teamProp.id,
      userId: debater1.id,
    },
  });

  await prisma.teamMember.create({
    data: {
      teamId: teamOpp.id,
      userId: debater2.id,
    },
  });

  console.log('Added team members');

  // 5. Create a debate
  const debate = await prisma.debate.create({
    data: {
      tournamentId: verifiedTournament.id,
      propTeamId: teamProp.id,
      oppTeamId: teamOpp.id,
      scheduledAt: new Date('2025-11-01T18:00:00Z'),
      status: DebateStatus.ENDED,
      winningSide: null, // Will be set after feedback
    },
  });

  console.log('Created debate:', debate);

  // 6. Add debate participants (debaters)
  await prisma.debateParticipant.create({
    data: {
      debateId: debate.id,
      userId: debater1.id,
      role: CallRole.DEBATER,
      side: DebateSide.PROP,
      speakOrder: 1,
    },
  });

  await prisma.debateParticipant.create({
    data: {
      debateId: debate.id,
      userId: debater2.id,
      role: CallRole.DEBATER,
      side: DebateSide.OPP,
      speakOrder: 1,
    },
  });

  // Add judges
  await prisma.debateParticipant.create({
    data: {
      debateId: debate.id,
      userId: judge1.id,
      role: CallRole.JUDGE,
      side: DebateSide.NEUTRAL,
      speakOrder: null,
    },
  });

  await prisma.debateParticipant.create({
    data: {
      debateId: debate.id,
      userId: judge2.id,
      role: CallRole.JUDGE,
      side: DebateSide.NEUTRAL,
      speakOrder: null,
    },
  });

  // Add a spectator
  await prisma.debateParticipant.create({
    data: {
      debateId: debate.id,
      userId: regularUser.id,
      role: CallRole.SPECTATOR,
      side: DebateSide.NEUTRAL,
      speakOrder: null,
    },
  });

  console.log('Added debate participants');

  // 7. Add judge feedback
  await prisma.judgeFeedback.create({
    data: {
      debateId: debate.id,
      judgeId: judge1.id,
      notes: 'Strong arguments from the proposition side. Well-structured rebuttals.',
      winnerSide: DebateSide.PROP,
    },
  });

  await prisma.judgeFeedback.create({
    data: {
      debateId: debate.id,
      judgeId: judge2.id,
      notes: 'Opposition presented compelling evidence, but proposition had better delivery.',
      winnerSide: DebateSide.PROP,
    },
  });

  console.log('Added judge feedback');

  // 8. Set final decision
  await prisma.debate.update({
    where: { id: debate.id },
    data: { winningSide: DebateSide.PROP },
  });

  console.log('Set final winning side on debate');

  // 9. Create a tournament with rounds
  console.log('Creating tournament with rounds...');

  const tournamentWithRounds = await prisma.tournament.create({
    data: {
      name: 'National Championship 2025',
      description: 'Multi-round tournament with power pairing',
      isVerified: true,
      createdById: adminUser.id,
    },
  });

  // Add organizer
  await prisma.tournamentOrganizer.create({
    data: {
      tournamentId: tournamentWithRounds.id,
      userId: regularUser.id,
      role: OrganizerRole.ORGANIZER,
    },
  });

  // Create multiple teams
  const teams = [];
  for (let i = 1; i <= 8; i++) {
    const team = await prisma.team.create({
      data: {
        name: `Team ${i}`,
        tournamentId: tournamentWithRounds.id,
      },
    });
    teams.push(team);
  }

  // Create more users for team members
  const teamMembers = [];
  for (let i = 1; i <= 8; i++) {
    const member = await prisma.user.upsert({
      where: { clerkId: `clerk_member${i}_${1000 + i}` },
      update: {},
      create: {
        clerkId: `clerk_member${i}_${1000 + i}`,
        username: `member_${i}`,
        imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=member${i}`,
        appRole: AppRole.USER,
      },
    });
    teamMembers.push(member);

    // Add member to team
    await prisma.teamMember.create({
      data: {
        teamId: teams[i - 1].id,
        userId: member.id,
      },
    });
  }

  // Create round 1
  const round1 = await prisma.round.create({
    data: {
      tournamentId: tournamentWithRounds.id,
      number: 1,
      stage: RoundStage.PRELIM,
      isPublished: true,
    },
  });

  // Create debates for round 1 (random pairings)
  const round1Debates = [];
  for (let i = 0; i < 4; i++) {
    const debate = await prisma.debate.create({
      data: {
        tournamentId: tournamentWithRounds.id,
        roundId: round1.id,
        propTeamId: teams[i * 2].id,
        oppTeamId: teams[i * 2 + 1].id,
        status: DebateStatus.ENDED,
        winningSide: i % 2 === 0 ? DebateSide.PROP : DebateSide.OPP,
      },
    });
    round1Debates.push(debate);

    // Add judge to debate
    await prisma.debateParticipant.create({
      data: {
        debateId: debate.id,
        userId: i < 2 ? judge1.id : judge2.id,
        role: CallRole.JUDGE,
        side: DebateSide.NEUTRAL,
      },
    });
  }

  console.log('Created tournament with rounds:', {
    tournament: tournamentWithRounds,
    teams: teams.length,
    round1Debates: round1Debates.length,
  });

  console.log('Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
