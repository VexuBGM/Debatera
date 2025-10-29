import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teams = await prisma.teamMember.findMany({
    where: { userId },
    include: { team: { select: { id: true, name: true, description: true } } },
  });

  return NextResponse.json(teams.map((m) => m.team));
}
