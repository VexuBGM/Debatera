-- CreateTable
CREATE TABLE "DebateStopwatch" (
    "id" TEXT NOT NULL,
    "debateId" VARCHAR(128) NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "startedAtMs" BIGINT,
    "baseElapsedMs" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateStopwatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebateStopwatch_debateId_key" ON "DebateStopwatch"("debateId");

-- CreateIndex
CREATE INDEX "DebateStopwatch_debateId_idx" ON "DebateStopwatch"("debateId");

-- AddForeignKey
ALTER TABLE "DebateStopwatch" ADD CONSTRAINT "DebateStopwatch_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "TournamentDebate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
