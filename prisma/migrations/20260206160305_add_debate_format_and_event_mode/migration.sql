-- CreateEnum
CREATE TYPE "DebateFormat" AS ENUM ('WSDC');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'IRL');

-- AlterTable
ALTER TABLE "TournamentSettings" ADD COLUMN     "debateFormat" "DebateFormat" NOT NULL DEFAULT 'WSDC',
ADD COLUMN     "eventMode" "EventMode" NOT NULL DEFAULT 'IRL';
