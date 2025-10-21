import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTournamentOrganizer } from '@/lib/auth';
import { OrganizerRole } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  const { error } = await requireTournamentOrganizer(tournamentId);
  if (error) return error;

  try {
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create organizer
    const organizer = await prisma.tournamentOrganizer.upsert({
      where: {
        tournamentId_userId: { tournamentId, userId },
      },
      update: {
        role: role || OrganizerRole.ORGANIZER,
      },
      create: {
        tournamentId,
        userId,
        role: role || OrganizerRole.ORGANIZER,
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

    return NextResponse.json(organizer, { status: 201 });
  } catch (error) {
    console.error('Error adding tournament organizer:', error);
    return NextResponse.json(
      { error: 'Failed to add tournament organizer' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;

  try {
    const organizers = await prisma.tournamentOrganizer.findMany({
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
        addedAt: 'asc',
      },
    });

    return NextResponse.json(organizers);
  } catch (error) {
    console.error('Error fetching tournament organizers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament organizers' },
      { status: 500 }
    );
  }
}
