-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" VARCHAR(128),
ADD COLUMN     "pronouns" VARCHAR(64),
ADD COLUMN     "publicEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedProfileAt" TIMESTAMP(3);
