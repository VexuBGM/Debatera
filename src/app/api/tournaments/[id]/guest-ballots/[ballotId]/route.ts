/**
 * Guest Ballot API
 *
 * GET  /api/tournaments/[id]/guest-ballots/[ballotId]?token=...
 * PUT  /api/tournaments/[id]/guest-ballots/[ballotId]
 *
 * GET may accept a private URL token. Writes require a guest session cookie.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePrivateToken } from '@/lib/identity/privateLinkManagement';
import { checkRateLimit, getIpFromRequest } from '@/lib/identity/rateLimit';
import { validateGuestSessionCookie } from '@/lib/identity/guestSession';
import { validateGuestCsrf } from '@/lib/identity/guestCsrf';
import { isSameOrigin } from '@/lib/identity/requestOrigin';
import { displayNameForPerson } from '@/lib/identity/displayHelpers';
import {
  SaveBallotDraftSchema,
  PROP_ROLES,
  OPP_ROLES,
  WSDC_SPEECH_ORDER,
} from '@/lib/ballots';
import { BallotStatus, TournamentRoundStatus, SpeechRole } from '@prisma/client';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string; ballotId: string }>;
};

// ============================================================================
// GET – Fetch ballot with context (guest auth via token)
// ============================================================================

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const ip = getIpFromRequest(req);
    if (!checkRateLimit(`guest-ballot:${ip}`, { maxAttempts: 60, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id: tournamentId, ballotId } = await params;
    const token = req.nextUrl.searchParams.get('token');
    const sessionValidated = await validateGuestSessionCookie(req, tournamentId);
    const validated = sessionValidated ?? (token ? await validatePrivateToken(token, tournamentId) : null);
    if (!validated) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { participant } = validated;

    // Fetch the ballot and verify it belongs to this participant
    const ballot = await prisma.ballot.findUnique({
      where: { id: ballotId },
      include: {
        speeches: {
          orderBy: { role: 'asc' },
          include: {
            speaker: {
              include: {
                participant: {
                  include: { person: true },
                },
              },
            },
          },
        },
        adjudicator: {
          include: {
            participant: {
              include: { person: true },
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
                          include: { person: true },
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
                          include: { person: true },
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

    // Ensure this ballot belongs to the token's participant
    if (ballot.adjudicator.participantId !== participant.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const debate = ballot.adjudicator.debate;
    const round = debate.round;

    // Only allow access for IN_PROGRESS or COMPLETED rounds
    if (
      round.status !== TournamentRoundStatus.IN_PROGRESS &&
      round.status !== TournamentRoundStatus.COMPLETED
    ) {
      return NextResponse.json({ error: 'Round is not accessible' }, { status: 403 });
    }

    // Sort speeches in WSDC order
    const speechesSorted = [...ballot.speeches].sort(
      (a, b) =>
        WSDC_SPEECH_ORDER.indexOf(a.role) - WSDC_SPEECH_ORDER.indexOf(b.role)
    );

    return NextResponse.json({
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
        name: displayNameForPerson(ballot.adjudicator.participant.person),
      },
      tournament: {
        id: round.tournament.id,
        name: round.tournament.name,
        eventMode: round.tournament.settings?.eventMode ?? 'IRL',
      },
      round: {
        id: round.id,
        number: round.number,
        name: round.name,
        status: round.status,
        motion: round.motion,
        infoSlide: round.infoSlide,
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
                name: displayNameForPerson(m.participant.person),
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
                name: displayNameForPerson(m.participant.person),
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
            ? displayNameForPerson(s.speaker.participant.person)
            : null),
        score: s.score ? Number(s.score) : null,
        comment: s.comment,
      })),
    });
  } catch (err) {
    console.error('Error fetching guest ballot:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// PUT – Save draft (guest auth via token)
// ============================================================================

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }

    if (!validateGuestCsrf(req)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const ip = getIpFromRequest(req);
    if (!checkRateLimit(`guest-ballot-put:${ip}`, { maxAttempts: 30, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { id: tournamentId, ballotId } = await params;
    const validated = await validateGuestSessionCookie(req, tournamentId);
    if (!validated) {
      return NextResponse.json({ error: 'Missing or invalid guest session' }, { status: 401 });
    }

    const { participant } = validated;

    // Load ballot and verify ownership
    const ballot = await prisma.ballot.findUnique({
      where: { id: ballotId },
      include: {
        adjudicator: {
          include: {
            debate: { include: { round: true } },
          },
        },
      },
    });

    if (!ballot) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    if (ballot.adjudicator.participantId !== participant.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ballot.status === BallotStatus.SUBMITTED) {
      return NextResponse.json({ error: 'Ballot already submitted' }, { status: 403 });
    }

    if (ballot.adjudicator.debate.round.status !== TournamentRoundStatus.IN_PROGRESS) {
      return NextResponse.json({ error: 'Round is not in progress' }, { status: 403 });
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

    // Compute totals
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
          privateNotes: data.privateNotes !== undefined ? data.privateNotes : undefined,
          propTotal: propTotal !== null ? propTotal : undefined,
          oppTotal: oppTotal !== null ? oppTotal : undefined,
        },
      });

      if (data.speeches) {
        for (const speech of data.speeches) {
          await tx.ballotSpeech.updateMany({
            where: { ballotId, role: speech.role as SpeechRole },
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving guest ballot draft:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
