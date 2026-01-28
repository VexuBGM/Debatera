import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRoom, canUserAccessMatch } from '@/lib/services/mvp';

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
