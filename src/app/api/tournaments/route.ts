import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { createTournament, listTournaments } from '@/lib/services/mvp';
import { ensureUserInDB } from '@/lib/ensureUser';
import { EventModeEnum } from '@/lib/validations/tournamentSettings';

// Prisma requires Node.js runtime, not Edge:
export const runtime = 'nodejs';

const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  eventMode: EventModeEnum.default('IRL'),
  registrationOpen: z.string().optional(),
  registrationClose: z.string().optional(),
  teamSizeMin: z.number().int().min(1).max(10).optional(),
  teamSizeMax: z.number().int().min(1).max(10).optional(),
}).superRefine((data, ctx) => {
  if (
    data.teamSizeMin !== undefined &&
    data.teamSizeMax !== undefined &&
    data.teamSizeMax < data.teamSizeMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'teamSizeMax must be greater than or equal to teamSizeMin',
      path: ['teamSizeMax'],
    });
  }

  if (data.registrationOpen && data.registrationClose) {
    const openDate = new Date(data.registrationOpen);
    const closeDate = new Date(data.registrationClose);

    if (Number.isNaN(openDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'registrationOpen must be a valid date-time',
        path: ['registrationOpen'],
      });
    }

    if (Number.isNaN(closeDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'registrationClose must be a valid date-time',
        path: ['registrationClose'],
      });
    }

    if (!Number.isNaN(openDate.getTime()) && !Number.isNaN(closeDate.getTime()) && openDate >= closeDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'registrationOpen must be before registrationClose',
        path: ['registrationOpen'],
      });
    }
  }
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();

  try {
    const json = await req.json();
    const parsed = CreateTournamentSchema.parse(json);

    const tournament = await createTournament(parsed.name, userId, parsed.eventMode, {
      registrationOpensAt: parsed.registrationOpen ? new Date(parsed.registrationOpen) : null,
      registrationClosesAt: parsed.registrationClose ? new Date(parsed.registrationClose) : null,
      teamSizeMin: parsed.teamSizeMin,
      teamSizeMax: parsed.teamSizeMax,
    });
    return NextResponse.json(tournament, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    const tournaments = await listTournaments(userId ?? undefined);
    return NextResponse.json(tournaments, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

