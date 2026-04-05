/**
 * Judge Feedback Page
 *
 * Public, anonymous page where debaters submit feedback for judges.
 * One link per round — debaters select their debate, then their judge, then fill in ratings.
 *
 * No authentication required.
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { TournamentRoundStatus } from '@prisma/client';
import { FeedbackForm } from './FeedbackForm';

type PageParams = { params: Promise<{ id: string; roundId: string }> };

export default async function JudgeFeedbackPage({ params }: PageParams) {
  const { id: tournamentId, roundId } = await params;

  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: {
      debates: {
        where: { isBye: false },
        orderBy: { order: 'asc' },
        include: {
          propTeam: { select: { name: true } },
          oppTeam: { select: { name: true } },
          judges: {
            include: {
              participant: {
                include: { user: true },
              },
            },
            orderBy: { role: 'asc' },
          },
        },
      },
    },
  });

  if (!round || round.tournamentId !== tournamentId) {
    notFound();
  }

  const isOpen =
    round.status === TournamentRoundStatus.IN_PROGRESS ||
    round.status === TournamentRoundStatus.COMPLETED;

  const debates = round.debates.map((d) => ({
    id: d.id,
    propTeamName: d.propTeam?.name ?? null,
    oppTeamName: d.oppTeam?.name ?? null,
    judges: d.judges.map((j) => ({
      debateJudgeId: j.id,
      name: displayNameFromDbUser(j.participant.user),
      role: j.role as 'CHAIR' | 'PANELIST',
    })),
  }));

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Judge feedback</p>
        <h1 className="text-2xl font-semibold">{round.name}</h1>
      </div>

      {!isOpen ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          Feedback is not yet open for this round.
        </div>
      ) : debates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          No debates found for this round.
        </div>
      ) : (
        <FeedbackForm
          tournamentId={tournamentId}
          roundId={roundId}
          debates={debates}
        />
      )}
    </div>
  );
}
