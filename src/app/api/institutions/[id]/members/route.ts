import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { InstitutionRole } from '@prisma/client';
import { parsePaginationParams, paginationToSkipTake, buildPaginationMeta } from '@/lib/pagination';

export const runtime = 'nodejs';

/**
 * GET /api/institutions/[id]/members
 * Auth: requester must be ADMIN of institution.
 * Returns paginated members with user info + role.
 * Supports ?page=1&pageSize=20 query params.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDB();

  const { id: institutionId } = await params;

  try {
    const membership = await prisma.institutionMember.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: { role: true },
    });

    if (!membership || membership.role !== InstitutionRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationParams(searchParams);
    const { skip, take } = paginationToSkipTake(pagination);
    const where = { institutionId };

    const [members, total] = await Promise.all([
      prisma.institutionMember.findMany({
        where,
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              imageUrl: true,
            },
          },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        skip,
        take,
      }),
      prisma.institutionMember.count({ where }),
    ]);

    return NextResponse.json(
      { data: members, pagination: buildPaginationMeta(total, pagination) },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
