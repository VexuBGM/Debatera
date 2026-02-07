-- CreateEnum
CREATE TYPE "TournamentRoundStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "TournamentRound" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TournamentRoundStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentDebate" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "propTeamId" VARCHAR(128),
    "oppTeamId" VARCHAR(128),
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentDebate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentDebateJudge" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentDebateJudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentRound_tournamentId_idx" ON "TournamentRound"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRound_tournamentId_number_key" ON "TournamentRound"("tournamentId", "number");

-- CreateIndex
CREATE INDEX "TournamentDebate_roundId_idx" ON "TournamentDebate"("roundId");

-- CreateIndex
CREATE INDEX "TournamentDebate_propTeamId_idx" ON "TournamentDebate"("propTeamId");

-- CreateIndex
CREATE INDEX "TournamentDebate_oppTeamId_idx" ON "TournamentDebate"("oppTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDebate_roundId_order_key" ON "TournamentDebate"("roundId", "order");

-- CreateIndex
CREATE INDEX "TournamentDebateJudge_debateId_idx" ON "TournamentDebateJudge"("debateId");

-- CreateIndex
CREATE INDEX "TournamentDebateJudge_participantId_idx" ON "TournamentDebateJudge"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDebateJudge_debateId_participantId_key" ON "TournamentDebateJudge"("debateId", "participantId");

-- AddForeignKey
ALTER TABLE "TournamentRound" ADD CONSTRAINT "TournamentRound_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDebate" ADD CONSTRAINT "TournamentDebate_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "TournamentRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDebate" ADD CONSTRAINT "TournamentDebate_propTeamId_fkey" FOREIGN KEY ("propTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDebate" ADD CONSTRAINT "TournamentDebate_oppTeamId_fkey" FOREIGN KEY ("oppTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDebateJudge" ADD CONSTRAINT "TournamentDebateJudge_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentDebateJudge" ADD CONSTRAINT "TournamentDebateJudge_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
