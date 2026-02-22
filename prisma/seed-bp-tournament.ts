/**
 * BP Tournament Seed Script
 *
 * Seeds a British Parliamentary tournament with 8 teams (2 per institution),
 * 2 speakers per team, 4 judges, and settings configured for BP format.
 *
 * Usage:
 *   1. Set TOURNAMENT_ID below to the tournament you created via the app
 *   2. Run: npx tsx prisma/seed-bp-tournament.ts
 */

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
const TOURNAMENT_ID = "YOUR_TOURNAMENT_ID_HERE";

// 4 institutions, 2 teams each → 8 teams → 2 rooms of 4
const INSTITUTIONS = [
  { name: "Oxford University", short: "oxford" },
  { name: "Cambridge University", short: "cambridge" },
  { name: "Yale University", short: "yale" },
  { name: "Harvard University", short: "harvard" },
];

// 4 debaters per institution (2 teams × 2 speakers)
const DEBATERS = [
  // Oxford
  [
    { first: "Eleanor", last: "Chen", email: "eleanor.chen@oxford.ac.uk" },
    { first: "James", last: "Morrison", email: "james.morrison@oxford.ac.uk" },
    { first: "Aisha", last: "Patel", email: "aisha.patel@oxford.ac.uk" },
    { first: "Oliver", last: "Wu", email: "oliver.wu@oxford.ac.uk" },
  ],
  // Cambridge
  [
    { first: "Marcus", last: "Williams", email: "marcus.williams@cam.ac.uk" },
    { first: "Sofia", last: "Rodriguez", email: "sofia.rodriguez@cam.ac.uk" },
    { first: "Li", last: "Zhang", email: "li.zhang@cam.ac.uk" },
    { first: "Emma", last: "Taylor", email: "emma.taylor@cam.ac.uk" },
  ],
  // Yale
  [
    { first: "Olivia", last: "Thompson", email: "olivia.thompson@yale.edu" },
    { first: "David", last: "Kim", email: "david.kim@yale.edu" },
    { first: "Priya", last: "Sharma", email: "priya.sharma@yale.edu" },
    { first: "Ethan", last: "Brown", email: "ethan.brown@yale.edu" },
  ],
  // Harvard
  [
    { first: "Alexander", last: "Johnson", email: "alexander.johnson@harvard.edu" },
    { first: "Maya", last: "Anderson", email: "maya.anderson@harvard.edu" },
    { first: "Hassan", last: "Ali", email: "hassan.ali@harvard.edu" },
    { first: "Zara", last: "Davis", email: "zara.davis@harvard.edu" },
  ],
];

const JUDGES = [
  { first: "Sarah", last: "Mitchell", email: "sarah.mitchell@debate.org" },
  { first: "Robert", last: "Clarke", email: "robert.clarke@debate.org" },
  { first: "Diane", last: "Foster", email: "diane.foster@debate.org" },
  { first: "Kwame", last: "Osei", email: "kwame.osei@debate.org" },
];

