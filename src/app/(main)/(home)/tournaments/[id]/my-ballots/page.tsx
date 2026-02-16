'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Check, Edit, Scale } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface BallotListItem {
  id: string;
  status: 'DRAFT' | 'SUBMITTED';
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

  useEffect(() => {
    if (!tournamentId || !userId) return;
    void fetchBallots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, userId]);

  async function fetchBallots() {
    try {
      const res = await fetch(`/api/ballots/my?tournamentId=${tournamentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch ballots');
      setEventMode(data.eventMode ?? 'IRL');
      setBallots(data.ballots);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load ballots'
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (ballots.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Scale className="h-6 w-6" />
          My Ballots
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No ballots assigned to you in this tournament yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ballots are created automatically when you are allocated as a
              judge in a debate.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Scale className="h-6 w-6" />
        My Ballots
      </h1>

      <div className="space-y-3">
        {ballots.map((ballot) => (
          <BallotCard key={ballot.id} ballot={ballot} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Ballot Card
// ============================================================================

function BallotCard({ ballot }: { ballot: BallotListItem }) {
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

          <Link href={`/ballots/${ballot.id}`}>
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
