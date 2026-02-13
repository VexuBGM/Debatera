-- CreateEnum
CREATE TYPE "VideoCallKind" AS ENUM ('DEBATE');

-- CreateTable
CREATE TABLE "VideoCall" (
    "id" TEXT NOT NULL,
    "kind" "VideoCallKind" NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "debateId" VARCHAR(128),
    "callType" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoCall_debateId_key" ON "VideoCall"("debateId");

-- CreateIndex
CREATE INDEX "VideoCall_tournamentId_kind_idx" ON "VideoCall"("tournamentId", "kind");

-- CreateIndex
CREATE INDEX "VideoCall_debateId_idx" ON "VideoCall"("debateId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCall_kind_debateId_key" ON "VideoCall"("kind", "debateId");

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
