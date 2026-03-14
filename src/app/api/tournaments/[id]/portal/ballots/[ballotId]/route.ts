/**
 * API: Portal Ballot (GET / PUT)
 *
 * GET /api/tournaments/[id]/portal/ballots/[ballotId]
 * PUT /api/tournaments/[id]/portal/ballots/[ballotId]
 *
 * Token-authenticated endpoints for reading and saving ballot drafts.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractToken, validatePortalBallotAccess } from '@/lib/portal';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import {
  WSDC_SPEECH_ORDER,
  SaveBallotDraftSchema,
  PROP_ROLES,
  OPP_ROLES,
} from '@/lib/ballots';
import { SpeechRole, BallotStatus, TournamentRoundStatus } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ id: string; ballotId: string }> };

/**
 * GET /api/tournaments/[id]/portal/ballots/[ballotId]
 *
 * Returns full ballot context, same shape as the existing /api/ballots/[ballotId]
 * but authorized via portal token instead of Clerk.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId, ballotId } = await params;

    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const portalAuth = await validatePortalBallotAccess(token, ballotId);
    if (!portalAuth) {
      return NextResponse.json(
        { error: 'Invalid token or ballot access denied' },
        { status: 401 }
      );
    }

    // Verify tournament matches
    if (portalAuth.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Ballot does not belong to this tournament' },
        { status: 403 }
      );
    }

    // Check round visibility: must be IN_PROGRESS or COMPLETED 
    if (
      portalAuth.roundStatus !== TournamentRoundStatus.IN_PROGRESS &&
      portalAuth.roundStatus !== TournamentRoundStatus.COMPLETED
    ) {
      return NextResponse.json(
        { error: 'Ballot is not yet available (round not in progress)' },
        { status: 403 }
      );
    }

    // Fetch the full ballot with context
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
          name: displayNameFromDbUser(ballot.adjudicator.participant.user),
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
          motion: debate.round.motion,
          infoSlide: debate.round.infoSlide,
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
                  name: displayNameFromDbUser(m.participant.user),
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
                  name: displayNameFromDbUser(m.participant.user),
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
            (s.speaker
              ? displayNameFromDbUser(s.speaker.participant.user)
              : null),
          score: s.score ? Number(s.score) : null,
          comment: s.comment,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error fetching portal ballot:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tournaments/[id]/portal/ballots/[ballotId]
 *
 * Save ballot draft. Token-authenticated.
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const { id: tournamentId, ballotId } = await params;

    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Missing authentication token' },
        { status: 401 }
      );
    }

    const portalAuth = await validatePortalBallotAccess(token, ballotId);
    if (!portalAuth) {
      return NextResponse.json(
        { error: 'Invalid token or ballot access denied' },
        { status: 401 }
      );
    }

    if (portalAuth.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Ballot does not belong to this tournament' },
        { status: 403 }
      );
    }

    // Cannot edit submitted ballots
    if (portalAuth.ballot.status === BallotStatus.SUBMITTED) {
      return NextResponse.json(
        { error: 'Ballot has already been submitted and cannot be edited' },
        { status: 403 }
      );
    }

    // Round must be IN_PROGRESS
    if (portalAuth.roundStatus !== TournamentRoundStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Cannot edit ballot — round is not in progress' },
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
    console.error('Error saving portal ballot draft:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
