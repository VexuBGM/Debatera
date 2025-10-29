import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

const CreateTeam = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().or(z.literal('')),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = CreateTeam.parse(body);

  try {
    const team = await prisma.$transaction(async (tx) => {
      const t = await tx.team.create({
        data: {
          name: parsed.name,
          description: parsed.description || null,
          createdById: userId,
        },
      });
      await tx.teamMember.create({ data: { teamId: t.id, userId } });
      return t;
    });

    return NextResponse.json(team, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Team name already in use' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, description: true, createdAt: true },
  });
  return NextResponse.json(teams);
}
