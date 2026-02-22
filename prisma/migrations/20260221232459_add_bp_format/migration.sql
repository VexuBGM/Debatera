-- CreateEnum
CREATE TYPE "DebateTeamPosition" AS ENUM ('WSDC_PROP', 'WSDC_OPP', 'BP_OG', 'BP_OO', 'BP_CG', 'BP_CO');

-- AlterEnum
ALTER TYPE "DebateFormat" ADD VALUE 'BP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SpeechRole" ADD VALUE 'BP_PM';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_LO';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_DPM';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_DLO';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_MG';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_MO';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_GW';
ALTER TYPE "SpeechRole" ADD VALUE 'BP_OW';

-- AlterTable
ALTER TABLE "TournamentSettings" ADD COLUMN     "rankPointsFirst" INTEGER DEFAULT 3,
ADD COLUMN     "rankPointsFourth" INTEGER DEFAULT 0,
ADD COLUMN     "rankPointsSecond" INTEGER DEFAULT 2,
ADD COLUMN     "rankPointsThird" INTEGER DEFAULT 1,
ADD COLUMN     "speakerScaleMax" INTEGER,
ADD COLUMN     "speakerScaleMin" INTEGER;

-- CreateTable
CREATE TABLE "TournamentDebateTeamSlot" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "teamId" VARCHAR(128) NOT NULL,
    "position" "DebateTeamPosition" NOT NULL,

    CONSTRAINT "TournamentDebateTeamSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BallotTeamRanking" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "position" "DebateTeamPosition" NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamPoints" INTEGER NOT NULL,

    CONSTRAINT "BallotTeamRanking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BpDebateTeamResult" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "teamId" VARCHAR(128) NOT NULL,
    "position" "DebateTeamPosition" NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamPoints" INTEGER NOT NULL,
    "totalSpeakerPoints" DECIMAL(5,1) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BpDebateTeamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentDebateTeamSlot_debateId_idx" ON "TournamentDebateTeamSlot"("debateId");

-- CreateIndex
CREATE INDEX "TournamentDebateTeamSlot_teamId_idx" ON "TournamentDebateTeamSlot"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDebateTeamSlot_debateId_position_key" ON "TournamentDebateTeamSlot"("debateId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDebateTeamSlot_debateId_teamId_key" ON "TournamentDebateTeamSlot"("debateId", "teamId");

-- CreateIndex
CREATE INDEX "BallotTeamRanking_ballotId_idx" ON "BallotTeamRanking"("ballotId");

-- CreateIndex
CREATE UNIQUE INDEX "BallotTeamRanking_ballotId_position_key" ON "BallotTeamRanking"("ballotId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BallotTeamRanking_ballotId_rank_key" ON "BallotTeamRanking"("ballotId", "rank");

-- CreateIndex
CREATE INDEX "BpDebateTeamResult_debateId_idx" ON "BpDebateTeamResult"("debateId");

-- CreateIndex
CREATE INDEX "BpDebateTeamResult_teamId_idx" ON "BpDebateTeamResult"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "BpDebateTeamResult_debateId_teamId_key" ON "BpDebateTeamResult"("debateId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "BpDebateTeamResult_debateId_position_key" ON "BpDebateTeamResult"("debateId", "position");

-- AddForeignKey
ALTER TABLE "TournamentDebateTeamSlot" ADD CONSTRAINT "TournamentDebateTeamSlot_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDebateTeamSlot" ADD CONSTRAINT "TournamentDebateTeamSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotTeamRanking" ADD CONSTRAINT "BallotTeamRanking_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "Ballot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpDebateTeamResult" ADD CONSTRAINT "BpDebateTeamResult_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BpDebateTeamResult" ADD CONSTRAINT "BpDebateTeamResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
