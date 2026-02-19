-- CreateEnum
CREATE TYPE "PairingSystem" AS ENUM ('SWISS', 'RANDOM', 'MANUAL');

-- AlterTable
ALTER TABLE "TournamentSettings" ADD COLUMN "pairingSystem" "PairingSystem" NOT NULL DEFAULT 'SWISS';
