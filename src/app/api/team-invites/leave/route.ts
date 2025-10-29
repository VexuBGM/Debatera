import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

const Leave = z.object({ teamId: z.string().min(1) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { teamId } = Leave.parse(await req.json());

  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 404 });

  await prisma.teamMember.delete({ where: { userId_teamId: { userId, teamId } } });

  // delete empty team
  const remaining = await prisma.teamMember.count({ where: { teamId } });
  if (remaining === 0) await prisma.team.delete({ where: { id: teamId } });

  return NextResponse.json({ ok: true });
}
