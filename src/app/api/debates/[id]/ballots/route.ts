import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Submit or update ballot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id: debateId } = await params;
    const body = await req.json();
    const { 
      adjudicatorId, 
      winningSide, 
      propScore, 
      oppScore, 
      comments,
      status = 'DRAFT'
    } = body;

    // Validate inputs
    if (!adjudicatorId) {
      return NextResponse.json(
        { error: 'Adjudicator ID is required' },
        { status: 400 }
      );
    }

    if (winningSide && !['PROP', 'OPP'].includes(winningSide)) {
      return NextResponse.json(
        { error: 'Winning side must be PROP or OPP' },
        { status: 400 }
      );
    }

    // Check debate exists
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
    });

    if (!debate) {
      return NextResponse.json(
        { error: 'Debate not found' },
        { status: 404 }
      );
    }

    // Check adjudicator exists and belongs to debate's tournament
    const adjudicator = await prisma.adjudicator.findFirst({
      where: {
        id: adjudicatorId,
        tournamentId: debate.tournamentId || undefined,
      },
    });

    if (!adjudicator) {
      return NextResponse.json(
        { error: 'Adjudicator not found in tournament' },
        { status: 404 }
      );
    }

    // Only the adjudicator themselves or admin can submit ballot
    if (adjudicator.userId !== user!.id && user!.appRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const ballot = await prisma.ballot.upsert({
      where: {
        debateId_adjudicatorId: {
          debateId,
          adjudicatorId,
        },
      },
      update: {
        winningSide: winningSide || null,
        propScore: propScore || null,
        oppScore: oppScore || null,
        comments: comments || null,
        status,
        submittedAt: status === 'CONFIRMED' ? new Date() : null,
      },
      create: {
        debateId,
        adjudicatorId,
        winningSide: winningSide || null,
        propScore: propScore || null,
        oppScore: oppScore || null,
        comments: comments || null,
        status,
        submittedAt: status === 'CONFIRMED' ? new Date() : null,
      },
      include: {
        adjudicator: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(ballot, { status: 201 });
  } catch (error) {
    console.error('Error submitting ballot:', error);
    return NextResponse.json(
      { error: 'Failed to submit ballot' },
      { status: 500 }
    );
  }
}

// Get all ballots for a debate
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: debateId } = await params;

    const ballots = await prisma.ballot.findMany({
      where: { debateId },
      include: {
        adjudicator: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(ballots);
  } catch (error) {
    console.error('Error fetching ballots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ballots' },
      { status: 500 }
    );
  }
}
