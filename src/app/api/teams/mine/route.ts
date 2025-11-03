import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'desc' },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, username: true, imageUrl: true } } },
      },
    },
  });

  // Normalize to a simpler shape: include members as array of users
  const out = teams.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.createdAt,
    members: t.members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      username: m.user.username,
      imageUrl: m.user.imageUrl,
    })),
  }));

  return NextResponse.json(out);
}
