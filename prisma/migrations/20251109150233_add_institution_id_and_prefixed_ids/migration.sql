/*
  Warnings:

  - The primary key for the `Institution` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Institution` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - The primary key for the `InstitutionMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `InstitutionMember` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `institutionId` on the `InstitutionMember` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - The primary key for the `TournamentInstitutionRegistration` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TournamentInstitutionRegistration` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `institutionId` on the `TournamentInstitutionRegistration` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - The primary key for the `TournamentParticipation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TournamentParticipation` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `teamId` on the `TournamentParticipation` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - The primary key for the `TournamentTeam` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TournamentTeam` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.
  - You are about to alter the column `institutionId` on the `TournamentTeam` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.

*/
-- DropForeignKey
ALTER TABLE "public"."InstitutionMember" DROP CONSTRAINT "InstitutionMember_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TournamentInstitutionRegistration" DROP CONSTRAINT "TournamentInstitutionRegistration_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TournamentParticipation" DROP CONSTRAINT "TournamentParticipation_teamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TournamentTeam" DROP CONSTRAINT "TournamentTeam_institutionId_fkey";

-- AlterTable
ALTER TABLE "Institution" DROP CONSTRAINT "Institution_pkey",
ALTER COLUMN "id" SET DEFAULT 'inst_' || gen_random_uuid()::text,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ADD CONSTRAINT "Institution_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "InstitutionMember" DROP CONSTRAINT "InstitutionMember_pkey",
ALTER COLUMN "id" SET DEFAULT 'imem_' || gen_random_uuid()::text,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "institutionId" SET DATA TYPE VARCHAR(128),
ADD CONSTRAINT "InstitutionMember_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "id" SET DEFAULT 'tourn_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" DROP CONSTRAINT "TournamentInstitutionRegistration_pkey",
ALTER COLUMN "id" SET DEFAULT 'reg_' || gen_random_uuid()::text,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "institutionId" SET DATA TYPE VARCHAR(128),
ADD CONSTRAINT "TournamentInstitutionRegistration_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TournamentParticipation" DROP CONSTRAINT "TournamentParticipation_pkey",
ADD COLUMN     "institutionId" VARCHAR(128),
ALTER COLUMN "id" SET DEFAULT 'part_' || gen_random_uuid()::text,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "teamId" SET DATA TYPE VARCHAR(128),
ADD CONSTRAINT "TournamentParticipation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TournamentTeam" DROP CONSTRAINT "TournamentTeam_pkey",
ALTER COLUMN "id" SET DEFAULT 'team_' || gen_random_uuid()::text,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(128),
ALTER COLUMN "institutionId" SET DATA TYPE VARCHAR(128),
ADD CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "TournamentParticipation_institutionId_idx" ON "TournamentParticipation"("institutionId");

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipation" ADD CONSTRAINT "TournamentParticipation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipation" ADD CONSTRAINT "TournamentParticipation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentInstitutionRegistration" ADD CONSTRAINT "TournamentInstitutionRegistration_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
