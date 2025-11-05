import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/participations
 * List all participants (debaters and judges) in a tournament
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role'); // Optional filter by role

    const where: any = { tournamentId };
    if (role && (role === 'DEBATER' || role === 'JUDGE')) {
      where.role = role;
    }

    const participations = await prisma.tournamentParticipation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            imageUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            institutionId: true,
            institution: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Group by role for easier consumption
    const grouped = {
      debaters: participations.filter((p) => p.role === 'DEBATER'),
      judges: participations.filter((p) => p.role === 'JUDGE'),
      total: participations.length,
    };

    return NextResponse.json(grouped, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
