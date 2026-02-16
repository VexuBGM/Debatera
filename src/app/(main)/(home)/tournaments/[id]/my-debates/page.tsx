'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Swords,
  MapPin,
  Users,
  Gavel,
  Trophy,
  Clock,
  CheckCircle2,
  PlayCircle,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';

interface DebateTeamMember {
  id: string;
  name: string;
}

interface DebateTeam {
  id: string;
  name: string;
  institution: string;
  members: DebateTeamMember[];
}

interface DebateJudge {
  id: string;
  role: 'CHAIR' | 'PANELIST';
  name: string;
}

interface DebateResult {
  winningSide: 'PROPOSITION' | 'OPPOSITION';
  winningTeamName: string | null;
  propTotalAvg: number | null;
  oppTotalAvg: number | null;
  voteProp: number;
  voteOpp: number;
}

interface DebateListItem {
  id: string;
  order: number;
  isBye: boolean;
  createdAt: string;
  round: {
    id: string;
    number: number;
    name: string;
    status: RoundStatus;
  };
  propTeam: DebateTeam | null;
  oppTeam: DebateTeam | null;
  venue: { id: string; name: string } | null;
  judges: DebateJudge[];
  result: DebateResult | null;
}

// ============================================================================
// Helpers
// ============================================================================

function deriveDebateStatus(roundStatus: RoundStatus): {
  label: string;
  variant: 'default' | 'outline' | 'secondary';
  className: string;
  icon: React.ReactNode;
} {
  switch (roundStatus) {
    case 'COMPLETED':
      return {
        label: 'Complete',
        variant: 'default',
        className: 'bg-emerald-600 text-white hover:bg-emerald-700',
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        variant: 'default',
        className: 'bg-blue-600 text-white hover:bg-blue-700',
        icon: <PlayCircle className="h-3 w-3" />,
      };
    default:
      return {
        label: 'Upcoming',
        variant: 'outline',
        className:
          'border-dashed border-muted-foreground text-muted-foreground',
        icon: <Clock className="h-3 w-3" />,
      };
  }
}

// ============================================================================
// Page Component
// ============================================================================

export default function MyDebatesPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [debates, setDebates] = useState<DebateListItem[]>([]);
  const [eventMode, setEventMode] = useState<'IRL' | 'ONLINE'>('IRL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !userId) return;
    void fetchDebates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, userId]);

  async function fetchDebates() {
    try {
      const res = await fetch(`/api/debates/my?tournamentId=${tournamentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch debates');
      setEventMode(data.eventMode ?? 'IRL');
      setDebates(data.debates);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load debates'
      );
    } finally {
      setLoading(false);
    }
  }

  // Loading state — mirrors My Ballots skeleton
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (debates.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Swords className="h-6 w-6" />
          My Debates
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No debates assigned to you in this tournament yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Debates appear here once you are allocated to a team in a
              published round.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Swords className="h-6 w-6" />
        My Debates
      </h1>

      <div className="space-y-3">
        {debates.map((debate) => (
          <DebateCard
            key={debate.id}
            debate={debate}
            tournamentId={tournamentId!}
            isOnline={eventMode === 'ONLINE'}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Debate Card
// ============================================================================

function DebateCard({
  debate,
  tournamentId,
  isOnline,
}: {
  debate: DebateListItem;
  tournamentId: string;
  isOnline: boolean;
}) {
  const status = deriveDebateStatus(debate.round.status);
  const canJoinCall =
    isOnline &&
    !debate.isBye &&
    (debate.round.status === 'PUBLISHED' || debate.round.status === 'IN_PROGRESS');

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {/* Row 1: Round name + status badge */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{debate.round.name}</span>
            <Badge className={status.className} variant={status.variant}>
              <span className="flex items-center gap-1">
                {status.icon}
                {status.label}
              </span>
            </Badge>
            {debate.isBye && (
              <Badge variant="secondary">BYE</Badge>
            )}
          </div>

          {/* Result summary (only when complete) */}
          {debate.result && (
            <div className="flex items-center gap-1.5 text-sm">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-medium">
                {debate.result.winningTeamName ?? debate.result.winningSide}
              </span>
              <span className="text-muted-foreground">
                ({debate.result.voteProp}–{debate.result.voteOpp})
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Teams */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Proposition */}
          <TeamBlock
            label="Proposition"
            team={debate.propTeam}
            badgeClassName="bg-cyan-600 text-white hover:bg-cyan-700"
          />
          {/* Opposition */}
          <TeamBlock
            label="Opposition"
            team={debate.oppTeam}
            badgeClassName="bg-rose-600 text-white hover:bg-rose-700"
          />
        </div>

        {/* Row 3: Judges + Venue */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 text-sm text-muted-foreground">
          {/* Judges */}
          {debate.judges.length > 0 && (
            <div className="flex items-start gap-1.5 flex-1">
              <Gavel className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {debate.judges.map((j, idx) => (
                  <span key={j.id}>
                    {j.name}
                    {j.role === 'CHAIR' && (
                      <span className="text-amber-500 ml-0.5" title="Chair">
                        🪑
                      </span>
                    )}
                    {idx < debate.judges.length - 1 && ', '}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* Venue */}
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin className="h-4 w-4" />
            <span>{debate.venue?.name ?? 'TBA'}</span>
          </div>
        </div>

        {/* Join Call button — visible for ONLINE tournaments with PUBLISHED/IN_PROGRESS rounds */}
        {canJoinCall && (
          <div className="pt-3 border-t flex justify-end">
            <Link
              href={`/tournaments/${tournamentId}/rounds/${debate.round.id}/debates/${debate.id}/call`}
            >
              <Button size="sm" className="gap-2">
                <Video className="h-4 w-4" />
                Join Call
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Team Block (reused for prop/opp)
// ============================================================================

function TeamBlock({
  label,
  team,
  badgeClassName,
}: {
  label: string;
  team: DebateTeam | null;
  badgeClassName: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge className={badgeClassName} variant="default">
          {label}
        </Badge>
        <span className="font-medium text-sm">
          {team?.name ?? 'TBD'}
        </span>
      </div>
      {team && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
          <Users className="h-3 w-3 shrink-0" />
          <span>
            {team.members.length > 0
              ? team.members.map((m) => m.name).join(', ')
              : team.institution}
          </span>
        </div>
      )}
    </div>
  );
}
