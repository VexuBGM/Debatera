-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_judgeUserId_fkey";
ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_matchId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Feedback_judgeUserId_idx";
DROP INDEX IF EXISTS "Feedback_matchId_idx";
DROP INDEX IF EXISTS "Feedback_matchId_judgeUserId_key";

-- DropTable
DROP TABLE IF EXISTS "Feedback";

-- DropEnum (only if not used elsewhere)
DROP TYPE IF EXISTS "FeedbackWinner";
