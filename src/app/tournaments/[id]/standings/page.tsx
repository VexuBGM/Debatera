'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination';
import type { PaginationMeta } from '@/lib/pagination';
import { Trophy, Users, Medal, ArrowLeft, UserPlus } from 'lucide-react';

// ============================================================================
// Types (matching API response)
// ============================================================================

interface SpeakerStanding {
  rank: number;
  teamId: string;
  teamName: string;
  participantId: string;
  speakerName: string;
  institutionName: string;
  totalPoints: number;
  averagePoints: number;
  speechesCount: number;
  replyTotalPoints: number;
  replyAveragePoints: number;
  replySpeechesCount: number;
}

interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  institutionName: string;
  wins: number;
  losses: number;
  speakerPoints: number;
}

interface StandingsData {
  tournamentId: string;
  tournamentName: string;
  teamStandings: TeamStanding[];
  teamPagination: PaginationMeta;
  speakerStandings: SpeakerStanding[];
  speakerPagination: PaginationMeta;
}

// ============================================================================
// Main page component
// ============================================================================

export default function StandingsPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamPage, setTeamPage] = useState(1);
  const [speakerPage, setSpeakerPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchStandings = useCallback(
    async (tPage: number, sPage: number) => {
      try {
        setLoading(true);
        const includeInProgress = searchParams.get('includeInProgress');
        const qs = new URLSearchParams();
        if (includeInProgress === '1') qs.set('includeInProgress', '1');
        qs.set('teamPage', String(tPage));
        qs.set('teamPageSize', String(PAGE_SIZE));
        qs.set('speakerPage', String(sPage));
        qs.set('speakerPageSize', String(PAGE_SIZE));
        const res = await fetch(`/api/tournaments/${params.id}/standings?${qs.toString()}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Tournament not found.');
          } else {
            setError('Failed to load standings.');
          }
          return;
        }
        const json: StandingsData = await res.json();
        setData(json);
      } catch {
        setError('Failed to load standings.');
      } finally {
        setLoading(false);
      }
    },
    [params.id, searchParams],
  );

  useEffect(() => {
    void fetchStandings(teamPage, speakerPage);
  }, [teamPage, speakerPage, fetchStandings]);

  if (loading) {
    return (
      <PageShell>
        <StandingsLoadingSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-red-400">{error}</p>
        </div>
      </PageShell>
    );
  }

  if (!data) return null;

  const hasData =
    data.teamStandings.length > 0 || data.speakerStandings.length > 0;

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {data.tournamentName}
            </h1>
            <p className="text-slate-400 text-sm">Points &amp; Standings</p>
          </div>

          {isAuthLoaded && (
            <div className="flex justify-center">
              {isSignedIn ? (
                <Button variant="outline" asChild>
                  <Link href={`/tournaments/${data.tournamentId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Tournament
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href={`/tournaments/${data.tournamentId}/register`}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        {!hasData ? (
          <Card className="border-slate-700 bg-slate-900/60">
            <CardContent className="py-16 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-500" />
              <p className="text-lg text-slate-400">
                No completed rounds yet.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Standings will appear once a round has been completed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="speakers" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger
                value="speakers"
                className="flex items-center gap-2"
              >
                <Medal className="h-4 w-4" />
                Speakers
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Teams
              </TabsTrigger>
            </TabsList>

            {/* Speakers Tab */}
            <TabsContent value="speakers" className="mt-4">
              <Card className="border-slate-700 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-lg">Speaker Points</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="w-16 text-center">#</TableHead>
                          <TableHead>Speaker</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Institution
                          </TableHead>
                          <TableHead className="text-right">
                            Avg Pts
                          </TableHead>
                          <TableHead className="text-right hidden sm:table-cell">
                            Speeches
                          </TableHead>
                          <TableHead className="text-right hidden sm:table-cell">
                            Reply Pts
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.speakerStandings.map((s) => (
                          <TableRow
                            key={s.participantId}
                            className="border-slate-700/50"
                          >
                            <TableCell className="text-center font-medium">
                              <RankBadge rank={s.rank} />
                            </TableCell>
                            <TableCell className="font-medium">
                              {s.speakerName}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {s.teamName}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-slate-400">
                              {s.institutionName}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {s.averagePoints}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell text-slate-400 tabular-nums">
                              {s.speechesCount}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell text-slate-400 tabular-nums">
                              {s.replyAveragePoints > 0 ? s.replyAveragePoints : '–'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              {data.speakerPagination && (
                <PaginationControls
                  pagination={data.speakerPagination}
                  onPageChange={setSpeakerPage}
                  className="mt-3"
                />
              )}
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="mt-4">
              <Card className="border-slate-700 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-lg">Team Standings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="w-16 text-center">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Institution
                          </TableHead>
                          <TableHead className="text-right">Wins</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">
                            Losses
                          </TableHead>
                          <TableHead className="text-right">
                            Speaker Pts
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.teamStandings.map((t) => (
                          <TableRow
                            key={t.teamId}
                            className="border-slate-700/50"
                          >
                            <TableCell className="text-center font-medium">
                              <RankBadge rank={t.rank} />
                            </TableCell>
                            <TableCell className="font-medium">
                              {t.teamName}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-slate-400">
                              {t.institutionName}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {t.wins}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell text-slate-400 tabular-nums">
                              {t.losses}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {t.speakerPoints}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              {data.teamPagination && (
                <PaginationControls
                  pagination={data.teamPagination}
                  onPageChange={setTeamPage}
                  className="mt-3"
                />
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-slate-500">
          Only points are shown. Feedback and comments are not displayed here.
        </p>
      </div>
    </PageShell>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/** Minimal page wrapper — mirrors the portal layout (no Navbar/Sidebar). */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </main>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 text-slate-300 font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 font-bold text-sm">
        3
      </span>
    );
  }
  return <span className="text-slate-400">{rank}</span>;
}

function StandingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Skeleton className="h-9 w-64 mx-auto bg-slate-700" />
        <Skeleton className="h-4 w-40 mx-auto bg-slate-700" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64 bg-slate-700 rounded-lg" />
      </div>
      <Card className="border-slate-700 bg-slate-900/60">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-700" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
