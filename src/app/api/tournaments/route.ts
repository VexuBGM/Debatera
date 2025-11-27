import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

import { auth } from '@clerk/nextjs/server';

// Prisma requires Node.js runtime, not Edge:
export const runtime = 'nodejs';

const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(2000).optional().or(z.literal('')),
  startDate: z.string().datetime({ message: 'Start date is required' }),
  contactInfo: z.string().min(1, 'Contact information is required').max(500),
  entryFee: z.number().min(0, 'Entry fee must be non-negative').default(0),
  registrationType: z.enum(['OPEN', 'APPROVAL']).default('OPEN'),
  rosterFreezeAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  // Auth: Clerk
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = CreateTournamentSchema.parse(json);

    const tournament = await prisma.tournament.create({
      data: {
        name: parsed.name,
        description: parsed.description || null,
        startDate: new Date(parsed.startDate),
        contactInfo: parsed.contactInfo,
        entryFee: parsed.entryFee,
        registrationType: parsed.registrationType,
        ownerId: userId,
        rosterFreezeAt: parsed.rosterFreezeAt ? new Date(parsed.rosterFreezeAt) : null,
        frozenById: parsed.rosterFreezeAt ? userId : null,
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tournaments, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
