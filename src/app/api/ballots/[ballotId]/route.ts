/**
 * API: Single Ballot
 *
 * GET /api/ballots/[ballotId] - Get ballot with full context
 * PUT /api/ballots/[ballotId] - Save draft
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import {
  loadBallotAccessContext,
  canViewBallotDetails,
  canEditBallot,
  SaveBallotDraftSchema,
  SPEECH_ROLE_SIDE,
  PROP_ROLES,
  OPP_ROLES,
  WSDC_SPEECH_ORDER,
} from '@/lib/ballots';
import { SpeechRole } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ ballotId: string }> };

/**
 * GET /api/ballots/[ballotId]
 *
 * Returns ballot + debate context (motion, venue, teams, role).
 * Authorization: owning adjudicator or organizer only.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ballotId } = await params;
    const loaded = await loadBallotAccessContext(ballotId);

    if (!loaded) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    if (!canViewBallotDetails(userId, loaded.context)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the full ballot with speeches and team rosters
    const ballot = await prisma.ballot.findUnique({
      where: { id: ballotId },
      include: {
        speeches: {
          orderBy: { role: 'asc' },
          include: {
            speaker: {
              include: {
                participant: {
                  include: { user: true },
                },
              },
            },
          },
        },
        adjudicator: {
          include: {
            participant: {
              include: { user: true },
            },
            debate: {
              include: {
                round: {
                  include: {
                    tournament: {
                      include: { settings: { select: { eventMode: true } } },
                    },
                  },
                },
                propTeam: {
                  include: {
                    institution: true,
                    members: {
                      include: {
                        participant: {
                          include: { user: true },
                        },
                      },
                    },
                  },
                },
                oppTeam: {
                  include: {
                    institution: true,
                    members: {
                      include: {
                        participant: {
                          include: { user: true },
                        },
                      },
                    },
                  },
                },
                venue: true,
              },
            },
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    const debate = ballot.adjudicator.debate;

    // Sort speeches in WSDC order
    const speechesSorted = [...ballot.speeches].sort(
      (a, b) =>
        WSDC_SPEECH_ORDER.indexOf(a.role) - WSDC_SPEECH_ORDER.indexOf(b.role)
    );

    return NextResponse.json(
      {
        id: ballot.id,
        status: ballot.status,
        vote: ballot.vote,
        propTotal: ballot.propTotal ? Number(ballot.propTotal) : null,
        oppTotal: ballot.oppTotal ? Number(ballot.oppTotal) : null,
        privateNotes: ballot.privateNotes,
        submittedAt: ballot.submittedAt,
        createdAt: ballot.createdAt,
        updatedAt: ballot.updatedAt,
        adjudicatorRole: ballot.adjudicator.role,
        adjudicator: {
          id: ballot.adjudicator.id,
          name:
            ballot.adjudicator.participant.user.username ??
            ballot.adjudicator.participant.user.email ??
            'Unknown',
        },
        tournament: {
          id: debate.round.tournament.id,
          name: debate.round.tournament.name,
          eventMode: debate.round.tournament.settings?.eventMode ?? 'IRL',
        },
        round: {
          id: debate.round.id,
          number: debate.round.number,
          name: debate.round.name,
          status: debate.round.status,
        },
        debate: {
          id: debate.id,
          propTeam: debate.propTeam
            ? {
                id: debate.propTeam.id,
                name: debate.propTeam.name,
                institution: debate.propTeam.institution.name,
                members: debate.propTeam.members.map((m) => ({
                  id: m.id,
                  participantId: m.participantId,
                  name:
                    m.participant.user.username ??
                    m.participant.user.email ??
                    'Unknown',
                })),
              }
            : null,
          oppTeam: debate.oppTeam
            ? {
                id: debate.oppTeam.id,
                name: debate.oppTeam.name,
                institution: debate.oppTeam.institution.name,
                members: debate.oppTeam.members.map((m) => ({
                  id: m.id,
                  participantId: m.participantId,
                  name:
                    m.participant.user.username ??
                    m.participant.user.email ??
                    'Unknown',
                })),
              }
            : null,
          venue: debate.venue
            ? { id: debate.venue.id, name: debate.venue.name }
            : null,
        },
        speeches: speechesSorted.map((s) => ({
          id: s.id,
          role: s.role,
          side: s.side,
          speakerId: s.speakerId,
          speakerName:
            s.speakerName ??
            s.speaker?.participant.user.username ??
            s.speaker?.participant.user.email ??
            null,
          score: s.score ? Number(s.score) : null,
          comment: s.comment,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error fetching ballot:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ballots/[ballotId]
 *
 * Save draft ballot data. Does NOT submit.
 * Authorization: owning adjudicator only, ballot must be DRAFT.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ballotId } = await params;
    const loaded = await loadBallotAccessContext(ballotId);

    if (!loaded) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    if (!canEditBallot(userId, loaded.context)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot edit this ballot' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SaveBallotDraftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Compute totals from speeches if available
    let propTotal: number | null = null;
    let oppTotal: number | null = null;

    if (data.speeches && data.speeches.length > 0) {
      propTotal = 0;
      oppTotal = 0;
      for (const speech of data.speeches) {
        if (speech.score != null) {
          if (PROP_ROLES.includes(speech.role as SpeechRole)) {
            propTotal += speech.score;
          } else if (OPP_ROLES.includes(speech.role as SpeechRole)) {
            oppTotal += speech.score;
          }
        }
      }
    }

    // Update ballot + speeches in transaction
    await prisma.$transaction(async (tx) => {
      await tx.ballot.update({
        where: { id: ballotId },
        data: {
          vote: data.vote !== undefined ? data.vote : undefined,
          privateNotes:
            data.privateNotes !== undefined ? data.privateNotes : undefined,
          propTotal: propTotal !== null ? propTotal : undefined,
          oppTotal: oppTotal !== null ? oppTotal : undefined,
        },
      });

      if (data.speeches) {
        for (const speech of data.speeches) {
          await tx.ballotSpeech.updateMany({
            where: {
              ballotId,
              role: speech.role as SpeechRole,
            },
            data: {
              speakerId: speech.speakerId ?? null,
              speakerName: speech.speakerName ?? null,
              score: speech.score ?? null,
              comment: speech.comment ?? null,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error saving ballot draft:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
