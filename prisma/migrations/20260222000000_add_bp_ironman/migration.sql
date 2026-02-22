-- AlterTable: Add isIronman flag to TournamentSettings
ALTER TABLE "TournamentSettings" ADD COLUMN "isIronman" BOOLEAN NOT NULL DEFAULT false;

-- Add a CHECK constraint: isIronman can only be true when debateFormat is 'BP'
ALTER TABLE "TournamentSettings" ADD CONSTRAINT "chk_ironman_requires_bp"
  CHECK ("isIronman" = false OR "debateFormat" = 'BP');
