import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

/**
 * POST /api/admin/tournaments/[id]/verify
 * Verify or unverify a tournament (admin only)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;
    const json = await req.json();
    const { verified, reason } = json;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can verify tournaments' },
        { status: 403 }
      );
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Update tournament verification status
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        isVerified: verified,
        verifiedAt: verified ? new Date() : null,
        verifiedById: verified ? userId : null,
      },
      include: {
        frozenBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Create admin action log
    await prisma.adminAction.create({
      data: {
        adminId: userId,
        tournamentId,
        action: verified ? 'VERIFY_TOURNAMENT' : 'UNVERIFY_TOURNAMENT',
        reason: reason || null,
      },
    });

    return NextResponse.json({
      message: `Tournament ${verified ? 'verified' : 'unverified'} successfully`,
      tournament: updated,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
