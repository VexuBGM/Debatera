-- CreateEnum
CREATE TYPE "BallotStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('PROPOSITION', 'OPPOSITION');

-- CreateEnum
CREATE TYPE "SpeechRole" AS ENUM ('PROP_1', 'OPP_1', 'PROP_2', 'OPP_2', 'PROP_3', 'OPP_3', 'OPP_REPLY', 'PROP_REPLY');

-- CreateTable
CREATE TABLE "Ballot" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "adjudicatorId" TEXT NOT NULL,
    "status" "BallotStatus" NOT NULL DEFAULT 'DRAFT',
    "vote" "Side",
    "propTotal" DECIMAL(5,1),
    "oppTotal" DECIMAL(5,1),
    "privateNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BallotSpeech" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "role" "SpeechRole" NOT NULL,
    "side" "Side" NOT NULL,
    "speakerId" TEXT,
    "speakerName" TEXT,
    "score" DECIMAL(4,1),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BallotSpeech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateResult" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "winningSide" "Side" NOT NULL,
    "winningTeamId" VARCHAR(128),
    "propTotalAvg" DECIMAL(5,1),
    "oppTotalAvg" DECIMAL(5,1),
    "voteProp" INTEGER NOT NULL DEFAULT 0,
    "voteOpp" INTEGER NOT NULL DEFAULT 0,
    "decidedByChair" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_adjudicatorId_key" ON "Ballot"("adjudicatorId");

-- CreateIndex
CREATE INDEX "Ballot_debateId_idx" ON "Ballot"("debateId");

-- CreateIndex
CREATE INDEX "Ballot_adjudicatorId_idx" ON "Ballot"("adjudicatorId");

-- CreateIndex
CREATE INDEX "Ballot_status_idx" ON "Ballot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_debateId_adjudicatorId_key" ON "Ballot"("debateId", "adjudicatorId");

-- CreateIndex
CREATE INDEX "BallotSpeech_ballotId_idx" ON "BallotSpeech"("ballotId");

-- CreateIndex
CREATE INDEX "BallotSpeech_speakerId_idx" ON "BallotSpeech"("speakerId");

-- CreateIndex
CREATE UNIQUE INDEX "BallotSpeech_ballotId_role_key" ON "BallotSpeech"("ballotId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "DebateResult_debateId_key" ON "DebateResult"("debateId");

-- CreateIndex
CREATE INDEX "DebateResult_debateId_idx" ON "DebateResult"("debateId");

-- CreateIndex
CREATE INDEX "DebateResult_winningTeamId_idx" ON "DebateResult"("winningTeamId");

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_adjudicatorId_fkey" FOREIGN KEY ("adjudicatorId") REFERENCES "TournamentDebateJudge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotSpeech" ADD CONSTRAINT "BallotSpeech_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "Ballot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallotSpeech" ADD CONSTRAINT "BallotSpeech_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "TournamentTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateResult" ADD CONSTRAINT "DebateResult_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateResult" ADD CONSTRAINT "DebateResult_winningTeamId_fkey" FOREIGN KEY ("winningTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
