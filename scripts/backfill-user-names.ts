/**
 * Backfill script – populate firstName / lastName for existing DB users from Clerk.
 *
 * Usage:
 *   npx tsx scripts/backfill-user-names.ts
 * or:
 *   npm run backfill:user-names
 *
 * Safe to run multiple times (idempotent).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createClerkClient } from '@clerk/backend';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🔍 Finding users missing firstName or lastName…');

  const users = await prisma.user.findMany({
    where: {
      OR: [{ firstName: null }, { lastName: null }],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  console.log(`  Found ${users.length} user(s) to backfill.\n`);

  let updated = 0;
  let skipped = 0;
  let errored = 0;

  for (const dbUser of users) {
    try {
      const clerkUser = await clerk.users.getUser(dbUser.id);

      const firstName = clerkUser.firstName ?? null;
      const lastName = clerkUser.lastName ?? null;

      // Skip if Clerk also has no names
      if (!firstName && !lastName) {
        console.log(`  ⏭  ${dbUser.id} (${dbUser.email ?? 'no email'}) – Clerk has no name either, skipping.`);
        skipped++;
        continue;
      }

      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
        },
      });

      console.log(`  ✅ ${dbUser.id} → ${firstName ?? ''} ${lastName ?? ''}`);
      updated++;
    } catch (err: any) {
      // Clerk returns 404 if the user has been deleted
      if (err?.status === 404 || err?.clerkError) {
        console.warn(`  ⚠️  ${dbUser.id} – not found in Clerk, skipping.`);
        skipped++;
      } else {
        console.error(`  ❌ ${dbUser.id} – unexpected error:`, err);
        errored++;
      }
    }
  }

  console.log('\n📊 Summary');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errored}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
