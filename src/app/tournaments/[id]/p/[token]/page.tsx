/**
 * Guest Participant Landing Page (Tabbycat-style private URL)
 *
 * GET /tournaments/[id]/p/[token]
 *
 * Validates the token, then shows the participant's assignments and ballot links.
 * No Clerk login required.
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { validatePrivateToken } from '@/lib/identity/privateLinkManagement';
import { TournamentRoundStatus } from '@prisma/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; token: string }>;
}

export default async function GuestParticipantPage({ params }: PageProps) {
  const { id: tournamentId, token } = await params;

  const validated = await validatePrivateToken(token, tournamentId);
  if (!validated) {
    notFound();
  }

  const { participant, person, institution, tournament } = validated;

  // Fetch assignments based on role
  const isJudge = participant.role === 'JUDGE';

  // For judges: fetch debate assignments with ballot info
  let judgeAssignments: Awaited<ReturnType<typeof fetchJudgeAssignments>> = [];
  if (isJudge) {
    judgeAssignments = await fetchJudgeAssignments(participant.id);
  }

  // For debaters: fetch team membership
  let teamInfo: Awaited<ReturnType<typeof fetchTeamInfo>> = null;
  if (!isJudge) {
    teamInfo = await fetchTeamInfo(participant.id);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <div className="mt-2 flex items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {participant.role}
            </span>
            <span>{person.firstName} {person.lastName}</span>
            <span>·</span>
            <span>{institution.name}</span>
          </div>
        </div>

        {/* Judge view */}
        {isJudge && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Debate Assignments</h2>
            {judgeAssignments.length === 0 ? (
              <p className="text-muted-foreground">No debates assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {judgeAssignments.map((assignment) => {
                  const debate = assignment.debate;
                  const round = debate.round;
                  const isAccessible =
                    round.status === TournamentRoundStatus.IN_PROGRESS ||
                    round.status === TournamentRoundStatus.COMPLETED;

                  return (
                    <div
                      key={assignment.id}
                      className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{round.name}</span>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              {round.status}
                            </span>
                            <span className="rounded bg-muted px-2 py-0.5 text-xs">
                              {assignment.role}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {debate.propTeam?.name ?? 'TBD'} vs{' '}
                            {debate.oppTeam?.name ?? 'TBD'}
                          </div>
                          {debate.venue && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Venue: {debate.venue.name}
                            </div>
                          )}
                          {round.motion && (
                            <div className="mt-1 text-sm italic text-muted-foreground">
                              {round.motion}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {assignment.ballot && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                assignment.ballot.status === 'SUBMITTED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {assignment.ballot.status}
                            </span>
                          )}
                          {isAccessible && assignment.ballot && (
                            <Link
                              href={`/tournaments/${tournamentId}/p/${token}/ballots/${assignment.ballot.id}`}
                              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                              {assignment.ballot.status === 'SUBMITTED'
                                ? 'View Ballot'
                                : 'Open Ballot'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Debater view */}
        {!isJudge && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Team</h2>
            {!teamInfo ? (
              <p className="text-muted-foreground">
                You have not been assigned to a team yet.
              </p>
            ) : (
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <h3 className="font-medium">{teamInfo.team.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {teamInfo.team.institution.name}
                </p>
                <div className="mt-2">
                  <span className="text-sm font-medium">Team Members:</span>
                  <ul className="mt-1 space-y-1">
                    {teamInfo.team.members.map((member) => (
                      <li key={member.id} className="text-sm text-muted-foreground">
                        {member.participant.person.firstName}{' '}
                        {member.participant.person.lastName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t pt-4 text-center text-xs text-muted-foreground">
          This is a private link for <strong>{person.firstName} {person.lastName}</strong>.
          Do not share this URL with others.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Data fetching helpers
// ============================================================================

async function fetchJudgeAssignments(participantId: string) {
  return prisma.tournamentDebateJudge.findMany({
    where: { participantId },
    include: {
      ballot: {
        select: { id: true, status: true },
      },
      debate: {
        include: {
          round: {
            select: {
              id: true,
              name: true,
              number: true,
              status: true,
              motion: true,
              infoSlide: true,
            },
          },
          propTeam: {
            select: { id: true, name: true, institution: { select: { name: true } } },
          },
          oppTeam: {
            select: { id: true, name: true, institution: { select: { name: true } } },
          },
          venue: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { debate: { round: { number: 'asc' } } },
      { debate: { order: 'asc' } },
    ],
  });
}

async function fetchTeamInfo(participantId: string) {
  return prisma.tournamentTeamMember.findUnique({
    where: { participantId },
    include: {
      team: {
        include: {
          institution: { select: { name: true } },
          members: {
            include: {
              participant: {
                include: { person: { select: { firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
    },
  });
}
