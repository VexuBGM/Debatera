-- AlterTable
ALTER TABLE "Ballot" ALTER COLUMN "id" SET DEFAULT 'ballot_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "DebateParticipant" ALTER COLUMN "id" SET DEFAULT 'dpart_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "DebateResult" ALTER COLUMN "id" SET DEFAULT 'result_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "id" SET DEFAULT 'inst_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "InstitutionInvite" ALTER COLUMN "id" SET DEFAULT 'inv_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "InstitutionMember" ALTER COLUMN "id" SET DEFAULT 'imem_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Round" ALTER COLUMN "id" SET DEFAULT 'rnd_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairing" ALTER COLUMN "id" SET DEFAULT 'rpair_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairingJudge" ALTER COLUMN "id" SET DEFAULT 'rpj_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "SpeakerScore" ALTER COLUMN "id" SET DEFAULT 'score_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "id" SET DEFAULT 'tourn_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" ALTER COLUMN "id" SET DEFAULT 'reg_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentParticipation" ALTER COLUMN "id" SET DEFAULT 'part_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentTeam" ALTER COLUMN "id" SET DEFAULT 'team_' || gen_random_uuid()::text;

-- CreateTable
CREATE TABLE "DebateMeeting" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'meet_' || gen_random_uuid()::text,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creatorId" VARCHAR(128) NOT NULL,
    "callId" VARCHAR(256) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateMeetingInvite" (
    "id" VARCHAR(128) NOT NULL DEFAULT 'minv_' || gen_random_uuid()::text,
    "meetingId" VARCHAR(128) NOT NULL,
    "inviterId" VARCHAR(128) NOT NULL,
    "inviteeEmail" VARCHAR(256) NOT NULL,
    "inviteeId" VARCHAR(128),
    "role" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DebateMeetingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebateMeeting_creatorId_idx" ON "DebateMeeting"("creatorId");

-- CreateIndex
CREATE INDEX "DebateMeeting_callId_idx" ON "DebateMeeting"("callId");

-- CreateIndex
CREATE INDEX "DebateMeetingInvite_meetingId_idx" ON "DebateMeetingInvite"("meetingId");

-- CreateIndex
CREATE INDEX "DebateMeetingInvite_inviterId_idx" ON "DebateMeetingInvite"("inviterId");

-- CreateIndex
CREATE INDEX "DebateMeetingInvite_inviteeId_idx" ON "DebateMeetingInvite"("inviteeId");

-- CreateIndex
CREATE INDEX "DebateMeetingInvite_inviteeEmail_idx" ON "DebateMeetingInvite"("inviteeEmail");

-- CreateIndex
CREATE INDEX "DebateMeetingInvite_status_idx" ON "DebateMeetingInvite"("status");

-- AddForeignKey
ALTER TABLE "DebateMeetingInvite" ADD CONSTRAINT "DebateMeetingInvite_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "DebateMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
