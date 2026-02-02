-- Migration: Remove Feedback, Room, Match, Round, TournamentRegistration tables
-- Date: 2026-01-28
-- This migration removes the feedback and debate/match functionality temporarily

-- DropForeignKey for Room
ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "Room_matchId_fkey";

-- DropForeignKey for Match
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_roundId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_affRegistrationId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT IF EXISTS "Match_negRegistrationId_fkey";

-- DropForeignKey for Round
ALTER TABLE "Round" DROP CONSTRAINT IF EXISTS "Round_tournamentId_fkey";

-- DropForeignKey for TournamentRegistration
ALTER TABLE "TournamentRegistration" DROP CONSTRAINT IF EXISTS "TournamentRegistration_tournamentId_fkey";
ALTER TABLE "TournamentRegistration" DROP CONSTRAINT IF EXISTS "TournamentRegistration_institutionId_fkey";

-- DropForeignKey for Feedback
ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_judgeUserId_fkey";
ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_matchId_fkey";

-- DropIndex for Feedback
DROP INDEX IF EXISTS "Feedback_judgeUserId_idx";
DROP INDEX IF EXISTS "Feedback_matchId_idx";
DROP INDEX IF EXISTS "Feedback_matchId_judgeUserId_key";

-- DropIndex for Room
DROP INDEX IF EXISTS "Room_matchId_key";

-- DropIndex for Match
DROP INDEX IF EXISTS "Match_affRegistrationId_idx";
DROP INDEX IF EXISTS "Match_negRegistrationId_idx";
DROP INDEX IF EXISTS "Match_roundId_idx";

-- DropIndex for Round
DROP INDEX IF EXISTS "Round_tournamentId_idx";
DROP INDEX IF EXISTS "Round_tournamentId_number_key";

-- DropIndex for TournamentRegistration
DROP INDEX IF EXISTS "TournamentRegistration_institutionId_idx";
DROP INDEX IF EXISTS "TournamentRegistration_tournamentId_idx";
DROP INDEX IF EXISTS "TournamentRegistration_tournamentId_institutionId_key";

-- DropTable (order matters due to foreign key dependencies)
DROP TABLE IF EXISTS "Feedback";
DROP TABLE IF EXISTS "Room";
DROP TABLE IF EXISTS "Match";
DROP TABLE IF EXISTS "Round";
DROP TABLE IF EXISTS "TournamentRegistration";

-- DropEnum (only if not used elsewhere)
DROP TYPE IF EXISTS "FeedbackWinner";
DROP TYPE IF EXISTS "RegistrationStatus";
