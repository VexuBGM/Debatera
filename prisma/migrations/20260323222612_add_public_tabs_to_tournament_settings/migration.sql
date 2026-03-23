-- AlterTable: add visible public tabs configuration for public tournaments
ALTER TABLE "TournamentSettings"
ADD COLUMN "publicTabs" TEXT[] DEFAULT ARRAY['overview', 'rounds', 'teams', 'standings']::TEXT[];
