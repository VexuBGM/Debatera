-- CreateEnum
CREATE TYPE "JudgeRole" AS ENUM ('CHAIR', 'PANELIST');

-- AlterTable
ALTER TABLE "TournamentDebateJudge" ADD COLUMN     "role" "JudgeRole" NOT NULL DEFAULT 'PANELIST';

-- CreateIndex
CREATE INDEX "TournamentDebateJudge_role_idx" ON "TournamentDebateJudge"("role");