async function main() {
  console.log("🌱 Seeding BP tournament data...\n");

  // Verify tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
  });

  if (!tournament) {
    throw new Error(
      `Tournament ${TOURNAMENT_ID} not found! Create a tournament via the app first and set TOURNAMENT_ID.`
    );
  }

  console.log(`✅ Tournament: ${tournament.name}`);

  // ── Institutions ──
  const institutions = await Promise.all(
    INSTITUTIONS.map((inst) =>
      prisma.institution.upsert({
        where: { name: inst.name },
        update: {},
        create: { name: inst.name },
      })
    )
  );
  console.log(`✅ ${institutions.length} institutions`);

  // ── Users (debaters) ──
  const usersByInstitution: string[][] = [];

  for (let i = 0; i < INSTITUTIONS.length; i++) {
    const short = INSTITUTIONS[i].short;
    const ids: string[] = [];

    for (let j = 0; j < DEBATERS[i].length; j++) {
      const d = DEBATERS[i][j];
      const userId = `user_bp_${short}_${j + 1}`;

      await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: d.email,
          firstName: d.first,
          lastName: d.last,
          displayName: `${d.first} ${d.last}`,
        },
        create: {
          id: userId,
          email: d.email,
          firstName: d.first,
          lastName: d.last,
          displayName: `${d.first} ${d.last}`,
        },
      });

      ids.push(userId);
    }

    usersByInstitution.push(ids);
  }
  console.log(`✅ ${INSTITUTIONS.length * 4} debater users`);

  // ── Judge users ──
  const judgeUserIds: string[] = [];

  for (let j = 0; j < JUDGES.length; j++) {
    const jd = JUDGES[j];
    const userId = `user_bp_judge_${j + 1}`;

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: jd.email,
        firstName: jd.first,
        lastName: jd.last,
        displayName: `${jd.first} ${jd.last}`,
      },
      create: {
        id: userId,
        email: jd.email,
        firstName: jd.first,
        lastName: jd.last,
        displayName: `${jd.first} ${jd.last}`,
      },
    });

    judgeUserIds.push(userId);
  }
  console.log(`✅ ${JUDGES.length} judge users`);

  // ── Tournament institutions ──
  for (let i = 0; i < institutions.length; i++) {
    await prisma.tournamentInstitution.upsert({
      where: {
        tournamentId_institutionId: {
          tournamentId: tournament.id,
          institutionId: institutions[i].id,
        },
      },
      update: { status: "APPROVED" },
      create: {
        tournamentId: tournament.id,
        institutionId: institutions[i].id,
        requestedByUserId: usersByInstitution[i][0],
        status: "APPROVED",
      },
    });
  }
  console.log(`✅ ${institutions.length} institution registrations`);

  // ── Debater participants ──
  for (let i = 0; i < institutions.length; i++) {
    for (const userId of usersByInstitution[i]) {
      await prisma.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId,
          },
        },
        update: {},
        create: {
          tournamentId: tournament.id,
          userId,
          institutionId: institutions[i].id,
          role: "DEBATER",
        },
      });
    }
  }
  console.log(`✅ ${INSTITUTIONS.length * 4} debater participants`);

  // ── Judge participants ──
  for (const userId of judgeUserIds) {
    await prisma.tournamentParticipant.upsert({
      where: {
        tournamentId_userId: {
          tournamentId: tournament.id,
          userId,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        userId,
        institutionId: institutions[0].id, // default institution
        role: "JUDGE",
      },
    });
  }
  console.log(`✅ ${JUDGES.length} judge participants`);

  // ── Teams (2 per institution, 2 speakers each ──
  const allTeams: { id: string; name: string; instName: string; members: string[] }[] = [];

  for (let i = 0; i < institutions.length; i++) {
    const inst = institutions[i];
    const debaterIds = usersByInstitution[i]; // 4 debaters

    for (let t = 0; t < 2; t++) {
      const teamName = `${inst.name} ${t + 1}`;
      const memberUserIds = debaterIds.slice(t * 2, t * 2 + 2); // 2 each

      const team = await prisma.tournamentTeam.upsert({
        where: {
          tournamentId_institutionId_name: {
            tournamentId: tournament.id,
            institutionId: inst.id,
            name: teamName,
          },
        },
        update: {},
        create: {
          tournamentId: tournament.id,
          institutionId: inst.id,
          name: teamName,
          createdByUserId: memberUserIds[0],
        },
      });

      // Add members
      for (const userId of memberUserIds) {
        const participant = await prisma.tournamentParticipant.findUnique({
          where: {
            tournamentId_userId: { tournamentId: tournament.id, userId },
          },
        });

        if (participant) {
          const exists = await prisma.tournamentTeamMember.findUnique({
            where: { participantId: participant.id },
          });
          if (!exists) {
            await prisma.tournamentTeamMember.create({
              data: {
                teamId: team.id,
                participantId: participant.id,
              },
            });
          }
        }
      }

      allTeams.push({
        id: team.id,
        name: teamName,
        instName: inst.name,
        members: memberUserIds,
      });
    }
  }
  console.log(`✅ ${allTeams.length} teams (2 per institution, 2 speakers each)`);

  // ── Tournament settings (BP) ──
  await prisma.tournamentSettings.upsert({
    where: { tournamentId: tournament.id },
    update: {
      debateFormat: "BP",
      teamSizeMin: 2,
      teamSizeMax: 2,
      speakerScaleMin: 65,
      speakerScaleMax: 85,
      rankPointsFirst: 3,
      rankPointsSecond: 2,
      rankPointsThird: 1,
      rankPointsFourth: 0,
      pairingSystem: "SWISS",
    },
    create: {
      tournamentId: tournament.id,
      debateFormat: "BP",
      teamSizeMin: 2,
      teamSizeMax: 2,
      speakerScaleMin: 65,
      speakerScaleMax: 85,
      rankPointsFirst: 3,
      rankPointsSecond: 2,
      rankPointsThird: 1,
      rankPointsFourth: 0,
      pairingSystem: "SWISS",
      eventMode: "IRL",
      registrationOpensAt: new Date("2026-02-01"),
      registrationClosesAt: new Date("2026-06-15"),
    },
  });
  console.log(`✅ BP tournament settings`);

  // ── Venues ──
  const venueNames = ["Chamber A", "Chamber B"];
  for (const name of venueNames) {
    await prisma.venue.upsert({
      where: {
        tournamentId_name: { tournamentId: tournament.id, name },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        name,
      },
    });
  }
  console.log(`✅ ${venueNames.length} venues`);

  // ── Summary ──
  console.log("\n📊 BP Seed Summary:");
  console.log(`   Tournament : ${tournament.name}`);
  console.log(`   Format     : British Parliamentary`);
  console.log(`   Teams      : ${allTeams.length} (rooms of 4)`);
  console.log(`   Judges     : ${JUDGES.length}`);
  console.log(`   Venues     : ${venueNames.length}\n`);

  for (const team of allTeams) {
    console.log(`   🏆 ${team.name}:`);
    for (const userId of team.members) {
      const debater = DEBATERS.flat().find((d) =>
        userId.includes(d.first.toLowerCase().slice(0, 4))
      );
      if (debater) {
        console.log(`      - ${debater.first} ${debater.last}`);
      }
    }
  }
  console.log();

  console.log(
    "🎉 Done! Create a round in the UI, then generate pairings to see BP rooms of 4."
  );
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
