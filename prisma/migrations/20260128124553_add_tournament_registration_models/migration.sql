/*
  Warnings:

  - You are about to drop the column `status` on the `Tournament` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TournamentInstitutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TournamentParticipantRole" AS ENUM ('DEBATER', 'JUDGE');

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "status",
ADD COLUMN     "registrationClosesAt" TIMESTAMP(3);

-- DropEnum
DROP TYPE "TournamentStatus";

-- CreateTable
CREATE TABLE "TournamentInstitution" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "institutionId" VARCHAR(128) NOT NULL,
    "status" "TournamentInstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "userId" VARCHAR(128) NOT NULL,
    "institutionId" VARCHAR(128) NOT NULL,
    "role" "TournamentParticipantRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentInstitution_tournamentId_idx" ON "TournamentInstitution"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentInstitution_institutionId_idx" ON "TournamentInstitution"("institutionId");

-- CreateIndex
CREATE INDEX "TournamentInstitution_requestedByUserId_idx" ON "TournamentInstitution"("requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentInstitution_tournamentId_institutionId_key" ON "TournamentInstitution"("tournamentId", "institutionId");

-- CreateIndex
CREATE INDEX "TournamentParticipant_tournamentId_idx" ON "TournamentParticipant"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentParticipant_userId_idx" ON "TournamentParticipant"("userId");

-- CreateIndex
CREATE INDEX "TournamentParticipant_institutionId_idx" ON "TournamentParticipant"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_userId_key" ON "TournamentParticipant"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "TournamentInstitution" ADD CONSTRAINT "TournamentInstitution_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInstitution" ADD CONSTRAINT "TournamentInstitution_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInstitution" ADD CONSTRAINT "TournamentInstitution_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
