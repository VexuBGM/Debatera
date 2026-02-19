/**
 * Guest Ballot Entry Page (Tabbycat-style private URL)
 *
 * GET /tournaments/[id]/p/[token]/ballots/[ballotId]
 *
 * Allows a guest judge to view/edit their ballot without Clerk login.
 */

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validatePrivateToken } from '@/lib/identity/privateLinkManagement';
import { displayNameForPerson } from '@/lib/identity/displayHelpers';
import { WSDC_SPEECH_ORDER } from '@/lib/ballots';
import { TournamentRoundStatus, BallotStatus } from '@prisma/client';
import GuestBallotClient from './GuestBallotClient';
import {
  buildGuestSessionCookieValue,
  guestSessionCookieName,
  guestSessionMaxAgeSeconds,
} from '@/lib/identity/guestSession';
import { createGuestCsrfToken, guestCsrfCookieName } from '@/lib/identity/guestCsrf';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
    token: string;
    ballotId: string;
  }>;
}

export default async function GuestBallotPage({ params }: PageProps) {
  const { id: tournamentId, token, ballotId } = await params;

  // Validate token
  const validated = await validatePrivateToken(token, tournamentId);
  if (!validated) {
    notFound();
  }

  const { participant, person, tournament } = validated;

  const cookieStore = cookies();
  const sessionValue = buildGuestSessionCookieValue(validated.link, tournamentId);
  cookieStore.set(guestSessionCookieName, sessionValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: guestSessionMaxAgeSeconds,
    path: '/',
  });

  const csrfToken = createGuestCsrfToken();
  cookieStore.set(guestCsrfCookieName, csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: guestSessionMaxAgeSeconds,
    path: '/',
  });

  // Load ballot with full context
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
          participant: true,
          debate: {
            include: {
              round: true,
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
    notFound();
  }

  // Ensure ballot belongs to the token's participant
  if (ballot.adjudicator.participantId !== participant.id) {
    notFound();
  }

  const debate = ballot.adjudicator.debate;
  const round = debate.round;

  // Only accessible for IN_PROGRESS or COMPLETED rounds
  if (
    round.status !== TournamentRoundStatus.IN_PROGRESS &&
    round.status !== TournamentRoundStatus.COMPLETED
  ) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-2xl font-bold">Ballot Not Available</h1>
          <p className="mt-2 text-muted-foreground">
            This ballot is not accessible because the round is not in progress or completed.
          </p>
        </div>
      </div>
    );
  }

  const isSubmitted = ballot.status === BallotStatus.SUBMITTED;
  const isEditable =
    !isSubmitted && round.status === TournamentRoundStatus.IN_PROGRESS;

  // Sort speeches in WSDC order
  const speechesSorted = [...ballot.speeches].sort(
    (a, b) =>
      WSDC_SPEECH_ORDER.indexOf(a.role) - WSDC_SPEECH_ORDER.indexOf(b.role)
  );

  // Build serializable ballot data for the client component
  const ballotData = {
    id: ballot.id,
    status: ballot.status as string,
    vote: ballot.vote as string | null,
    propTotal: ballot.propTotal ? Number(ballot.propTotal) : null,
    oppTotal: ballot.oppTotal ? Number(ballot.oppTotal) : null,
    privateNotes: ballot.privateNotes,
    adjudicatorRole: ballot.adjudicator.role as string,
    round: {
      id: round.id,
      number: round.number,
      name: round.name,
      status: round.status as string,
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
      role: s.role as string,
      side: s.side as string,
      speakerId: s.speakerId,
      speakerName:
        s.speakerName ??
        (s.speaker
          ? displayNameForPerson(s.speaker.participant.person)
          : null),
      score: s.score ? Number(s.score) : null,
      comment: s.comment,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">
            {round.name} · {person.firstName} {person.lastName} ({ballot.adjudicator.role})
          </p>
        </div>

        {/* Motion */}
        {round.motion && (
          <div className="mb-6 rounded-lg border bg-card p-4">
            {round.infoSlide && (
              <div className="mb-2 text-sm text-muted-foreground">
                {round.infoSlide}
              </div>
            )}
            <p className="font-medium italic">{round.motion}</p>
          </div>
        )}

        {/* Ballot Form */}
        <GuestBallotClient
          ballot={ballotData}
          tournamentId={tournamentId}
          csrfToken={csrfToken}
          isEditable={isEditable}
          isSubmitted={isSubmitted}
        />

        {/* Footer */}
        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          Private ballot for <strong>{person.firstName} {person.lastName}</strong>.
          Do not share this URL.
        </div>
      </div>
    </div>
  );
}
