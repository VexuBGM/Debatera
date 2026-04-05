'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Scale,
  FileText,
  Check,
  Edit,
  AlertTriangle,
  Trophy,
  MapPin,
  Star,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { PageContainer } from '@/components/PageContainer';
import { usePortalToken } from '@/lib/portal/clientToken';
import { HelpTopics } from '@/components/docs/HelpLink';
import type { BallotModificationRequestSummary } from '@/components/ballot/model';

interface PortalDebate {
  debateId: string;
  order: number;
  propTeamName: string | null;
  oppTeamName: string | null;
  isBye: boolean;
  venueName: string | null;
  judgeRole: 'CHAIR' | 'PANELIST';
  ballotId: string | null;
  ballotStatus: 'DRAFT' | 'SUBMITTED' | null;
  submittedAt: string | null;
  isReopened: boolean;
  canRequestModification: boolean;
  latestModificationRequest: BallotModificationRequestSummary | null;
}

interface PortalRound {
  id: string;
  number: number;
  name: string;
  status: string;
  motion: string | null;
  infoSlide: string | null;
  debates: PortalDebate[];
}

interface FeedbackEntry {
  debateJudgeId: string;
  roundId: string;
  roundName: string;
  roundNumber: number;
  propTeamName: string | null;
  oppTeamName: string | null;
  feedbackCount: number;
  avgClarity: number | null;
  avgFairness: number | null;
  comments: { comment: string; submittedAt: string }[];
}

interface PortalContext {
  tournament: {
    id: string;
    name: string;
    eventMode: 'IRL' | 'ONLINE';
  };
  judge: {
    participantId: string;
    displayName: string;
    institution: string;
  };
  rounds: PortalRound[];
}

