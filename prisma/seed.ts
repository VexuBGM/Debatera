import { PrismaClient, RoleType } from '@prisma/client'

const prisma = new PrismaClient()

const TOURNAMENT_ID = 'tourn_7e2ad743-e1d2-4d1a-8485-63575dafd5e6'

async function main() {
  console.log('Starting seed...')
  // ensure we have a seed owner user (used as createdBy / owner ids)
  const seedOwnerId = 'seed_owner'
  let seedOwner = await prisma.user.findUnique({ where: { id: seedOwnerId } })
  if (!seedOwner) {
    seedOwner = await prisma.user.create({ data: { id: seedOwnerId, email: 'owner@seed.local', username: 'seed_owner' } })
  }

  // ensure tournament exists (create minimal record if missing)
  let tournament = await prisma.tournament.findUnique({ where: { id: TOURNAMENT_ID } })
  if (!tournament) {
    console.log('Tournament not found, creating a minimal tournament with id', TOURNAMENT_ID)
    tournament = await prisma.tournament.create({
      data: {
        id: TOURNAMENT_ID,
        name: 'Seeded Tournament (auto-created)',
        ownerId: seedOwner.id,
      },
    })
  }

  const numInstitutions = 7
  const numTeams = 7
  const totalDebaters = 30
  const numJudges = 4

  // create or upsert institutions
  const institutions = [] as any[]
  for (let i = 1; i <= numInstitutions; i++) {
    const name = `Seed Institution ${i}`
    const inst = await prisma.institution.upsert({
      where: { name },
      create: { name, createdById: 'seed_owner' },
      update: {},
    })
    institutions.push(inst)
  }

  // create coaches (one per institution)
  const coaches: any[] = []
  for (let i = 0; i < institutions.length; i++) {
    const inst = institutions[i]
    const coachId = `seed_coach_inst_${i + 1}`
    let coach = await prisma.user.findUnique({ where: { id: coachId } })
    if (!coach) {
      coach = await prisma.user.create({
        data: {
          id: coachId,
          email: `coach${i + 1}@seed.local`,
          username: `coach_${i + 1}`,
        },
      })
    }

    // create institution membership for coach
    const imem = await prisma.institutionMember.findFirst({ where: { userId: coach.id } })
    if (!imem) {
      await prisma.institutionMember.create({
        data: {
          userId: coach.id,
          institutionId: inst.id,
          isCoach: true,
        },
      })
    }

    coaches.push(coach)
  }

  // register each institution to the tournament
  for (const inst of institutions) {
    const existing = await prisma.tournamentInstitutionRegistration.findFirst({ where: { tournamentId: TOURNAMENT_ID, institutionId: inst.id } })
    if (!existing) {
      await prisma.tournamentInstitutionRegistration.create({
        data: {
          tournamentId: TOURNAMENT_ID,
          institutionId: inst.id,
          registeredById: coaches[0]?.id ?? 'seed_owner',
        },
      })
    }
  }

  // create 7 teams across institutions for the tournament
  const allTeams: any[] = []
  for (let teamIdx = 1; teamIdx <= numTeams; teamIdx++) {
    // Distribute teams across institutions (round-robin)
    const inst = institutions[(teamIdx - 1) % institutions.length]
    const teamNumber = Math.floor((teamIdx - 1) / institutions.length) + 1

    const existingTeam = await prisma.tournamentTeam.findFirst({ 
      where: { tournamentId: TOURNAMENT_ID, institutionId: inst.id, teamNumber } 
    })
    if (existingTeam) {
      allTeams.push(existingTeam)
      continue
    }
    const team = await prisma.tournamentTeam.create({
      data: {
        name: `${inst.name} Team ${teamNumber}`,
        tournamentId: TOURNAMENT_ID,
        institutionId: inst.id,
        teamNumber,
      },
    })
    allTeams.push(team)
  }

  // create 30 debater users and assign to institutions, teams and tournament participations
  let userCounter = 1
  for (let i = 0; i < totalDebaters; i++) {
    const userId = `seed_user_${userCounter}`
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: `user${userCounter}@seed.local`,
          username: `seed_user_${userCounter}`,
        },
      })
    }

    // Pick institution (round-robin)
    const inst = institutions[i % institutions.length]

    // create institution membership (user -> institution)
    const existingMembership = await prisma.institutionMember.findFirst({ where: { userId: user.id } })
    if (!existingMembership) {
      await prisma.institutionMember.create({
        data: {
          userId: user.id,
          institutionId: inst.id,
          isCoach: false,
        },
      })
    }

    // pick a team (round-robin)
    const team = allTeams[i % allTeams.length]

    // create tournament participation for the user
    const existingParticipation = await prisma.tournamentParticipation.findFirst({ where: { userId: user.id, tournamentId: TOURNAMENT_ID } })
    if (!existingParticipation) {
      await prisma.tournamentParticipation.create({
        data: {
          userId: user.id,
          tournamentId: TOURNAMENT_ID,
          teamId: team.id,
          institutionId: inst.id,
          role: RoleType.DEBATER,
        },
      })
    }

    userCounter++
  }

  // create 4 judges (not tied to institutions or teams)
  for (let j = 1; j <= numJudges; j++) {
    const judgeId = `seed_judge_${j}`
    let judge = await prisma.user.findUnique({ where: { id: judgeId } })
    if (!judge) {
      judge = await prisma.user.create({
        data: {
          id: judgeId,
          email: `judge${j}@seed.local`,
          username: `seed_judge_${j}`,
        },
      })
    }

    // create tournament participation as judge (no team or institution)
    const existingParticipation = await prisma.tournamentParticipation.findFirst({ where: { userId: judge.id, tournamentId: TOURNAMENT_ID } })
    if (!existingParticipation) {
      await prisma.tournamentParticipation.create({
        data: {
          userId: judge.id,
          tournamentId: TOURNAMENT_ID,
          role: RoleType.JUDGE,
        },
      })
    }
  }

  console.log(`Seeded ${userCounter - 1} debaters across ${allTeams.length} teams, ${numJudges} judges, and ${institutions.length} institutions with coaches.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('Seed finished successfully')
  })
  .catch(async (e) => {
    console.error('Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
