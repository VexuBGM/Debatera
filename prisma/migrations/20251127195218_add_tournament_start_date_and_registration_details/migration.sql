/*
  Warnings:

  - Added the required column `contactInfo` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('OPEN', 'APPROVAL');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "contactInfo" TEXT NOT NULL,
ADD COLUMN     "entryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationType" "RegistrationType" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" VARCHAR(128);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" VARCHAR(128) NOT NULL DEFAULT ('admin_'::text || (gen_random_uuid())::text),
    "adminId" VARCHAR(128) NOT NULL,
    "tournamentId" VARCHAR(128) NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAction_action_idx" ON "AdminAction"("action");

-- CreateIndex
CREATE INDEX "AdminAction_adminId_idx" ON "AdminAction"("adminId");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_tournamentId_idx" ON "AdminAction"("tournamentId");

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
