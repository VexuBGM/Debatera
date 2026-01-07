/*
  Warnings:

  - You are about to drop the `DebateMeeting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DebateMeetingInvite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DebateMeetingInvite" DROP CONSTRAINT "DebateMeetingInvite_meetingId_fkey";

-- DropTable
DROP TABLE "DebateMeeting";

-- DropTable
DROP TABLE "DebateMeetingInvite";
