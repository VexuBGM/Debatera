import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const ApproveInstitutionSchema = z.object({
  registrationId: z.string(),
  action: z.enum(['approve', 'reject']),
});

/**
 * POST /api/tournaments/[id]/registrations/institution/approve
 * Approve or reject an institution registration
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;
    const json = await req.json();
    const parsed = ApproveInstitutionSchema.parse(json);

    // Check if tournament exists and user is the owner
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.ownerId !== currentUserId) {
      return NextResponse.json(
        { error: 'Only tournament owner can approve registrations' },
        { status: 403 }
      );
    }

    // Get the registration
    const registration = await prisma.tournamentInstitutionRegistration.findUnique({
      where: { id: parsed.registrationId },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    if (registration.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Registration does not belong to this tournament' },
        { status: 400 }
      );
    }

    if (registration.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Registration has already been processed' },
        { status: 400 }
      );
    }

    // Update the registration status
    const updated = await prisma.tournamentInstitutionRegistration.update({
      where: { id: parsed.registrationId },
      data:
        parsed.action === 'approve'
          ? {
              status: 'APPROVED',
              approvedAt: new Date(),
              approvedById: currentUserId,
            }
          : {
              status: 'REJECTED',
              rejectedAt: new Date(),
              rejectedById: currentUserId,
            },
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

    return NextResponse.json({
      message: `Institution registration ${parsed.action}d successfully`,
      registration: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
