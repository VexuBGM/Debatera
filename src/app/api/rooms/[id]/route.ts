import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRoom, canUserAccessMatch, submitFeedback, getFeedback, getUserFeedbackForMatch } from '@/lib/services/mvp';
import { FeedbackWinner } from '@prisma/client';
import { z } from 'zod';
import { ensureUserInDB } from '@/lib/ensureUser';

export const runtime = 'nodejs';

// GET /api/rooms/[id] - Get room details with match info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roomId } = await params;

    const room = await getRoom(roomId);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user can access this room
    const canAccess = await canUserAccessMatch(room.matchId, userId);

    return NextResponse.json({ ...room, canAccess });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

const FeedbackSchema = z.object({
  affFeedback: z.string().optional(),
  negFeedback: z.string().optional(),
  winner: z.enum(['AFF', 'NEG', 'NONE']),
});

// POST /api/rooms/[id]/feedback - Submit feedback for a match
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUserInDB();

    const { id: roomId } = await params;

    const room = await getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const json = await request.json();
    const parsed = FeedbackSchema.parse(json);

    const feedback = await submitFeedback(room.matchId, userId, {
      affFeedback: parsed.affFeedback,
      negFeedback: parsed.negFeedback,
      winner: parsed.winner as FeedbackWinner,
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
