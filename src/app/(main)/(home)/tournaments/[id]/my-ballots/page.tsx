'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination';
import { FileText, Check, Edit, Scale } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { PaginationMeta } from '@/lib/pagination';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import type { BallotModificationRequestSummary } from '@/components/ballot/model';
import { useTourTrigger } from '@/hooks/useTour';

// ============================================================================
// Types
// ============================================================================

interface BallotListItem {
  id: string;
  status: 'DRAFT' | 'SUBMITTED';
  isReopened: boolean;
  canRequestModification: boolean;
  latestModificationRequest: BallotModificationRequestSummary | null;
  vote: 'PROPOSITION' | 'OPPOSITION' | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  adjudicatorRole: 'CHAIR' | 'PANELIST';
  round: {
    id: string;
    number: number;
    name: string;
    status: string;
  };
  debate: {
    id: string;
    propTeam: { id: string; name: string; institution: string } | null;
    oppTeam: { id: string; name: string; institution: string } | null;
    venue: { id: string; name: string } | null;
  };
}

// ============================================================================
// Page Component
// ============================================================================

export default function MyBallotsPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [ballots, setBallots] = useState<BallotListItem[]>([]);
  const [eventMode, setEventMode] = useState<'IRL' | 'ONLINE'>('IRL');
  const [loading, setLoading] = useState(true);
  const [ballotsPage, setBallotsPage] = useState(1);
  const [ballotsPaginationMeta, setBallotsPaginationMeta] = useState<PaginationMeta | null>(null);
  const BALLOTS_PAGE_SIZE = 10;
  useTourTrigger('tournament-my-ballots', !loading);

  const fetchBallots = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ballots/my?tournamentId=${tournamentId}&page=${page}&pageSize=${BALLOTS_PAGE_SIZE}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch ballots');
      setEventMode(data.eventMode ?? 'IRL');
      setBallots(data.ballots);
      if (data.pagination) setBallotsPaginationMeta(data.pagination);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load ballots'
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId || !userId) return;
    void fetchBallots(ballotsPage);
  }, [tournamentId, userId, ballotsPage, fetchBallots]);

  if (loading) {
    return (
      <PageContainer size="md">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (ballots.length === 0) {
    return (
      <PageContainer size="md">
        <PageHeader
          icon={<Scale className="h-6 w-6" />}
          title="My Ballots"
        />
        <Card data-tour="my-ballots-list">
          <CardContent>
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No ballots assigned yet"
              description="Ballots are created automatically when you are allocated as a judge in a debate."
            />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <PageHeader
        icon={<Scale className="h-6 w-6" />}
        title="My Ballots"
      />

      <div className="space-y-3" data-tour="my-ballots-list">
        {ballots.map((ballot) => (
          <BallotCard key={ballot.id} ballot={ballot} eventMode={eventMode} />
        ))}
      </div>
      {ballotsPaginationMeta && (
        <PaginationControls
          pagination={ballotsPaginationMeta}
          onPageChange={setBallotsPage}
          className="mt-4"
        />
      )}
    </PageContainer>
  );
}

// ============================================================================
// Ballot Card
// ============================================================================

function BallotCard({ ballot, eventMode }: { ballot: BallotListItem; eventMode: 'IRL' | 'ONLINE' }) {
  const isSubmitted = ballot.status === 'SUBMITTED';

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{ballot.round.name}</span>
              <Badge
                className={
                  ballot.adjudicatorRole === 'CHAIR'
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-zinc-600 text-zinc-100 hover:bg-zinc-700'
                }
              >
                {ballot.adjudicatorRole === 'CHAIR' ? '🪑 Chair' : 'Panelist'}
              </Badge>
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
              {ballot.isReopened && (
                <Badge variant="outline" className="border-sky-500 text-sky-400">
                  Reopened
                </Badge>
              )}
              {ballot.latestModificationRequest?.status === 'PENDING' && (
                <Badge variant="outline" className="border-amber-500 text-amber-400">
                  Modification Pending
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {ballot.debate.propTeam?.name ?? 'TBD'} vs{' '}
              {ballot.debate.oppTeam?.name ?? 'TBD'}
            </p>

            {eventMode !== 'ONLINE' && ballot.debate.venue && (
              <p className="text-xs text-muted-foreground">
                📍 {ballot.debate.venue.name}
              </p>
            )}
          </div>

          <Link href={`/ballots/${ballot.id}`} data-tour="my-ballots-action">
            <Button variant={isSubmitted ? 'outline' : 'default'} size="sm">
              {isSubmitted ? (
                <>
                  <FileText className="mr-1 h-4 w-4" />
                  View
                </>
              ) : (
                <>
                  <Edit className="mr-1 h-4 w-4" />
                  Enter Ballot
                </>
              )}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
