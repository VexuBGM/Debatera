-- DropForeignKey
ALTER TABLE "public"."Tournament" DROP CONSTRAINT "Tournament_ownerId_fkey";

-- CreateTable
CREATE TABLE "Teams" (
    "id" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamsUsers" (
    "teamId" VARCHAR(128) NOT NULL,
    "userId" VARCHAR(128) NOT NULL,

    CONSTRAINT "TeamsUsers_pkey" PRIMARY KEY ("teamId","userId")
);

-- AddForeignKey
ALTER TABLE "TeamsUsers" ADD CONSTRAINT "TeamsUsers_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamsUsers" ADD CONSTRAINT "TeamsUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
