import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Register as adjudicator for a tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: tournamentId } = await params;
    const body = await req.json();
    const { rating = 5.0, isIndependent = false } = body;

    // Check tournament exists and is open for registration
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (!tournament.registrationOpen) {
      return NextResponse.json(
        { error: 'Tournament registration is closed' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existing = await prisma.adjudicator.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId: user!.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already registered as adjudicator' },
        { status: 400 }
      );
    }

    const adjudicator = await prisma.adjudicator.create({
      data: {
        tournamentId,
        userId: user!.id,
        rating: Math.max(0, Math.min(10, rating)), // Clamp between 0-10
        isIndependent,
        isRegistered: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json(adjudicator, { status: 201 });
  } catch (error) {
    console.error('Error registering adjudicator:', error);
    return NextResponse.json(
      { error: 'Failed to register adjudicator' },
      { status: 500 }
    );
  }
}

// List all adjudicators for a tournament
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const adjudicators = await prisma.adjudicator.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
    });

    return NextResponse.json(adjudicators);
  } catch (error) {
    console.error('Error fetching adjudicators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch adjudicators' },
      { status: 500 }
    );
  }
}
