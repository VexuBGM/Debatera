'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Trophy, Users, Medal } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { useTournament } from '@/components/TournamentContext';

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
  hideSpeakerPoints: boolean;
}

// ============================================================================
// Main page component
// ============================================================================

export default function StandingsPage() {
  const { tournamentId } = useTournament();
  const searchParams = useSearchParams();
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
        const res = await fetch(`/api/tournaments/${tournamentId}/standings?${qs.toString()}`);
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
    [tournamentId, searchParams],
  );

  useEffect(() => {
    void fetchStandings(teamPage, speakerPage);
  }, [teamPage, speakerPage, fetchStandings]);

  if (loading) {
    return (
      <PageContainer>
        <StandingsLoadingSkeleton />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-destructive">{error}</p>
        </div>
      </PageContainer>
    );
  }

  if (!data) return null;

  const hasData =
    data.teamStandings.length > 0 || data.speakerStandings.length > 0;

  return (
    <PageContainer>
      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No completed rounds yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Standings will appear once a round has been completed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="speakers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="speakers" className="flex items-center gap-2">
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Speaker Points</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">#</TableHead>
                        <TableHead>Speaker</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="hidden sm:table-cell">Institution</TableHead>
                        {!data.hideSpeakerPoints && (
                          <>
                            <TableHead className="text-right">Avg Pts</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">Speeches</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">Reply Pts</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.speakerStandings.map((s) => (
                        <TableRow key={s.participantId}>
                          <TableCell className="text-center font-medium">
                            <RankBadge rank={s.rank} />
                          </TableCell>
                          <TableCell className="font-medium">{s.speakerName}</TableCell>
                          <TableCell className="text-muted-foreground">{s.teamName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {s.institutionName}
                          </TableCell>
                          {!data.hideSpeakerPoints && (
                            <>
                              <TableCell className="text-right font-semibold tabular-nums">
                                {s.averagePoints}
                              </TableCell>
                              <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                                {s.speechesCount}
                              </TableCell>
                              <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                                {s.replyAveragePoints > 0 ? s.replyAveragePoints : '–'}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {data.speakerPagination && data.speakerPagination.totalPages > 1 && (
              <PaginationControls
                pagination={data.speakerPagination}
                onPageChange={setSpeakerPage}
                className="mt-3"
              />
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Standings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">#</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="hidden sm:table-cell">Institution</TableHead>
                        <TableHead className="text-right">Wins</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Losses</TableHead>
                        <TableHead className="text-right">Speaker Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.teamStandings.map((t) => (
                        <TableRow key={t.teamId}>
                          <TableCell className="text-center font-medium">
                            <RankBadge rank={t.rank} />
                          </TableCell>
                          <TableCell className="font-medium">{t.teamName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {t.institutionName}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {t.wins}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                            {t.losses}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{t.speakerPoints}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            {data.teamPagination && data.teamPagination.totalPages > 1 && (
              <PaginationControls
                pagination={data.teamPagination}
                onPageChange={setTeamPage}
                className="mt-3"
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Only points are shown. Feedback and comments are not displayed here.
      </p>
    </PageContainer>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-500 font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
        3
      </span>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

function StandingsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
