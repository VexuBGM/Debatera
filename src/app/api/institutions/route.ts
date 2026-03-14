import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createInstitution, listInstitutions } from '@/lib/services/mvp';
import { ensureUserInDB } from '@/lib/ensureUser';
import { parsePaginationParams } from '@/lib/pagination';

export const runtime = 'nodejs';

const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
});

/**
 * POST /api/institutions
 * Create a new institution. The creator is automatically assigned as ADMIN.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureUserInDB();

  try {
    const json = await req.json();
    const parsed = CreateInstitutionSchema.parse(json);

    const institution = await createInstitution(parsed.name, userId);
    return NextResponse.json(institution, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'An institution with this name already exists' },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/institutions
 * List all institutions (paginated).
 * Supports ?page=1&pageSize=20 query params.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePaginationParams(searchParams);
    const { userId } = await auth();
    const result = await listInstitutions(pagination, userId ?? undefined);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
