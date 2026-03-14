-- AlterTable
ALTER TABLE "Institution" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
