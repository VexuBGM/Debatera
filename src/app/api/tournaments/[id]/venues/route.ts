import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Create venue for tournament
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: tournamentId } = await params;
    const body = await req.json();
    const { name, priority = 0, url } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Venue name is required' },
        { status: 400 }
      );
    }

    // Check tournament exists and user has permission
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Only tournament creator or admin can add venues
    if (tournament.createdById !== user!.id && user!.appRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const venue = await prisma.venue.create({
      data: {
        tournamentId,
        name,
        priority,
        url: url || null,
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
}

// List venues for tournament
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const venues = await prisma.venue.findMany({
      where: { tournamentId },
      orderBy: {
        priority: 'desc',
      },
    });

    return NextResponse.json(venues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}
