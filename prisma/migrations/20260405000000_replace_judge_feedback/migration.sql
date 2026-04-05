-- Replace the old JudgeFeedback table (which tracked submitting team and used a single score)
-- with a new anonymous design (no submitter identity, two separate rating dimensions).

DROP TABLE IF EXISTS "JudgeFeedback";

-- Anonymous feedback submitted by debaters for a judge in a specific debate.
-- Linked to TournamentDebateJudge (debate + judge combo) rather than TournamentParticipant,
-- enabling precise per-judge-per-debate feedback while remaining fully anonymous.
CREATE TABLE "JudgeFeedback" (
    "id"             TEXT NOT NULL,
    "debateJudgeId"  TEXT NOT NULL,
    "clarityRating"  INTEGER NOT NULL,
    "fairnessRating" INTEGER NOT NULL,
    "comment"        TEXT,
    "submittedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JudgeFeedback_debateJudgeId_idx" ON "JudgeFeedback"("debateJudgeId");
CREATE INDEX "JudgeFeedback_submittedAt_idx"   ON "JudgeFeedback"("submittedAt");

ALTER TABLE "JudgeFeedback"
ADD CONSTRAINT "JudgeFeedback_debateJudgeId_fkey"
FOREIGN KEY ("debateJudgeId") REFERENCES "TournamentDebateJudge"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
