-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" VARCHAR(128),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" VARCHAR(128),
ADD COLUMN     "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "TournamentParticipation" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" VARCHAR(128),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" VARCHAR(128),
ADD COLUMN     "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "TournamentInstitutionRegistration_status_idx" ON "TournamentInstitutionRegistration"("status");

-- CreateIndex
CREATE INDEX "TournamentParticipation_status_idx" ON "TournamentParticipation"("status");
