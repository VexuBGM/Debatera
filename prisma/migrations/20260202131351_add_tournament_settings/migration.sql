-- CreateTable
CREATE TABLE "TournamentSettings" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "teamSizeMin" INTEGER NOT NULL DEFAULT 2,
    "teamSizeMax" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentSettings_tournamentId_key" ON "TournamentSettings"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentSettings_tournamentId_idx" ON "TournamentSettings"("tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentSettings" ADD CONSTRAINT "TournamentSettings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
