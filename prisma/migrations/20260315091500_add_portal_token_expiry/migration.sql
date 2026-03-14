ALTER TABLE "TournamentParticipantAccessLink"
ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '14 days');

CREATE INDEX "TournamentParticipantAccessLink_expiresAt_idx"
ON "TournamentParticipantAccessLink"("expiresAt");
