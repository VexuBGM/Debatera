/**
 * Tournament Seed Script
 * 
 * This script seeds the database with sample tournament data
 * Run with: npx tsx prisma/seed-tournament.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding tournament data...');

  // Find existing users (created by main seed)
  const users = await prisma.user.findMany({
    take: 4,
  });

  if (users.length < 2) {
    console.error('❌ Need at least 2 users. Run main seed first: npx prisma db seed');
    return;
  }

  const [admin, user1, user2, user3] = users;

  // Create tournament
  console.log('📋 Creating tournament...');
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Sample Debate Championship 2025',
      description: 'A sample tournament to demonstrate Tabbycat features',
      status: 'REGISTRATION',
      registrationOpen: true,
      startDate: new Date('2025-12-01'),
      endDate: new Date('2025-12-03'),
      createdById: admin.id,
    },
  });

  console.log('✅ Tournament created:', tournament.name);

  // Create venues
  console.log('🏛️ Creating venues...');
  const venue1 = await prisma.venue.create({
    data: {
      tournamentId: tournament.id,
      name: 'Main Hall',
      priority: 10,
    },
  });

  const venue2 = await prisma.venue.create({
    data: {
      tournamentId: tournament.id,
      name: 'Conference Room A',
      priority: 5,
      url: 'https://meet.example.com/room-a',
    },
  });

  console.log('✅ Created venues:', venue1.name, venue2.name);

  // Create teams
  console.log('👥 Creating teams...');
  const team1 = await prisma.team.create({
    data: {
      name: 'Alpha Debaters',
      tournamentId: tournament.id,
      isRegistered: true,
      speakerNames: 'John Doe, Jane Smith',
    },
  });

  const team2 = await prisma.team.create({
    data: {
      name: 'Beta Speakers',
      tournamentId: tournament.id,
      isRegistered: true,
      speakerNames: 'Bob Wilson, Alice Brown',
    },
  });

  console.log('✅ Created teams:', team1.name, team2.name);

  // Add team members
  if (user1) {
    await prisma.teamMember.create({
      data: { teamId: team1.id, userId: user1.id },
    });
  }

  if (user2) {
    await prisma.teamMember.create({
      data: { teamId: team2.id, userId: user2.id },
    });
  }

  // Register adjudicators
  console.log('⚖️ Registering adjudicators...');
  const adj1 = await prisma.adjudicator.create({
    data: {
      tournamentId: tournament.id,
      userId: admin.id,
      rating: 8.5,
      isIndependent: true,
    },
  });

  let adj2;
  if (user3) {
    adj2 = await prisma.adjudicator.create({
      data: {
        tournamentId: tournament.id,
        userId: user3.id,
        rating: 7.0,
        isIndependent: false,
      },
    });
  }

  console.log('✅ Registered adjudicators');

  // Create rounds
  console.log('🎯 Creating rounds...');
  const round1 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      name: 'Preliminary 1',
      seq: 1,
      stage: 'PRELIMINARY',
      isDrawReleased: true,
      isMotionReleased: true,
    },
  });

  const round2 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      name: 'Preliminary 2',
      seq: 2,
      stage: 'PRELIMINARY',
      isDrawReleased: false,
      isMotionReleased: false,
    },
  });

  console.log('✅ Created rounds:', round1.name, round2.name);

  // Add motions
  console.log('💭 Adding motions...');
  const motion1 = await prisma.motion.create({
    data: {
      tournamentId: tournament.id,
      roundId: round1.id,
      text: 'This house believes that artificial intelligence will benefit humanity more than it harms it',
      infoSlide: 'Consider long-term impacts on employment, privacy, and decision-making',
      seq: 1,
    },
  });

  const motion2 = await prisma.motion.create({
    data: {
      tournamentId: tournament.id,
      roundId: round2.id,
      text: 'This house would prioritize renewable energy over economic growth',
      infoSlide: 'Focus on developing nations and climate commitments',
      seq: 1,
    },
  });

  console.log('✅ Added motions');

  // Create a debate
  console.log('⚔️ Creating debate...');
  const debate = await prisma.debate.create({
    data: {
      tournamentId: tournament.id,
      roundId: round1.id,
      venueId: venue1.id,
      propTeamId: team1.id,
      oppTeamId: team2.id,
      status: 'SCHEDULED',
      scheduledAt: new Date('2025-12-01T10:00:00Z'),
    },
  });

  console.log('✅ Created debate');

  // Check in teams
  console.log('✔️ Checking in participants...');
  await prisma.teamCheckIn.create({
    data: {
      tournamentId: tournament.id,
      teamId: team1.id,
      roundSeq: 1,
      status: 'AVAILABLE',
      checkedInBy: user1?.id || admin.id,
    },
  });

  await prisma.teamCheckIn.create({
    data: {
      tournamentId: tournament.id,
      teamId: team2.id,
      roundSeq: 1,
      status: 'AVAILABLE',
      checkedInBy: user2?.id || admin.id,
    },
  });

  // Check in adjudicators
  await prisma.adjudicatorCheckIn.create({
    data: {
      tournamentId: tournament.id,
      adjudicatorId: adj1.id,
      roundSeq: 1,
      status: 'AVAILABLE',
      checkedInBy: admin.id,
    },
  });

  if (adj2) {
    await prisma.adjudicatorCheckIn.create({
      data: {
        tournamentId: tournament.id,
        adjudicatorId: adj2.id,
        roundSeq: 1,
        status: 'AVAILABLE',
        checkedInBy: user3?.id || admin.id,
      },
    });
  }

  console.log('✅ Check-in complete');

  // Create sample ballot
  console.log('📝 Creating sample ballot...');
  await prisma.ballot.create({
    data: {
      debateId: debate.id,
      adjudicatorId: adj1.id,
      winningSide: 'PROP',
      propScore: 75.5,
      oppScore: 73.0,
      comments: 'Strong opening from proposition. Opposition had good rebuttals but weaker conclusion.',
      status: 'CONFIRMED',
      submittedAt: new Date(),
    },
  });

  console.log('✅ Sample ballot created');

  console.log('\n🎉 Tournament seed complete!');
  console.log('\nCreated:');
  console.log('  - 1 tournament (REGISTRATION status)');
  console.log('  - 2 venues');
  console.log('  - 2 teams with members');
  console.log('  - 2 adjudicators');
  console.log('  - 2 rounds');
  console.log('  - 2 motions');
  console.log('  - 1 debate with check-ins');
  console.log('  - 1 sample ballot');
  console.log('\n✅ You can now test the tournament system!');
  console.log(`\n🌐 Visit: http://localhost:3000/tournaments/${tournament.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding tournament data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
