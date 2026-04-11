import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * PATCH /api/me/tutorials
 * Body: { tourId: string }
 * Appends tourId to the user's seenTutorials array (idempotent).
 */
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tourId = typeof body?.tourId === 'string' ? body.tourId : null;
  if (!tourId) {
    return NextResponse.json({ error: 'tourId is required' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      seenTutorials: { push: tourId },
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/me/tutorials?tourId=xxx
 * Removes tourId from the user's seenTutorials array.
 */
export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tourId = searchParams.get('tourId');
  if (!tourId) {
    return NextResponse.json({ error: 'tourId query param is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { seenTutorials: true },
  });

  if (user) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        seenTutorials: user.seenTutorials.filter((t) => t !== tourId),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
