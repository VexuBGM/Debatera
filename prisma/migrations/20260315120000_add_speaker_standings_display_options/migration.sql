-- AlterTable: add speaker standings display options
ALTER TABLE "TournamentSettings" ADD COLUMN "speakerTopN" INTEGER;
ALTER TABLE "TournamentSettings" ADD COLUMN "hideSpeakerPoints" BOOLEAN NOT NULL DEFAULT false;
