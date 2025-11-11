import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { isVerified: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error verifying tournament:', error);
    return NextResponse.json(
      { error: 'Failed to verify tournament' },
      { status: 500 }
    );
  }
}
