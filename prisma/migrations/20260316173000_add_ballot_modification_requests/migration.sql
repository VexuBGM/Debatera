CREATE TYPE "BallotModificationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Ballot"
ADD COLUMN "reopenedAt" TIMESTAMP(3),
ADD COLUMN "reopenedByUserId" VARCHAR(128);

CREATE TABLE "BallotModificationRequest" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "requestedByParticipantId" TEXT NOT NULL,
    "status" "BallotModificationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "resolutionNote" TEXT,
    "resolvedByUserId" VARCHAR(128),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BallotModificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ballot_reopenedByUserId_idx" ON "Ballot"("reopenedByUserId");
CREATE INDEX "BallotModificationRequest_ballotId_idx" ON "BallotModificationRequest"("ballotId");
CREATE INDEX "BallotModificationRequest_requestedByParticipantId_idx" ON "BallotModificationRequest"("requestedByParticipantId");
CREATE INDEX "BallotModificationRequest_status_idx" ON "BallotModificationRequest"("status");
CREATE INDEX "BallotModificationRequest_resolvedByUserId_idx" ON "BallotModificationRequest"("resolvedByUserId");

ALTER TABLE "Ballot"
ADD CONSTRAINT "Ballot_reopenedByUserId_fkey"
FOREIGN KEY ("reopenedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BallotModificationRequest"
ADD CONSTRAINT "BallotModificationRequest_ballotId_fkey"
FOREIGN KEY ("ballotId") REFERENCES "Ballot"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BallotModificationRequest"
ADD CONSTRAINT "BallotModificationRequest_requestedByParticipantId_fkey"
FOREIGN KEY ("requestedByParticipantId") REFERENCES "TournamentParticipant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BallotModificationRequest"
ADD CONSTRAINT "BallotModificationRequest_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
