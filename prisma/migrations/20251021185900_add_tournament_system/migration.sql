-- CreateEnum
CREATE TYPE "OrganizerRole" AS ENUM ('OWNER', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "RoundStage" AS ENUM ('PRELIM', 'ELIM');

-- AlterTable
ALTER TABLE "Debate" ADD COLUMN "roundId" UUID;

-- CreateTable
CREATE TABLE "TournamentOrganizer" (
    "tournamentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrganizerRole" NOT NULL DEFAULT 'ORGANIZER',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentOrganizer_pkey" PRIMARY KEY ("tournamentId","userId")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "stage" "RoundStage" NOT NULL DEFAULT 'PRELIM',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentOrganizer_userId_idx" ON "TournamentOrganizer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tournamentId_number_key" ON "Round"("tournamentId", "number");

-- CreateIndex
CREATE INDEX "Round_tournamentId_stage_isPublished_idx" ON "Round"("tournamentId", "stage", "isPublished");

-- CreateIndex
CREATE INDEX "Debate_roundId_idx" ON "Debate"("roundId");

-- AddForeignKey
ALTER TABLE "TournamentOrganizer" ADD CONSTRAINT "TournamentOrganizer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentOrganizer" ADD CONSTRAINT "TournamentOrganizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
