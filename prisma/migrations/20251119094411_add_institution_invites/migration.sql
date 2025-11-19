-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Ballot" ALTER COLUMN "id" SET DEFAULT 'ballot_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "DebateParticipant" ALTER COLUMN "id" SET DEFAULT 'dpart_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "DebateResult" ALTER COLUMN "id" SET DEFAULT 'result_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "id" SET DEFAULT 'inst_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "InstitutionMember" ALTER COLUMN "id" SET DEFAULT 'imem_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Round" ALTER COLUMN "id" SET DEFAULT 'rnd_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairing" ALTER COLUMN "id" SET DEFAULT 'rpair_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairingJudge" ALTER COLUMN "id" SET DEFAULT 'rpj_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "SpeakerScore" ALTER COLUMN "id" SET DEFAULT 'score_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "id" SET DEFAULT 'tourn_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" ALTER COLUMN "id" SET DEFAULT 'reg_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentParticipation" ALTER COLUMN "id" SET DEFAULT 'part_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentTeam" ALTER COLUMN "id" SET DEFAULT 'team_' || gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "InstitutionInvite" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'inv_' || gen_random_uuid()::text,
    "institutionId" VARCHAR(128) NOT NULL,
    "inviterId" VARCHAR(128) NOT NULL,
    "inviteeEmail" VARCHAR(256) NOT NULL,
    "inviteeId" VARCHAR(128),
    "isCoach" BOOLEAN NOT NULL DEFAULT false,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "InstitutionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionInvite_token_key" ON "InstitutionInvite"("token");

-- CreateIndex
CREATE INDEX "InstitutionInvite_institutionId_idx" ON "InstitutionInvite"("institutionId");

-- CreateIndex
CREATE INDEX "InstitutionInvite_inviterId_idx" ON "InstitutionInvite"("inviterId");

-- CreateIndex
CREATE INDEX "InstitutionInvite_inviteeId_idx" ON "InstitutionInvite"("inviteeId");

-- CreateIndex
CREATE INDEX "InstitutionInvite_inviteeEmail_idx" ON "InstitutionInvite"("inviteeEmail");

-- CreateIndex
CREATE INDEX "InstitutionInvite_status_idx" ON "InstitutionInvite"("status");

-- AddForeignKey
ALTER TABLE "InstitutionInvite" ADD CONSTRAINT "InstitutionInvite_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionInvite" ADD CONSTRAINT "InstitutionInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionInvite" ADD CONSTRAINT "InstitutionInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
