-- AlterTable
ALTER TABLE "TournamentParticipantAccessLink" ADD COLUMN IF NOT EXISTS "encryptedToken" TEXT;
