-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('DEBATER', 'JUDGE');

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(128) NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'tourn_' || gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" VARCHAR(128) NOT NULL,
    "rosterFreezeAt" TIMESTAMP(3),
    "frozenById" VARCHAR(128),

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'inst_' || gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionMember" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'imem_' || gen_random_uuid()::text,
    "userId" VARCHAR(128) NOT NULL,
    "institutionId" VARCHAR(128) NOT NULL,
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'team_' || gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "institutionId" VARCHAR(128) NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipation" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'part_' || gen_random_uuid()::text,
    "userId" VARCHAR(128) NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "teamId" VARCHAR(128),
    "institutionId" VARCHAR(128),
    "role" "RoleType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentInstitutionRegistration" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'reg_' || gen_random_uuid()::text,
    "tournamentId" VARCHAR(128) NOT NULL,
    "institutionId" VARCHAR(128) NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredById" VARCHAR(128) NOT NULL,

    CONSTRAINT "TournamentInstitutionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'rnd_' || gen_random_uuid()::text,
    "tournamentId" VARCHAR(128) NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundPairing" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'rpair_' || gen_random_uuid()::text,
    "roundId" VARCHAR(128) NOT NULL,
    "propTeamId" VARCHAR(128),
    "oppTeamId" VARCHAR(128),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundPairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundPairingJudge" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'rpj_' || gen_random_uuid()::text,
    "pairingId" VARCHAR(128) NOT NULL,
    "participationId" VARCHAR(128) NOT NULL,
    "isChair" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundPairingJudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE INDEX "Institution_createdById_idx" ON "Institution"("createdById");

-- CreateIndex
CREATE INDEX "InstitutionMember_institutionId_idx" ON "InstitutionMember"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionMember_userId_key" ON "InstitutionMember"("userId");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_idx" ON "TournamentTeam"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentTeam_institutionId_idx" ON "TournamentTeam"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_institutionId_teamNumber_key" ON "TournamentTeam"("tournamentId", "institutionId", "teamNumber");

-- CreateIndex
CREATE INDEX "TournamentParticipation_tournamentId_idx" ON "TournamentParticipation"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentParticipation_teamId_idx" ON "TournamentParticipation"("teamId");

-- CreateIndex
CREATE INDEX "TournamentParticipation_institutionId_idx" ON "TournamentParticipation"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipation_userId_tournamentId_key" ON "TournamentParticipation"("userId", "tournamentId");

-- CreateIndex
CREATE INDEX "TournamentInstitutionRegistration_tournamentId_idx" ON "TournamentInstitutionRegistration"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentInstitutionRegistration_institutionId_idx" ON "TournamentInstitutionRegistration"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentInstitutionRegistration_tournamentId_institutionI_key" ON "TournamentInstitutionRegistration"("tournamentId", "institutionId");

-- CreateIndex
CREATE INDEX "Round_tournamentId_idx" ON "Round"("tournamentId");

-- CreateIndex
CREATE INDEX "RoundPairing_roundId_idx" ON "RoundPairing"("roundId");

-- CreateIndex
CREATE INDEX "RoundPairing_propTeamId_idx" ON "RoundPairing"("propTeamId");

-- CreateIndex
CREATE INDEX "RoundPairing_oppTeamId_idx" ON "RoundPairing"("oppTeamId");

-- CreateIndex
CREATE INDEX "RoundPairingJudge_pairingId_idx" ON "RoundPairingJudge"("pairingId");

-- CreateIndex
CREATE INDEX "RoundPairingJudge_participationId_idx" ON "RoundPairingJudge"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundPairingJudge_pairingId_participationId_key" ON "RoundPairingJudge"("pairingId", "participationId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_frozenById_fkey" FOREIGN KEY ("frozenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipation" ADD CONSTRAINT "TournamentParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipation" ADD CONSTRAINT "TournamentParticipation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipation" ADD CONSTRAINT "TournamentParticipation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipation" ADD CONSTRAINT "TournamentParticipation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInstitutionRegistration" ADD CONSTRAINT "TournamentInstitutionRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInstitutionRegistration" ADD CONSTRAINT "TournamentInstitutionRegistration_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPairing" ADD CONSTRAINT "RoundPairing_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPairing" ADD CONSTRAINT "RoundPairing_propTeamId_fkey" FOREIGN KEY ("propTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPairing" ADD CONSTRAINT "RoundPairing_oppTeamId_fkey" FOREIGN KEY ("oppTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPairingJudge" ADD CONSTRAINT "RoundPairingJudge_pairingId_fkey" FOREIGN KEY ("pairingId") REFERENCES "RoundPairing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPairingJudge" ADD CONSTRAINT "RoundPairingJudge_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "TournamentParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
