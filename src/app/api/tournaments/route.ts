import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { createTournament, listTournaments } from '@/lib/services/mvp';
import { ensureUserInDB } from '@/lib/ensureUser';
import { EventModeEnum, PublicTabEnum } from '@/lib/validations/tournamentSettings';
import { parsePaginationParams } from '@/lib/pagination';

// Prisma requires Node.js runtime, not Edge:
export const runtime = 'nodejs';

const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  eventMode: EventModeEnum.default('IRL'),
  isPublic: z.boolean().optional(),
  registrationOpen: z.string().optional(),
  registrationClose: z.string().optional(),
  teamSizeMin: z.number().int().min(1).max(10).optional(),
  teamSizeMax: z.number().int().min(1).max(10).optional(),
  showDebaterNames: z.boolean().optional(),
  speakerTopN: z.number().int().min(1).nullable().optional(),
  hideSpeakerPoints: z.boolean().optional(),
  publicTabs: z.array(PublicTabEnum).optional(),
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

  const openDate = data.registrationOpen ? new Date(data.registrationOpen) : null;
  const closeDate = data.registrationClose ? new Date(data.registrationClose) : null;

  if (openDate && Number.isNaN(openDate.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'registrationOpen must be a valid date-time',
      path: ['registrationOpen'],
    });
  }

  if (closeDate && Number.isNaN(closeDate.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'registrationClose must be a valid date-time',
      path: ['registrationClose'],
    });
  }

  if (
    openDate && closeDate &&
    !Number.isNaN(openDate.getTime()) && !Number.isNaN(closeDate.getTime()) &&
    openDate >= closeDate
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'registrationOpen must be before registrationClose',
      path: ['registrationOpen'],
    });
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
      isPublic: parsed.isPublic,
      registrationOpensAt: parsed.registrationOpen ? new Date(parsed.registrationOpen) : null,
      registrationClosesAt: parsed.registrationClose ? new Date(parsed.registrationClose) : null,
      teamSizeMin: parsed.teamSizeMin,
      teamSizeMax: parsed.teamSizeMax,
      showDebaterNames: parsed.showDebaterNames,
      speakerTopN: parsed.speakerTopN,
      hideSpeakerPoints: parsed.hideSpeakerPoints,
      publicTabs: parsed.publicTabs,
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationParams(searchParams);
    const { userId } = await auth();
    const result = await listTournaments(pagination, userId ?? undefined);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

