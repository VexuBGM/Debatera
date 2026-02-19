import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// CONFIGURE THIS: Set your tournament ID here
// ============================================================================
const TOURNAMENT_ID = "tourn_822fb134-6751-4dcf-a2e1-0eba1599f259";

async function main() {
  console.log("🌱 Seeding 4 teams with 3 participants each...");

  // Find the existing tournament
  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
  });

  if (!tournament) {
    throw new Error(`Tournament ${TOURNAMENT_ID} not found! Please check the TOURNAMENT_ID variable.`);
  }

  console.log(`✅ Tournament: ${tournament.name}`);

  // Create 4 institutions
  const institutionData = [
    { name: "Oxford University", short: "oxford" },
    { name: "Cambridge University", short: "cambridge" },
    { name: "Yale University", short: "yale" },
    { name: "Harvard University", short: "harvard" },
  ];

  const institutions = await Promise.all(
    institutionData.map((inst) =>
      prisma.institution.upsert({
        where: { name: inst.name },
        update: {},
        create: { name: inst.name },
      })
    )
  );

  console.log(`✅ Created ${institutions.length} institutions`);

  // Create realistic debater names - 3 per institution
  const debaterNames = [
    // Oxford University
    [
      { first: "Eleanor", last: "Chen", email: "eleanor.chen@oxford.ac.uk" },
      { first: "James", last: "Morrison", email: "james.morrison@oxford.ac.uk" },
      { first: "Aisha", last: "Patel", email: "aisha.patel@oxford.ac.uk" },
    ],
    // Cambridge University
    [
      { first: "Marcus", last: "Williams", email: "marcus.williams@cam.ac.uk" },
      { first: "Sofia", last: "Rodriguez", email: "sofia.rodriguez@cam.ac.uk" },
      { first: "Li", last: "Zhang", email: "li.zhang@cam.ac.uk" },
    ],
    // Yale University
    [
      { first: "Olivia", last: "Thompson", email: "olivia.thompson@yale.edu" },
      { first: "David", last: "Kim", email: "david.kim@yale.edu" },
      { first: "Priya", last: "Sharma", email: "priya.sharma@yale.edu" },
    ],
    // Harvard University
    [
      { first: "Alexander", last: "Johnson", email: "alexander.johnson@harvard.edu" },
      { first: "Maya", last: "Anderson", email: "maya.anderson@harvard.edu" },
      { first: "Hassan", last: "Ali", email: "hassan.ali@harvard.edu" },
    ],
  ];

  // Create users and track them
  const usersByInstitution: string[][] = [];

  for (let i = 0; i < institutions.length; i++) {
    const instShort = institutionData[i].short;
    const userIds: string[] = [];

    for (let j = 0; j < 3; j++) {
      const userId = `user_${instShort}_${j + 1}`;
      const debater = debaterNames[i][j];

      await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: debater.email,
          firstName: debater.first,
          lastName: debater.last,
          displayName: `${debater.first} ${debater.last}`,
        },
        create: {
          id: userId,
          email: debater.email,
          firstName: debater.first,
          lastName: debater.last,
          displayName: `${debater.first} ${debater.last}`,
          bio: `Passionate debater from ${institutions[i].name}`,
        },
      });

      userIds.push(userId);
    }

    usersByInstitution.push(userIds);
  }

  console.log(`✅ Created ${institutions.length * 3} users`);

  // Register institutions with tournament
  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    const requesterId = usersByInstitution[i][0]; // First debater is the requester

    await prisma.tournamentInstitution.upsert({
      where: {
        tournamentId_institutionId: {
          tournamentId: tournament.id,
          institutionId: institution.id,
        },
      },
      update: { status: "APPROVED" },
      create: {
        tournamentId: tournament.id,
        institutionId: institution.id,
        requestedByUserId: requesterId,
        status: "APPROVED",
      },
    });
  }

  console.log(`✅ Registered ${institutions.length} institutions with tournament`);

  // Register all debaters as participants
  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];

    for (const userId of usersByInstitution[i]) {
      await prisma.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId: userId,
          },
        },
        update: {},
        create: {
          tournamentId: tournament.id,
          userId: userId,
          institutionId: institution.id,
          role: "DEBATER",
        },
      });
    }
  }

  console.log(`✅ Registered ${institutions.length * 3} participants`);

  // Create teams - one per institution
  const teams = [];

  for (let i = 0; i < institutions.length; i++) {
    const institution = institutions[i];
    const teamName = `${institution.name} 1`;

    const team = await prisma.tournamentTeam.upsert({
      where: {
        tournamentId_institutionId_name: {
          tournamentId: tournament.id,
          institutionId: institution.id,
          name: teamName,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        institutionId: institution.id,
        name: teamName,
        createdByUserId: usersByInstitution[i][0], // Created by first debater
      },
    });

    teams.push(team);
  }

  console.log(`✅ Created ${teams.length} teams`);

  // Add members to teams
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];

    for (const userId of usersByInstitution[i]) {
      // Find the participant
      const participant = await prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId: userId,
          },
        },
      });

      if (participant) {
        // Check if already a member
        const existingMember = await prisma.tournamentTeamMember.findUnique({
          where: { participantId: participant.id },
        });

        if (!existingMember) {
          await prisma.tournamentTeamMember.create({
            data: {
              teamId: team.id,
              participantId: participant.id,
            },
          });
        }
      }
    }
  }

  console.log(`✅ Added 3 members to each of ${teams.length} teams`);

  // Create tournament settings
  await prisma.tournamentSettings.upsert({
    where: { tournamentId: tournament.id },
    update: {},
    create: {
      tournamentId: tournament.id,
      teamSizeMin: 3,
      teamSizeMax: 3,
      debateFormat: "WSDC",
      eventMode: "IRL",
      pairingSystem: "SWISS",
      registrationOpensAt: new Date("2026-02-01"),
      registrationClosesAt: new Date("2026-03-15"),
    },
  });

  console.log(`✅ Created tournament settings`);

  // Print summary with team details
  console.log("\n📊 Seed Summary:");
  console.log(`   Tournament: ${tournament.name}`);
  console.log(`   Teams: ${teams.length}\n`);

  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const members = debaterNames[i];
    console.log(`   🏆 ${team.name}:`);
    members.forEach((member, idx) => {
      console.log(`      ${idx + 1}. ${member.first} ${member.last} (${member.email})`);
    });
    console.log();
  }

  console.log("✨ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
