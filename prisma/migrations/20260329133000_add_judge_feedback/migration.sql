-- Add stable public feedback codes to teams.
ALTER TABLE "TournamentTeam"
ADD COLUMN "feedbackCode" VARCHAR(6) DEFAULT SUBSTRING(UPPER(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT)), 1, 6);

WITH ranked_teams AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "tournamentId" ORDER BY "createdAt", "id") AS team_number
  FROM "TournamentTeam"
)
UPDATE "TournamentTeam" AS team
SET "feedbackCode" = UPPER(LPAD(TO_HEX(ranked_teams.team_number), 6, '0'))
FROM ranked_teams
WHERE ranked_teams."id" = team."id";

ALTER TABLE "TournamentTeam"
ALTER COLUMN "feedbackCode" SET NOT NULL;

CREATE UNIQUE INDEX "TournamentTeam_tournamentId_feedbackCode_key"
ON "TournamentTeam"("tournamentId", "feedbackCode");

-- Store team-submitted judge feedback with organizer moderation.
CREATE TABLE "JudgeFeedback" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "judgeParticipantId" TEXT NOT NULL,
    "submittingTeamId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgeFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JudgeFeedback_debateId_judgeParticipantId_submittingTeamId_key"
ON "JudgeFeedback"("debateId", "judgeParticipantId", "submittingTeamId");

CREATE INDEX "JudgeFeedback_debateId_idx" ON "JudgeFeedback"("debateId");
CREATE INDEX "JudgeFeedback_judgeParticipantId_idx" ON "JudgeFeedback"("judgeParticipantId");
CREATE INDEX "JudgeFeedback_submittingTeamId_idx" ON "JudgeFeedback"("submittingTeamId");
CREATE INDEX "JudgeFeedback_isFlagged_idx" ON "JudgeFeedback"("isFlagged");

ALTER TABLE "JudgeFeedback"
ADD CONSTRAINT "JudgeFeedback_debateId_fkey"
FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JudgeFeedback"
ADD CONSTRAINT "JudgeFeedback_judgeParticipantId_fkey"
FOREIGN KEY ("judgeParticipantId") REFERENCES "TournamentParticipant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JudgeFeedback"
ADD CONSTRAINT "JudgeFeedback_submittingTeamId_fkey"
FOREIGN KEY ("submittingTeamId") REFERENCES "TournamentTeam"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
