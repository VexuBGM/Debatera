import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { createTournament, listTournaments } from '@/lib/services/mvp';
import { ensureUserInDB } from '@/lib/ensureUser';
import { EventModeEnum, DebateFormatEnum } from '@/lib/validations/tournamentSettings';

// Prisma requires Node.js runtime, not Edge:
export const runtime = 'nodejs';

const CreateTournamentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  eventMode: EventModeEnum.default('IRL'),
  debateFormat: DebateFormatEnum.default('WSDC'),
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

    const tournament = await createTournament(parsed.name, userId, parsed.eventMode, parsed.debateFormat);
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
    const tournaments = await listTournaments();
    return NextResponse.json(tournaments, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

