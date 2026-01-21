import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  registerInstitution,
  unregisterInstitution,
  getRegistration,
  isInstitutionAdmin,
  getUserInstitutions,
  getTournament,
} from '@/lib/services/mvp';

export const runtime = 'nodejs';

/**
 * POST /api/tournaments/[id]/register-institution
 * Register an institution for a tournament (admins only)
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

    // Check if tournament exists
    const tournament = await getTournament(tournamentId);
    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Get user's institution memberships
    const memberships = await getUserInstitutions(userId);
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'You must be a member of an institution to register' },
        { status: 400 }
      );
    }

    // Use the first institution (for MVP simplicity)
    const institutionId = memberships[0].institutionId;

    // Check if user is admin of the institution
    const isAdmin = await isInstitutionAdmin(userId, institutionId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only institution admins can register for tournaments' },
        { status: 403 }
      );
    }

    // Check if already registered
    const existing = await getRegistration(tournamentId, institutionId);
    if (existing) {
      return NextResponse.json(
        { error: 'Institution is already registered for this tournament' },
        { status: 409 }
      );
    }

    // Register the institution (auto-approved for MVP)
    const registration = await registerInstitution(tournamentId, institutionId);

    return NextResponse.json({
      ...registration,
      message: 'Institution registered successfully',
    }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tournaments/[id]/register-institution
 * Unregister an institution from a tournament (admins only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: tournamentId } = await params;

    // Get user's institution
    const memberships = await getUserInstitutions(userId);
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'You must be a member of an institution' },
        { status: 400 }
      );
    }

    const institutionId = memberships[0].institutionId;

    // Check if user is admin
    const isAdmin = await isInstitutionAdmin(userId, institutionId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only institution admins can unregister from tournaments' },
        { status: 403 }
      );
    }

    // Check if registered
    const registration = await getRegistration(tournamentId, institutionId);
    if (!registration) {
      return NextResponse.json(
        { error: 'Institution is not registered for this tournament' },
        { status: 404 }
      );
    }

    // Unregister
    await unregisterInstitution(tournamentId, institutionId);

    return NextResponse.json({
      message: 'Institution successfully unregistered from tournament',
    }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

