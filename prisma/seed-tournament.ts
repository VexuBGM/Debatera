import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateToken, hashToken, normalizeEmail } from "../src/lib/identity/tokenUtils";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOURNAMENT_ID = "tourn_fe91bfdf-0dd7-4c58-a7b9-e045bf7cacfc";

async function ensurePrivateLink(participantId: string) {
  const existing = await prisma.participantPrivateLink.findUnique({
    where: { tournamentParticipantId: participantId },
  });
  if (existing) return null;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  await prisma.participantPrivateLink.create({
    data: {
      tournamentParticipantId: participantId,
      tokenHash,
    },
  });

  return rawToken;
}

async function main() {
  console.log("🌱 Seeding tournament data...");

  // First, verify the tournament exists
  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
  });

  if (!tournament) {
    throw new Error(`Tournament ${TOURNAMENT_ID} not found!`);
  }

  console.log(`Found tournament: ${tournament.name}`);

  // Create test institutions
  const institutions = await Promise.all([
    prisma.institution.upsert({
      where: { name: "Oxford University" },
      update: {},
      create: { name: "Oxford University" },
    }),
    prisma.institution.upsert({
      where: { name: "Cambridge University" },
      update: {},
      create: { name: "Cambridge University" },
    }),
    prisma.institution.upsert({
      where: { name: "Harvard University" },
      update: {},
      create: { name: "Harvard University" },
    }),
    prisma.institution.upsert({
      where: { name: "Yale University" },
      update: {},
      create: { name: "Yale University" },
    }),
    prisma.institution.upsert({
      where: { name: "Stanford University" },
      update: {},
      create: { name: "Stanford University" },
    }),
    prisma.institution.upsert({
      where: { name: "MIT" },
      update: {},
      create: { name: "MIT" },
    }),
  ]);

  console.log(`✅ Created/found ${institutions.length} institutions`);

  // Create test users (debaters and judges)
  const users: { id: string; email: string; username: string; role: "DEBATER" | "JUDGE" }[] = [];

  // Create debater users (3 per institution = 18 debaters)
  for (let i = 0; i < institutions.length; i++) {
    for (let j = 1; j <= 3; j++) {
      const instShort = institutions[i].name.toLowerCase().replace(/\s+/g, "").slice(0, 6);
      users.push({
        id: `user_test_debater_${instShort}_${j}`,
        email: `debater${j}@${instShort}.test`,
        username: `debater_${instShort}_${j}`,
        role: "DEBATER",
      });
    }
  }

  // Create judge users (6 judges total)
  for (let i = 1; i <= 6; i++) {
    users.push({
      id: `user_test_judge_${i}`,
      email: `judge${i}@test.com`,
      username: `judge_${i}`,
      role: "JUDGE",
    });
  }

  // Upsert all users and create corresponding Person records
  const userPersonMap = new Map<string, string>(); // userId -> personId
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, username: user.username },
      create: { id: user.id, email: user.email, username: user.username },
    });

    // Create/find Person for this user
    const emailNorm = normalizeEmail(user.email) ?? user.email.toLowerCase().trim();
    const person = await prisma.person.upsert({
      where: { emailNormalized: emailNorm },
      update: {},
      create: {
        emailNormalized: emailNorm,
        firstName: user.username.replace(/_/g, ' '),
        lastName: '',
        claimedByUserId: user.id,
        claimedAt: new Date(),
      },
    });
    userPersonMap.set(user.id, person.id);
  }

  console.log(`✅ Created/updated ${users.length} users + Person records`);

  // Register institutions with tournament
  for (const institution of institutions) {
    // Pick first debater from this institution as the requester
    const instShort = institution.name.toLowerCase().replace(/\s+/g, "").slice(0, 6);
    const requesterId = `user_test_debater_${instShort}_1`;

    await prisma.tournamentInstitution.upsert({
      where: {
        tournamentId_institutionId: {
          tournamentId: TOURNAMENT_ID,
          institutionId: institution.id,
        },
      },
      update: { status: "APPROVED" },
      create: {
        tournamentId: TOURNAMENT_ID,
        institutionId: institution.id,
        requestedByUserId: requesterId,
        status: "APPROVED",
      },
    });
  }

  console.log(`✅ Registered ${institutions.length} institutions with tournament`);

  // Register participants
  const debaterUsers = users.filter((u) => u.role === "DEBATER");
  const judgeUsers = users.filter((u) => u.role === "JUDGE");

  // Register debaters
  for (let i = 0; i < debaterUsers.length; i++) {
    const instIndex = Math.floor(i / 3);
    const institution = institutions[instIndex];
    const personId = userPersonMap.get(debaterUsers[i].id)!;

    const participant = await prisma.tournamentParticipant.upsert({
      where: {
        tournamentId_userId: {
          tournamentId: TOURNAMENT_ID,
          userId: debaterUsers[i].id,
        },
      },
      update: {},
      create: {
        tournamentId: TOURNAMENT_ID,
        userId: debaterUsers[i].id,
        personId,
        institutionId: institution.id,
        role: "DEBATER",
      },
    });

    await ensurePrivateLink(participant.id);
  }

  console.log(`✅ Registered ${debaterUsers.length} debaters`);

  // Register judges (assign to first institution for simplicity)
  for (const judge of judgeUsers) {
    const personId = userPersonMap.get(judge.id)!;

    const participant = await prisma.tournamentParticipant.upsert({
      where: {
        tournamentId_userId: {
          tournamentId: TOURNAMENT_ID,
          userId: judge.id,
        },
      },
      update: {},
      create: {
        tournamentId: TOURNAMENT_ID,
        userId: judge.id,
        personId,
        institutionId: institutions[0].id,
        role: "JUDGE",
      },
    });

    await ensurePrivateLink(participant.id);
  }

  console.log(`✅ Registered ${judgeUsers.length} judges`);

  // Add a guest judge with a private link
  const guestPerson = await prisma.person.create({
    data: {
      emailNormalized: normalizeEmail("guest.judge@example.com"),
      firstName: "Guest",
      lastName: "Judge",
    },
  });

  const guestParticipant = await prisma.tournamentParticipant.create({
    data: {
      tournamentId: TOURNAMENT_ID,
      personId: guestPerson.id,
      institutionId: institutions[0].id,
      role: "JUDGE",
    },
  });

  const guestToken = await ensurePrivateLink(guestParticipant.id);
  if (guestToken) {
    console.log(`🔗 Guest judge private URL: /tournaments/${TOURNAMENT_ID}/p/${guestToken}`);
  }

  // Create teams (1 team per institution with 3 members each = 6 teams)
  const teams: { id: string; institutionId: string; name: string }[] = [];

  for (const institution of institutions) {
    const team = await prisma.tournamentTeam.upsert({
      where: {
        tournamentId_institutionId_name: {
          tournamentId: TOURNAMENT_ID,
          institutionId: institution.id,
          name: `${institution.name} 1`,
        },
      },
      update: {},
      create: {
        tournamentId: TOURNAMENT_ID,
        institutionId: institution.id,
        name: `${institution.name} 1`,
        createdByUserId: tournament.createdByUserId,
      },
    });
    teams.push({ id: team.id, institutionId: institution.id, name: team.name });
  }

  console.log(`✅ Created ${teams.length} teams`);

  // Add members to teams
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const institution = institutions[i];
    const instShort = institution.name.toLowerCase().replace(/\s+/g, "").slice(0, 6);

    // Get all 3 debaters for this institution
    for (let j = 1; j <= 3; j++) {
      const userId = `user_test_debater_${instShort}_${j}`;

      // Find the participant
      const participant = await prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId: TOURNAMENT_ID,
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

  console.log(`✅ Added members to all teams`);

  // Summary
  console.log("\n📊 Seed Summary:");
  console.log(`   - Tournament: ${tournament.name}`);
  console.log(`   - Institutions: ${institutions.length}`);
  console.log(`   - Teams: ${teams.length}`);
  console.log(`   - Debaters: ${debaterUsers.length}`);
  console.log(`   - Judges: ${judgeUsers.length}`);
  console.log("\n✨ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
