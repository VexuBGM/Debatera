import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

const RevokeInvite = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { token } = RevokeInvite.parse(await req.json());

  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  // any team member can revoke
  const member = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId: invite.teamId } },
  });
  if (!member) return NextResponse.json({ error: 'Not a team member' }, { status: 403 });

  await prisma.teamInvite.update({ where: { token }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
