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
import { getTeamDisplayName } from '@/lib/teams/teamDisplayName';
import {
  WSDC_SPEECH_ORDER,
  SaveBallotDraftSchema,
  PROP_ROLES,
  OPP_ROLES,
} from '@/lib/ballots';
import { BP_SPEECH_ORDER, SaveBpBallotDraftSchema } from '@/lib/ballots/bp';
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
        teamRankings: true,
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
                      include: {
                        settings: {
                          select: {
                            eventMode: true,
                            debateFormat: true,
                            isIronman: true,
                            speakerScaleMin: true,
                            speakerScaleMax: true,
                            showDebaterNames: true,
                          },
                        },
                      },
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
                teamSlots: {
                  include: {
                    team: {
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
    const debateFormat =
      debate.round.tournament.settings?.debateFormat ?? 'WSDC';
    const isBp = debateFormat === 'BP';
    const showDebaterNames =
      debate.round.tournament.settings?.showDebaterNames ?? false;

    // Sort speeches in appropriate order
    const speechOrder = isBp ? BP_SPEECH_ORDER : WSDC_SPEECH_ORDER;
    const speechesSorted = [...ballot.speeches].sort(
      (a, b) =>
        speechOrder.indexOf(a.role) - speechOrder.indexOf(b.role)
    );

    // Build team slots for BP
    const teamSlots =
      isBp && debate.teamSlots
        ? debate.teamSlots.map((slot) => ({
            position: slot.position,
            team: slot.team
              ? {
                  id: slot.team.id,
                  name: getTeamDisplayName(slot.team, showDebaterNames),
                  institution: slot.team.institution.name,
                  members: slot.team.members.map((m) => ({
                    id: m.id,
                    participantId: m.participantId,
                    name: displayNameFromDbUser(m.participant.user),
                  })),
                }
              : null,
          }))
        : undefined;

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
        debateFormat,
        adjudicator: {
          id: ballot.adjudicator.id,
          name: displayNameFromDbUser(ballot.adjudicator.participant.user),
        },
        tournament: {
          id: debate.round.tournament.id,
          name: debate.round.tournament.name,
          eventMode: debate.round.tournament.settings?.eventMode ?? 'IRL',
          isIronman: debate.round.tournament.settings?.isIronman ?? false,
          speakerScaleMin:
            debate.round.tournament.settings?.speakerScaleMin ?? null,
          speakerScaleMax:
            debate.round.tournament.settings?.speakerScaleMax ?? null,
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
                name: getTeamDisplayName(debate.propTeam, showDebaterNames),
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
                name: getTeamDisplayName(debate.oppTeam, showDebaterNames),
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
        // BP-specific fields
        ...(isBp && {
          teamSlots,
          teamRankings: ballot.teamRankings.map((r) => ({
            id: r.id,
            position: r.position,
            rank: r.rank,
            teamPoints: r.teamPoints,
          })),
        }),
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

    // Determine debate format
    const debateWithSettings = await prisma.tournamentDebateJudge.findFirst({
      where: { ballot: { id: ballotId } },
      include: {
        debate: {
          include: {
            round: {
              include: {
                tournament: {
                  include: { settings: { select: { debateFormat: true } } },
                },
              },
            },
          },
        },
      },
    });

    const debateFormat =
      debateWithSettings?.debate.round.tournament.settings?.debateFormat ?? 'WSDC';
    const isBp = debateFormat === 'BP';

    if (isBp) {
      // BP draft save
      const parsed = SaveBpBallotDraftSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const data = parsed.data;

      await prisma.$transaction(async (tx) => {
        await tx.ballot.update({
          where: { id: ballotId },
          data: {
            privateNotes:
              data.privateNotes !== undefined ? data.privateNotes : undefined,
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

        if (data.teamRankings) {
          for (const ranking of data.teamRankings) {
            await tx.ballotTeamRanking.updateMany({
              where: {
                ballotId,
                position: ranking.position as any,
              },
              data: {
                rank: ranking.rank ?? 0,
              },
            });
          }
        }
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // WSDC draft save
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
