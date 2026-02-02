import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { InstitutionRole } from '@prisma/client';

export const runtime = 'nodejs';

/**
 * GET /api/institutions/admin
 * Returns institutions where current user is ADMIN.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  try {
    const institutions = await prisma.institution.findMany({
      where: {
        members: {
          some: {
            userId,
            role: InstitutionRole.ADMIN,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(institutions, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
