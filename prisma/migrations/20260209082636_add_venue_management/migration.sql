-- AlterTable
ALTER TABLE "TournamentDebate" ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueCategory" (
    "id" TEXT NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VenueToVenueCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VenueToVenueCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Venue_tournamentId_idx" ON "Venue"("tournamentId");

-- CreateIndex
CREATE INDEX "Venue_priority_idx" ON "Venue"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_tournamentId_name_key" ON "Venue"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "VenueCategory_tournamentId_idx" ON "VenueCategory"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueCategory_tournamentId_name_key" ON "VenueCategory"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "_VenueToVenueCategory_B_index" ON "_VenueToVenueCategory"("B");

-- CreateIndex
CREATE INDEX "TournamentDebate_venueId_idx" ON "TournamentDebate"("venueId");

-- AddForeignKey
ALTER TABLE "TournamentDebate" ADD CONSTRAINT "TournamentDebate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueCategory" ADD CONSTRAINT "VenueCategory_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueToVenueCategory" ADD CONSTRAINT "_VenueToVenueCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VenueToVenueCategory" ADD CONSTRAINT "_VenueToVenueCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "VenueCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
