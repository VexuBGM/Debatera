import { NextResponse } from 'next/server';
import { getInstitution } from '@/lib/services/mvp';

export const runtime = 'nodejs';

/**
 * GET /api/institutions/[id]
 * Fetch details about an institution
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const institution = await getInstitution(id);

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    return NextResponse.json(institution, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