export default function JudgePortalPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { token, ready, clearToken } = usePortalToken(tournamentId);

  const [context, setContext] = useState<PortalContext | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    if (!tournamentId || !token) return;
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/portal/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // Non-critical; silent fail
      const data = await res.json();
      setFeedbacks(data.feedback ?? []);
    } catch {
      // Silent fail — feedback is supplementary
    }
  }, [token, tournamentId]);

  const fetchContext = useCallback(async () => {
    if (!tournamentId || !token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/portal/judge`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) clearToken();
        setError(data?.error || 'Failed to load portal');
        return;
      }
      setContext(data);
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [clearToken, token, tournamentId]);

  useEffect(() => {
    if (!ready) return;

    if (!token) {
      setError('This portal link is missing a valid authentication token.');
      setLoading(false);
      return;
    }

    void fetchContext();
    void fetchFeedback();
  }, [fetchContext, fetchFeedback, ready, token]);

  if (loading || !ready) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  if (error || !context) {
    return (
      <PageContainer>
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="max-w-md text-muted-foreground">
            {error || 'This link is invalid or has been revoked.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact the tournament organizer for a new link.
          </p>
        </div>
      </PageContainer>
    );
  }

  const { tournament, judge, rounds } = context;

  // Group feedback by roundId for fast lookup
  const feedbackByRound = new Map<string, FeedbackEntry[]>();
  for (const fb of feedbacks) {
    const arr = feedbackByRound.get(fb.roundId) ?? [];
    arr.push(fb);
    feedbackByRound.set(fb.roundId, arr);
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
          </div>
          <p className="text-muted-foreground">
            <span className="font-medium text-white">{judge.displayName}</span>
            {judge.institution && (
              <span className="text-sm"> - {judge.institution}</span>
            )}
          </p>
          <Badge variant="secondary" className="text-xs">
            Judge Portal
          </Badge>
        </div>

        <HelpTopics
          topics={[
            { section: 'Using the Judge Portal' },
            { section: 'Entering a Ballot (WSDC Format)', label: 'Ballot scoring guide' },
          ]}
          className="bg-background/60"
        />

        {rounds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Scale className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No debates assigned to you yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ballots will appear here once the organizer allocates rounds.
              </p>
            </CardContent>
          </Card>
        ) : (
          rounds.map((round) => (
            <Card key={round.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5" />
                  {round.name}
                  <Badge
                    variant="outline"
                    className={
                      round.status === 'IN_PROGRESS'
                        ? 'border-green-500 text-green-400'
                        : round.status === 'COMPLETED'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-muted-foreground'
                    }
                  >
                    {round.status === 'IN_PROGRESS'
                      ? 'In Progress'
                      : round.status === 'COMPLETED'
                        ? 'Completed'
                        : round.status === 'PUBLISHED'
                          ? 'Published'
                          : round.status}
                  </Badge>
                </CardTitle>
                {round.motion && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    Motion: {round.motion}
                  </p>
                )}
                {round.infoSlide && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {round.infoSlide}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {round.debates.map((debate) => (
                  <PortalDebateCard
                    key={debate.debateId}
                    debate={debate}
                    tournamentId={tournament.id}
                    eventMode={tournament.eventMode}
                    roundStatus={round.status}
                  />
                ))}
                {round.status === 'COMPLETED' && (() => {
                  const roundFeedbacks = feedbackByRound.get(round.id) ?? [];
                  if (roundFeedbacks.length === 0) return null;
                  return (
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        Feedback from debaters
                      </p>
                      {roundFeedbacks.map((fb) => (
                        <FeedbackSummaryCard key={fb.debateJudgeId} fb={fb} />
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}

function StarDisplay({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.round(value) ? 'fill-amber-400 stroke-amber-400' : 'fill-transparent stroke-muted-foreground'}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </span>
  );
}

function FeedbackSummaryCard({ fb }: { fb: FeedbackEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
      <p className="text-xs text-muted-foreground mb-2">
        {fb.propTeamName ?? '—'} vs {fb.oppTeamName ?? '—'} &middot; {fb.feedbackCount}{' '}
        {fb.feedbackCount === 1 ? 'submission' : 'submissions'}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Clarity</span>
          <StarDisplay value={fb.avgClarity} />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Fairness</span>
          <StarDisplay value={fb.avgFairness} />
        </span>
      </div>
      {fb.comments.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? 'Hide' : 'Show'} {fb.comments.length}{' '}
          {fb.comments.length === 1 ? 'comment' : 'comments'}
        </button>
      )}
      {open && (
        <ul className="mt-2 space-y-1.5">
          {fb.comments.map((c, i) => (
            <li key={i} className="rounded bg-muted/30 px-2.5 py-1.5 text-xs">
              {c.comment}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PortalDebateCard({
  debate,
  tournamentId,
  eventMode,
  roundStatus,
}: {
  debate: PortalDebate;
  tournamentId: string;
  eventMode: string;
  roundStatus: string;
}) {
  const isSubmitted = debate.ballotStatus === 'SUBMITTED';
  const canEdit = !isSubmitted && (roundStatus === 'IN_PROGRESS' || debate.isReopened);

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              debate.judgeRole === 'CHAIR'
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-zinc-600 text-zinc-100 hover:bg-zinc-700'
            }
          >
            {debate.judgeRole === 'CHAIR' ? 'Chair' : 'Panelist'}
          </Badge>
          {debate.ballotStatus && (
            <Badge
              className={
                isSubmitted
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-dashed border-muted-foreground text-muted-foreground'
              }
              variant={isSubmitted ? 'default' : 'outline'}
            >
              {isSubmitted ? (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Submitted
                </span>
              ) : (
                'Draft'
              )}
            </Badge>
          )}
          {debate.isReopened && (
            <Badge variant="outline" className="border-sky-500 text-sky-400">
              Reopened
            </Badge>
          )}
          {debate.latestModificationRequest?.status === 'PENDING' && (
            <Badge variant="outline" className="border-amber-500 text-amber-400">
              Modification Pending
            </Badge>
          )}
        </div>

        <p className="text-sm font-medium">
          {debate.isBye
            ? 'BYE'
            : `${debate.propTeamName ?? 'TBD'} vs ${debate.oppTeamName ?? 'TBD'}`}
        </p>

        {eventMode !== 'ONLINE' && debate.venueName && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {debate.venueName}
          </p>
        )}
      </div>

      {debate.ballotId && !debate.isBye && (
        <Link href={`/tournaments/${tournamentId}/p/ballots/${debate.ballotId}`}>
          <Button
            variant={isSubmitted ? 'outline' : 'default'}
            size="sm"
            className="ml-3 shrink-0"
          >
            {isSubmitted ? (
              <>
                <FileText className="mr-1 h-4 w-4" />
                View
              </>
            ) : canEdit ? (
              <>
                <Edit className="mr-1 h-4 w-4" />
                Enter Ballot
              </>
            ) : (
              <>
                <FileText className="mr-1 h-4 w-4" />
                View
              </>
            )}
          </Button>
        </Link>
      )}
    </div>
  );
}
