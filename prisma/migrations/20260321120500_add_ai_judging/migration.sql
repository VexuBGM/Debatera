CREATE TYPE "AIJudgingStatus" AS ENUM (
    'PENDING',
    'CONTEXT_BUILDING',
    'ANALYZING',
    'SYNTHESIZING',
    'CALIBRATING',
    'WRITING_BALLOT',
    'COMPLETE',
    'FAILED'
);

CREATE TYPE "LensType" AS ENUM ('CONTENT', 'STRATEGY', 'ENGAGEMENT');

CREATE TABLE "AIJudgingSession" (
    "id" TEXT NOT NULL,
    "debateId" TEXT,
    "transcriptText" TEXT NOT NULL,
    "motion" TEXT NOT NULL,
    "infoSlide" TEXT,
    "status" "AIJudgingStatus" NOT NULL DEFAULT 'PENDING',
    "currentPhase" INTEGER NOT NULL DEFAULT 0,
    "currentSpeech" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "debateContext" JSONB,
    "calibration" JSONB,
    "finalBallot" JSONB,
    "finalScores" JSONB,
    "winner" TEXT,
    "modelsUsed" JSONB,
    "totalApiCalls" INTEGER NOT NULL DEFAULT 0,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AIJudgingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AILensAnalysis" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "lensType" "LensType" NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "speechAnalyses" JSONB NOT NULL DEFAULT '[]',
    "verdict" JSONB,
    "confidence" DOUBLE PRECISION,
    "currentMemory" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AILensAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AILensAnalysis_sessionId_lensType_key"
ON "AILensAnalysis"("sessionId", "lensType");

CREATE INDEX "AIJudgingSession_status_idx" ON "AIJudgingSession"("status");
CREATE INDEX "AIJudgingSession_debateId_idx" ON "AIJudgingSession"("debateId");
CREATE INDEX "AILensAnalysis_sessionId_idx" ON "AILensAnalysis"("sessionId");

ALTER TABLE "AILensAnalysis"
ADD CONSTRAINT "AILensAnalysis_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AIJudgingSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
