import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/admin/tournaments/unverified
 * Get all unverified tournaments (admin only)
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Get all tournaments (both verified and unverified) with details
    const tournaments = await prisma.tournament.findMany({
      orderBy: [
        { isVerified: 'asc' }, // Unverified first
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            registeredInstitutions: true,
            participations: true,
            teams: true,
          },
        },
      },
    });

    return NextResponse.json(tournaments);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
