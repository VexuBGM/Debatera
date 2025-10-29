import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
export const runtime = 'nodejs';

const CreateInvite = z.object({
  teamId: z.string().min(1),
  email: z.string().email().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { teamId, email, expiresInDays } = CreateInvite.parse(await req.json());

  // must be a member to invite
  const member = await prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
  if (!member) return NextResponse.json({ error: 'Not a team member' }, { status: 403 });

  const token = crypto.randomBytes(24).toString('base64url');
  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      createdById: userId,
      email: email ?? null,
      token,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    },
    select: { token: true },
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  const url = `${base}/accept-invite?token=${invite.token}`;
  return NextResponse.json({ url }, { status: 201 });
}
