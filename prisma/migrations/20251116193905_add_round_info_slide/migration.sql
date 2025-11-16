-- AlterTable
ALTER TABLE "Institution" ALTER COLUMN "id" SET DEFAULT 'inst_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "InstitutionMember" ALTER COLUMN "id" SET DEFAULT 'imem_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "infoSlide" TEXT,
ALTER COLUMN "id" SET DEFAULT 'rnd_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairing" ALTER COLUMN "id" SET DEFAULT 'rpair_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "RoundPairingJudge" ALTER COLUMN "id" SET DEFAULT 'rpj_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "id" SET DEFAULT 'tourn_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentInstitutionRegistration" ALTER COLUMN "id" SET DEFAULT 'reg_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentParticipation" ALTER COLUMN "id" SET DEFAULT 'part_' || gen_random_uuid()::text;

-- AlterTable
ALTER TABLE "TournamentTeam" ALTER COLUMN "id" SET DEFAULT 'team_' || gen_random_uuid()::text;
