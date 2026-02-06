import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserInDB } from '@/lib/ensureUser';
import { TournamentSettingsInputSchema } from '@/lib/validations/tournamentSettings';

export const runtime = 'nodejs';

/**
 * GET /api/tournaments/[id]/settings
 * Returns the tournament settings.
 * Auto-creates default settings if they don't exist.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserInDB();

    const { id: tournamentId } = await params;

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });

        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        if (tournament.settings) {
            return NextResponse.json(tournament.settings);
        }

        // Auto-create default settings if missing
        // This ensures we always have settings to work with
        const newSettings = await prisma.tournamentSettings.create({
            data: {
                tournamentId,
                // Defaults are handled by Prisma schema (@default)
                // teamSizeMin: 2,
                // teamSizeMax: 5
            },
        });

        return NextResponse.json(newSettings);
    } catch (error) {
        console.error('Error fetching tournament settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/tournaments/[id]/settings
 * Updates tournament settings.
 * Admin-only (creator).
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserInDB();
    const { id: tournamentId } = await params;

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate input
    const validation = TournamentSettingsInputSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: 'Validation Error', details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { createdByUserId: true },
        });

        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        // Only creator can update settings (for now)
        if (tournament.createdByUserId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Upsert settings
        const settings = await prisma.tournamentSettings.upsert({
            where: { tournamentId },
            create: {
                tournamentId,
                registrationOpensAt: data.registrationOpensAt ? new Date(data.registrationOpensAt) : null,
                registrationClosesAt: data.registrationClosesAt ? new Date(data.registrationClosesAt) : null,
                teamSizeMin: data.teamSizeMin,
                teamSizeMax: data.teamSizeMax,
                debateFormat: data.debateFormat,
                eventMode: data.eventMode,
            },
            update: {
                registrationOpensAt: data.registrationOpensAt ? new Date(data.registrationOpensAt) : null,
                registrationClosesAt: data.registrationClosesAt ? new Date(data.registrationClosesAt) : null,
                teamSizeMin: data.teamSizeMin,
                teamSizeMax: data.teamSizeMax,
                debateFormat: data.debateFormat,
                eventMode: data.eventMode,
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error updating tournament settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
