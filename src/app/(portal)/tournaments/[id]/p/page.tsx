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
} from 'lucide-react';
import Link from 'next/link';
import { PageContainer } from '@/components/PageContainer';
import { usePortalToken } from '@/lib/portal/clientToken';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [fetchContext, ready, token]);

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
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
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
