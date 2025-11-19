-- CreateEnum
CREATE TYPE "BallotStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'SUBMITTED', 'CONFIRMED', 'VOIDED');

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

-- CreateTable
CREATE TABLE "Ballot" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'ballot_' || gen_random_uuid()::text,
    "pairingId" VARCHAR(128) NOT NULL,
    "judgeId" VARCHAR(128) NOT NULL,
    "isChair" BOOLEAN NOT NULL DEFAULT false,
    "status" "BallotStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "winnerTeamId" VARCHAR(128),
    "propFeedback" TEXT,
    "oppFeedback" TEXT,
    "comments" TEXT,
    "privateNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakerScore" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'score_' || gen_random_uuid()::text,
    "ballotId" VARCHAR(128) NOT NULL,
    "debateParticipantId" VARCHAR(128) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakerScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateResult" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'result_' || gen_random_uuid()::text,
    "pairingId" VARCHAR(128) NOT NULL,
    "winnerTeamId" VARCHAR(128) NOT NULL,
    "loserTeamId" VARCHAR(128) NOT NULL,
    "panelSplit" TEXT,
    "propTotalScore" DOUBLE PRECISION,
    "oppTotalScore" DOUBLE PRECISION,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ballot_pairingId_idx" ON "Ballot"("pairingId");

-- CreateIndex
CREATE INDEX "Ballot_judgeId_idx" ON "Ballot"("judgeId");

-- CreateIndex
CREATE INDEX "Ballot_winnerTeamId_idx" ON "Ballot"("winnerTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_pairingId_judgeId_key" ON "Ballot"("pairingId", "judgeId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerScore_debateParticipantId_key" ON "SpeakerScore"("debateParticipantId");

-- CreateIndex
CREATE INDEX "SpeakerScore_ballotId_idx" ON "SpeakerScore"("ballotId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateResult_pairingId_key" ON "DebateResult"("pairingId");

-- CreateIndex
CREATE INDEX "DebateResult_pairingId_idx" ON "DebateResult"("pairingId");

-- CreateIndex
CREATE INDEX "DebateResult_winnerTeamId_idx" ON "DebateResult"("winnerTeamId");

-- CreateIndex
CREATE INDEX "DebateResult_loserTeamId_idx" ON "DebateResult"("loserTeamId");

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_pairingId_fkey" FOREIGN KEY ("pairingId") REFERENCES "RoundPairing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerScore" ADD CONSTRAINT "SpeakerScore_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "Ballot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerScore" ADD CONSTRAINT "SpeakerScore_debateParticipantId_fkey" FOREIGN KEY ("debateParticipantId") REFERENCES "DebateParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateResult" ADD CONSTRAINT "DebateResult_pairingId_fkey" FOREIGN KEY ("pairingId") REFERENCES "RoundPairing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateResult" ADD CONSTRAINT "DebateResult_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateResult" ADD CONSTRAINT "DebateResult_loserTeamId_fkey" FOREIGN KEY ("loserTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
