import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/institutions/me
 * Get the current user's institution membership with all members included
 * This is optimized to avoid N+1 queries
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user's institution membership
    const membership = await prisma.institutionMember.findUnique({
      where: { userId },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(null, { status: 200 });
    }

    // Fetch all members of the institution in one query
    const members = await prisma.institutionMember.findMany({
      where: { institutionId: membership.institutionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [
        { isCoach: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json({
      id: membership.institution.id,
      name: membership.institution.name,
      description: membership.institution.description,
      isCoach: membership.isCoach,
      members,
    }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
