-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INSTITUTION_INVITE', 'GENERAL');

-- AlterTable: Add unique constraint on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateTable
CREATE TABLE "InstitutionInvitation" (
    "id" VARCHAR(128) NOT NULL DEFAULT ('inv_'::text || (gen_random_uuid())::text),
    "institutionId" VARCHAR(128) NOT NULL,
    "invitedUserId" VARCHAR(128) NOT NULL,
    "createdByUserId" VARCHAR(128) NOT NULL,
    "role" "InstitutionRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "InstitutionInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" VARCHAR(128) NOT NULL DEFAULT ('notif_'::text || (gen_random_uuid())::text),
    "userId" VARCHAR(128) NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "entityType" VARCHAR(64),
    "entityId" VARCHAR(128),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstitutionInvitation_institutionId_idx" ON "InstitutionInvitation"("institutionId");

-- CreateIndex
CREATE INDEX "InstitutionInvitation_invitedUserId_idx" ON "InstitutionInvitation"("invitedUserId");

-- CreateIndex
CREATE INDEX "InstitutionInvitation_status_idx" ON "InstitutionInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionInvitation_institutionId_invitedUserId_status_key" ON "InstitutionInvitation"("institutionId", "invitedUserId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "InstitutionInvitation" ADD CONSTRAINT "InstitutionInvitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionInvitation" ADD CONSTRAINT "InstitutionInvitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionInvitation" ADD CONSTRAINT "InstitutionInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
