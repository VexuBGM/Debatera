-- AlterTable
ALTER TABLE "Debate" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DebateParticipant" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JudgeFeedback" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
