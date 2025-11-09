/*
  Warnings:

  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamInvite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamMember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Team" DROP CONSTRAINT "Team_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeamInvite" DROP CONSTRAINT "TeamInvite_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeamInvite" DROP CONSTRAINT "TeamInvite_teamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- DropTable
DROP TABLE "public"."Team";

-- DropTable
DROP TABLE "public"."TeamInvite";

-- DropTable
DROP TABLE "public"."TeamMember";

-- CreateTable
CREATE TABLE "TournamentInstitutionRegistration" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "institutionId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredById" VARCHAR(128) NOT NULL,

    CONSTRAINT "TournamentInstitutionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentInstitutionRegistration_tournamentId_idx" ON "TournamentInstitutionRegistration"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentInstitutionRegistration_institutionId_idx" ON "TournamentInstitutionRegistration"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentInstitutionRegistration_tournamentId_institutionI_key" ON "TournamentInstitutionRegistration"("tournamentId", "institutionId");

-- AddForeignKey
ALTER TABLE "TournamentInstitutionRegistration" ADD CONSTRAINT "TournamentInstitutionRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInstitutionRegistration" ADD CONSTRAINT "TournamentInstitutionRegistration_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
