/*
  Warnings:

  - The values [BALLOTING] on the enum `RoundStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Ballot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DebateResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SpeakerScore` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoundStatus_new" AS ENUM ('PLANNING', 'PUBLISHED', 'FINAL', 'CANCELLED');
ALTER TABLE "public"."Round" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Round" ALTER COLUMN "status" TYPE "RoundStatus_new" USING ("status"::text::"RoundStatus_new");
ALTER TYPE "RoundStatus" RENAME TO "RoundStatus_old";
ALTER TYPE "RoundStatus_new" RENAME TO "RoundStatus";
DROP TYPE "public"."RoundStatus_old";
ALTER TABLE "Round" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Ballot" DROP CONSTRAINT "Ballot_pairingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ballot" DROP CONSTRAINT "Ballot_winnerTeamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DebateResult" DROP CONSTRAINT "DebateResult_loserTeamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DebateResult" DROP CONSTRAINT "DebateResult_pairingId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DebateResult" DROP CONSTRAINT "DebateResult_winnerTeamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SpeakerScore" DROP CONSTRAINT "SpeakerScore_ballotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SpeakerScore" DROP CONSTRAINT "SpeakerScore_debateParticipantId_fkey";

-- AlterTable
ALTER TABLE "DebateParticipant" ALTER COLUMN "id" SET DEFAULT 'dpart_' || gen_random_uuid()::text;

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
ALTER TABLE "Tournament" ALTER COLUMN "id" SET DEFAULT 'tourn_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" ALTER COLUMN "id" SET DEFAULT 'reg_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentParticipation" ALTER COLUMN "id" SET DEFAULT 'part_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentTeam" ALTER COLUMN "id" SET DEFAULT 'team_' || gen_random_uuid()::text;

-- DropTable
DROP TABLE "public"."Ballot";

-- DropTable
DROP TABLE "public"."DebateResult";

-- DropTable
DROP TABLE "public"."SpeakerScore";

-- DropEnum
DROP TYPE "public"."BallotStatus";
