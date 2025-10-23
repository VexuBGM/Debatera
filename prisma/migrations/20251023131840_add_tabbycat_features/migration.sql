-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'LIVE', 'COMPLETED');
CREATE TYPE "RoundStage" AS ENUM ('PRELIMINARY', 'BREAK', 'FINAL');
CREATE TYPE "CheckInStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');
CREATE TYPE "BallotStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- AlterTable Tournament - Add new fields
ALTER TABLE "Tournament" ADD COLUMN "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Tournament" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "Tournament" ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Team - Add new fields
ALTER TABLE "Team" ADD COLUMN "isRegistered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Team" ADD COLUMN "speakerNames" TEXT;

-- AlterTable Debate - Add new fields
ALTER TABLE "Debate" ADD COLUMN "roundId" UUID;
ALTER TABLE "Debate" ADD COLUMN "venueId" UUID;
ALTER TABLE "Debate" ADD COLUMN "streamCallId" TEXT;

-- CreateTable Adjudicator
CREATE TABLE "Adjudicator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRegistered" BOOLEAN NOT NULL DEFAULT true,
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjudicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable Speaker
CREATE TABLE "Speaker" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "speakOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable Venue
CREATE TABLE "Venue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable Round
CREATE TABLE "Round" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "seq" INTEGER NOT NULL,
    "stage" "RoundStage" NOT NULL DEFAULT 'PRELIMINARY',
    "isDrawReleased" BOOLEAN NOT NULL DEFAULT false,
    "isMotionReleased" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable Motion
CREATE TABLE "Motion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL,
    "roundId" UUID,
    "text" TEXT NOT NULL,
    "infoSlide" TEXT,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Motion_pkey" PRIMARY KEY ("id")
);

-- CreateTable Ballot
CREATE TABLE "Ballot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debateId" UUID NOT NULL,
    "adjudicatorId" UUID NOT NULL,
    "winningSide" "DebateSide",
    "propScore" DOUBLE PRECISION,
    "oppScore" DOUBLE PRECISION,
    "comments" TEXT,
    "status" "BallotStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("id")
);

-- CreateTable TeamCheckIn
CREATE TABLE "TeamCheckIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "roundSeq" INTEGER NOT NULL,
    "status" "CheckInStatus" NOT NULL,
    "checkedInBy" UUID NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable AdjudicatorCheckIn
CREATE TABLE "AdjudicatorCheckIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournamentId" UUID NOT NULL,
    "adjudicatorId" UUID NOT NULL,
    "roundSeq" INTEGER NOT NULL,
    "status" "CheckInStatus" NOT NULL,
    "checkedInBy" UUID NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjudicatorCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Team_isRegistered_idx" ON "Team"("isRegistered");
CREATE INDEX "Debate_roundId_idx" ON "Debate"("roundId");
CREATE INDEX "Debate_venueId_idx" ON "Debate"("venueId");

CREATE UNIQUE INDEX "Adjudicator_tournamentId_userId_key" ON "Adjudicator"("tournamentId", "userId");
CREATE INDEX "Adjudicator_tournamentId_idx" ON "Adjudicator"("tournamentId");
CREATE INDEX "Adjudicator_userId_idx" ON "Adjudicator"("userId");

CREATE UNIQUE INDEX "Speaker_teamId_userId_key" ON "Speaker"("teamId", "userId");
CREATE INDEX "Speaker_teamId_idx" ON "Speaker"("teamId");
CREATE INDEX "Speaker_userId_idx" ON "Speaker"("userId");

CREATE INDEX "Venue_tournamentId_idx" ON "Venue"("tournamentId");

CREATE UNIQUE INDEX "Round_tournamentId_seq_key" ON "Round"("tournamentId", "seq");
CREATE INDEX "Round_tournamentId_idx" ON "Round"("tournamentId");

CREATE INDEX "Motion_tournamentId_idx" ON "Motion"("tournamentId");
CREATE INDEX "Motion_roundId_idx" ON "Motion"("roundId");

CREATE UNIQUE INDEX "Ballot_debateId_adjudicatorId_key" ON "Ballot"("debateId", "adjudicatorId");
CREATE INDEX "Ballot_debateId_idx" ON "Ballot"("debateId");
CREATE INDEX "Ballot_adjudicatorId_idx" ON "Ballot"("adjudicatorId");

CREATE UNIQUE INDEX "TeamCheckIn_tournamentId_teamId_roundSeq_key" ON "TeamCheckIn"("tournamentId", "teamId", "roundSeq");
CREATE INDEX "TeamCheckIn_tournamentId_roundSeq_idx" ON "TeamCheckIn"("tournamentId", "roundSeq");

CREATE UNIQUE INDEX "AdjudicatorCheckIn_tournamentId_adjudicatorId_roundSeq_key" ON "AdjudicatorCheckIn"("tournamentId", "adjudicatorId", "roundSeq");
CREATE INDEX "AdjudicatorCheckIn_tournamentId_roundSeq_idx" ON "AdjudicatorCheckIn"("tournamentId", "roundSeq");

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Adjudicator" ADD CONSTRAINT "Adjudicator_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Adjudicator" ADD CONSTRAINT "Adjudicator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Speaker" ADD CONSTRAINT "Speaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Speaker" ADD CONSTRAINT "Speaker_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Venue" ADD CONSTRAINT "Venue_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Round" ADD CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Motion" ADD CONSTRAINT "Motion_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Motion" ADD CONSTRAINT "Motion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "Debate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ballot" ADD CONSTRAINT "Ballot_adjudicatorId_fkey" FOREIGN KEY ("adjudicatorId") REFERENCES "Adjudicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCheckIn" ADD CONSTRAINT "TeamCheckIn_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamCheckIn" ADD CONSTRAINT "TeamCheckIn_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamCheckIn" ADD CONSTRAINT "TeamCheckIn_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdjudicatorCheckIn" ADD CONSTRAINT "AdjudicatorCheckIn_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdjudicatorCheckIn" ADD CONSTRAINT "AdjudicatorCheckIn_adjudicatorId_fkey" FOREIGN KEY ("adjudicatorId") REFERENCES "Adjudicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdjudicatorCheckIn" ADD CONSTRAINT "AdjudicatorCheckIn_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
