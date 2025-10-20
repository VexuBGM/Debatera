-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DebateStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CallRole" AS ENUM ('DEBATER', 'JUDGE', 'SPECTATOR');

-- CreateEnum
CREATE TYPE "DebateSide" AS ENUM ('PROP', 'OPP', 'NEUTRAL');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clerkId" VARCHAR(128) NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "imageUrl" TEXT,
    "appRole" "AppRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "tournamentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "Debate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID,
    "propTeamId" UUID NOT NULL,
    "oppTeamId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "DebateStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winningSide" "DebateSide",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debateId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CallRole" NOT NULL,
    "side" "DebateSide" NOT NULL DEFAULT 'NEUTRAL',
    "speakOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeFeedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debateId" UUID NOT NULL,
    "judgeId" UUID NOT NULL,
    "notes" TEXT,
    "winnerSide" "DebateSide",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "Tournament_createdById_idx" ON "Tournament"("createdById");

-- CreateIndex
CREATE INDEX "Tournament_isVerified_idx" ON "Tournament"("isVerified");

-- CreateIndex
CREATE INDEX "Team_tournamentId_idx" ON "Team"("tournamentId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "Debate_tournamentId_idx" ON "Debate"("tournamentId");

-- CreateIndex
CREATE INDEX "Debate_propTeamId_idx" ON "Debate"("propTeamId");

-- CreateIndex
CREATE INDEX "Debate_oppTeamId_idx" ON "Debate"("oppTeamId");

-- CreateIndex
CREATE INDEX "Debate_status_idx" ON "Debate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DebateParticipant_debateId_userId_key" ON "DebateParticipant"("debateId", "userId");

-- CreateIndex
CREATE INDEX "DebateParticipant_debateId_role_idx" ON "DebateParticipant"("debateId", "role");

-- CreateIndex
CREATE INDEX "DebateParticipant_userId_idx" ON "DebateParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeFeedback_debateId_judgeId_key" ON "JudgeFeedback"("debateId", "judgeId");

-- CreateIndex
CREATE INDEX "JudgeFeedback_debateId_idx" ON "JudgeFeedback"("debateId");

-- CreateIndex
CREATE INDEX "JudgeFeedback_judgeId_idx" ON "JudgeFeedback"("judgeId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_propTeamId_fkey" FOREIGN KEY ("propTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_oppTeamId_fkey" FOREIGN KEY ("oppTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeFeedback" ADD CONSTRAINT "JudgeFeedback_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeFeedback" ADD CONSTRAINT "JudgeFeedback_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
