-- CreateTable
CREATE TABLE "TournamentParticipantAccessLink" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "participantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentParticipantAccessLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipantAccessLink_participantId_key" ON "TournamentParticipantAccessLink"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipantAccessLink_tokenHash_key" ON "TournamentParticipantAccessLink"("tokenHash");

-- CreateIndex
CREATE INDEX "TournamentParticipantAccessLink_tournamentId_idx" ON "TournamentParticipantAccessLink"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentParticipantAccessLink_tokenHash_idx" ON "TournamentParticipantAccessLink"("tokenHash");

-- AddForeignKey
ALTER TABLE "TournamentParticipantAccessLink" ADD CONSTRAINT "TournamentParticipantAccessLink_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipantAccessLink" ADD CONSTRAINT "TournamentParticipantAccessLink_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
