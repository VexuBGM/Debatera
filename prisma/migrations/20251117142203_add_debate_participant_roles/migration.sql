-- CreateEnum
CREATE TYPE "SpeakerRole" AS ENUM ('FIRST_SPEAKER', 'SECOND_SPEAKER', 'THIRD_SPEAKER', 'REPLY_SPEAKER', 'JUDGE');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('ACTIVE', 'LEFT', 'RESERVED');

-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "id" SET DEFAULT 'inst_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "InstitutionMember" ALTER COLUMN "id" SET DEFAULT 'imem_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Round" ALTER COLUMN "id" SET DEFAULT 'rnd_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairing" ADD COLUMN     "callId" VARCHAR(256),
ALTER COLUMN "id" SET DEFAULT 'rpair_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairingJudge" ALTER COLUMN "id" SET DEFAULT 'rpj_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "id" SET DEFAULT 'tourn_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" ALTER COLUMN "id" SET DEFAULT 'reg_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentParticipation" ALTER COLUMN "id" SET DEFAULT 'part_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentTeam" ALTER COLUMN "id" SET DEFAULT 'team_' || gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "DebateParticipant" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'dpart_' || gen_random_uuid()::text,
    "pairingId" VARCHAR(128) NOT NULL,
    "userId" VARCHAR(128) NOT NULL,
    "teamId" VARCHAR(128),
    "role" "SpeakerRole" NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'RESERVED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebateParticipant_pairingId_idx" ON "DebateParticipant"("pairingId");

-- CreateIndex
CREATE INDEX "DebateParticipant_userId_idx" ON "DebateParticipant"("userId");

-- CreateIndex
CREATE INDEX "DebateParticipant_teamId_idx" ON "DebateParticipant"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateParticipant_pairingId_userId_key" ON "DebateParticipant"("pairingId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateParticipant_pairingId_teamId_role_key" ON "DebateParticipant"("pairingId", "teamId", "role");

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_pairingId_fkey" FOREIGN KEY ("pairingId") REFERENCES "RoundPairing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
