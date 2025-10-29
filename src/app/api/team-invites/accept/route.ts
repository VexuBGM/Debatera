import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

const AcceptInvite = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { token } = AcceptInvite.parse(await req.json());

  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });
  if (invite.revokedAt) return NextResponse.json({ error: 'Invite revoked' }, { status: 410 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

  const already = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId: invite.teamId } },
  });
  if (already) {
    // If the user is already a member, still ensure the invite is marked accepted.
    await prisma.teamInvite.update({ where: { token }, data: { acceptedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  // Use createMany with skipDuplicates to avoid unique constraint errors when concurrent requests occur.
  await prisma.$transaction([
    prisma.teamMember.createMany({ data: [{ teamId: invite.teamId, userId }], skipDuplicates: true }),
    prisma.teamInvite.update({ where: { token }, data: { acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
