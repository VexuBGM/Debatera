-- ============================================================================
-- Person model (unregistered identity)
-- ============================================================================
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "emailNormalized" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "claimedByUserId" VARCHAR(128),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Person_emailNormalized_key" ON "Person"("emailNormalized");
CREATE INDEX "Person_emailNormalized_idx" ON "Person"("emailNormalized");
CREATE INDEX "Person_claimedByUserId_idx" ON "Person"("claimedByUserId");

ALTER TABLE "Person" ADD CONSTRAINT "Person_claimedByUserId_fkey"
    FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- InstitutionSource enum + Institution updates
-- ============================================================================
CREATE TYPE "InstitutionSource" AS ENUM ('SELF_REGISTERED', 'ORGANIZER_CREATED');

ALTER TABLE "Institution" ADD COLUMN "source" "InstitutionSource" NOT NULL DEFAULT 'SELF_REGISTERED';
ALTER TABLE "Institution" ADD COLUMN "createdByUserId" VARCHAR(128);

CREATE INDEX "Institution_createdByUserId_idx" ON "Institution"("createdByUserId");

ALTER TABLE "Institution" ADD CONSTRAINT "Institution_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- InstitutionRosterEntry
-- ============================================================================
CREATE TABLE "InstitutionRosterEntry" (
    "id" TEXT NOT NULL,
    "institutionId" VARCHAR(128) NOT NULL,
    "personId" TEXT NOT NULL,
    "createdByUserId" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionRosterEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstitutionRosterEntry_institutionId_personId_key"
    ON "InstitutionRosterEntry"("institutionId", "personId");
CREATE INDEX "InstitutionRosterEntry_institutionId_idx" ON "InstitutionRosterEntry"("institutionId");
CREATE INDEX "InstitutionRosterEntry_personId_idx" ON "InstitutionRosterEntry"("personId");

ALTER TABLE "InstitutionRosterEntry" ADD CONSTRAINT "InstitutionRosterEntry_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstitutionRosterEntry" ADD CONSTRAINT "InstitutionRosterEntry_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstitutionRosterEntry" ADD CONSTRAINT "InstitutionRosterEntry_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- TournamentParticipant: add personId, make userId optional
-- ============================================================================

-- Step 1: Add personId column as nullable first
ALTER TABLE "TournamentParticipant" ADD COLUMN "personId" TEXT;

-- Step 2: Backfill - create a Person for every existing TournamentParticipant
-- Each existing participant has a userId, so we create a Person from the User data
-- and link them.
INSERT INTO "Person" ("id", "emailNormalized", "firstName", "lastName", "claimedByUserId", "claimedAt", "createdAt", "updatedAt")
SELECT
    'pers_' || gen_random_uuid(),
    LOWER(TRIM(u."email")),
    COALESCE(u."firstName", 'Unknown'),
    COALESCE(u."lastName", 'User'),
    u."id",
    NOW(),
    NOW(),
    NOW()
FROM "User" u
WHERE u."id" IN (SELECT DISTINCT "userId" FROM "TournamentParticipant")
-- Skip users whose email already exists as a Person (handle duplicates)
AND NOT EXISTS (
    SELECT 1 FROM "Person" p WHERE p."emailNormalized" = LOWER(TRIM(u."email")) AND u."email" IS NOT NULL
);

-- Handle users with NULL or duplicate emails by creating without email
INSERT INTO "Person" ("id", "emailNormalized", "firstName", "lastName", "claimedByUserId", "claimedAt", "createdAt", "updatedAt")
SELECT
    'pers_' || gen_random_uuid(),
    NULL,
    COALESCE(u."firstName", 'Unknown'),
    COALESCE(u."lastName", 'User'),
    u."id",
    NOW(),
    NOW(),
    NOW()
FROM "User" u
WHERE u."id" IN (SELECT DISTINCT "userId" FROM "TournamentParticipant")
AND NOT EXISTS (
    SELECT 1 FROM "Person" p WHERE p."claimedByUserId" = u."id"
);

-- Step 3: Backfill personId on TournamentParticipant
UPDATE "TournamentParticipant" tp
SET "personId" = p."id"
FROM "Person" p
WHERE p."claimedByUserId" = tp."userId";

-- Step 4: Make personId NOT NULL now that backfill is complete
ALTER TABLE "TournamentParticipant" ALTER COLUMN "personId" SET NOT NULL;

-- Step 5: Make userId optional (drop NOT NULL)
ALTER TABLE "TournamentParticipant" ALTER COLUMN "userId" DROP NOT NULL;

-- Step 6: Drop old unique constraint on (tournamentId, userId) and re-create
-- The old constraint name may vary; drop by finding the correct one
DROP INDEX IF EXISTS "TournamentParticipant_tournamentId_userId_key";

-- Re-create unique constraints
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_personId_key"
    ON "TournamentParticipant"("tournamentId", "personId");
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_userId_key"
    ON "TournamentParticipant"("tournamentId", "userId");

-- Add indexes
CREATE INDEX "TournamentParticipant_personId_idx" ON "TournamentParticipant"("personId");

-- Add FK for personId
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old FK for userId (Cascade -> SetNull)
ALTER TABLE "TournamentParticipant" DROP CONSTRAINT IF EXISTS "TournamentParticipant_userId_fkey";
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ParticipantPrivateLink (Tabbycat-style secret URL tokens)
-- ============================================================================
CREATE TABLE "ParticipantPrivateLink" (
    "id" TEXT NOT NULL,
    "tournamentParticipantId" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" VARCHAR(128),

    CONSTRAINT "ParticipantPrivateLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParticipantPrivateLink_tournamentParticipantId_key"
    ON "ParticipantPrivateLink"("tournamentParticipantId");
CREATE INDEX "ParticipantPrivateLink_tokenHash_idx" ON "ParticipantPrivateLink"("tokenHash");
CREATE INDEX "ParticipantPrivateLink_expiresAt_idx" ON "ParticipantPrivateLink"("expiresAt");
CREATE INDEX "ParticipantPrivateLink_revokedAt_idx" ON "ParticipantPrivateLink"("revokedAt");

ALTER TABLE "ParticipantPrivateLink" ADD CONSTRAINT "ParticipantPrivateLink_tournamentParticipantId_fkey"
    FOREIGN KEY ("tournamentParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantPrivateLink" ADD CONSTRAINT "ParticipantPrivateLink_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
