'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Trophy, 
  Settings,
  Calendar,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VerificationStatus } from '@/components/tournament/VerificationStatus';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  isVerified: boolean;
  createdBy: {
    id: string;
    username: string;
  };
}

interface Team {
  id: string;
  name: string;
  members: {
    user: {
      id: string;
      username: string;
    };
  }[];
}

interface Round {
  id: string;
  number: number;
  stage: string;
  isPublished: boolean;
  createdAt: string;
  debates: {
    id: string;
    propTeam: { id: string; name: string };
    oppTeam: { id: string; name: string };
    status: string;
    winningSide: string | null;
  }[];
}

interface Standing {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  propCount: number;
  oppCount: number;
  opponentStrength: number;
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'rounds' | 'teams' | 'standings' | 'settings' | 'verification'>('rounds');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament details
      const tournamentRes = await fetch('/api/tournaments');
      if (tournamentRes.ok) {
        const tournaments = await tournamentRes.json();
        const foundTournament = tournaments.find((t: Tournament) => t.id === id);
        setTournament(foundTournament || null);
      }

      // Fetch rounds
      const roundsRes = await fetch(`/api/tournaments/${id}/rounds`);
      if (roundsRes.ok) {
        const roundsData = await roundsRes.json();
        setRounds(roundsData);
      }

      // Fetch standings
      const standingsRes = await fetch(`/api/tournaments/${id}/standings`);
      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        setStandings(standingsData);
      }

      // Fetch teams
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const allTeams = await teamsRes.json();
        const tournamentTeams = allTeams.filter((t: Team & { tournament: { id: string } | null }) => t.tournament?.id === id);
        setTeams(tournamentTeams);
      }
    } catch (error) {
      console.error('Failed to fetch tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRound = async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'PRELIM' }),
      });

      if (res.ok) {
        const newRound = await res.json();
        router.push(`/tournaments/${id}/rounds/${newRound.id}`);
      }
    } catch (error) {
      console.error('Failed to create round:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold text-white">Tournament not found</h3>
            <Button
              asChild
              className="mt-4 gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Link href="/tournaments">
                <ArrowLeft className="h-4 w-4" />
                Back to Tournaments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/tournaments">
              <ArrowLeft className="h-4 w-4" />
              Back to Tournaments
            </Link>
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
                {tournament.isVerified && (
                  <Badge className="bg-cyan-500/20 text-cyan-400">Verified</Badge>
                )}
              </div>
              {tournament.description && (
                <p className="mt-2 text-white/60">{tournament.description}</p>
              )}
              <p className="mt-1 text-sm text-white/50">
                Created by {tournament.createdBy.username}
              </p>
            </div>
            <Button
              onClick={createRound}
              className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Create Round
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('rounds')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'rounds'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Calendar className="mb-1 inline h-4 w-4" /> Rounds
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'teams'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Users className="mb-1 inline h-4 w-4" /> Teams
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'standings'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Trophy className="mb-1 inline h-4 w-4" /> Standings
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Settings className="mb-1 inline h-4 w-4" /> Settings
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'verification'
                ? 'border-b-2 border-cyan-500 text-cyan-400'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Shield className="mb-1 inline h-4 w-4" /> Verification
          </button>
        </div>

        {/* Content */}
        {activeTab === 'rounds' && (
          <div>
            {rounds.length === 0 ? (
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="mb-4 h-12 w-12 text-white/40" />
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    No rounds yet
                  </h3>
                  <p className="mb-4 text-center text-white/60">
                    Create your first round to start the tournament
                  </p>
                  <Button
                    onClick={createRound}
                    className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
                  >
                    <Plus className="h-4 w-4" />
                    Create Round
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rounds.map((round) => (
                  <Link
                    key={round.id}
                    href={`/tournaments/${id}/rounds/${round.id}`}
                  >
                    <Card className="group cursor-pointer border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-white/10">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-white group-hover:text-cyan-400">
                              Round {round.number}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="border-white/20 text-white/70"
                            >
                              {round.stage}
                            </Badge>
                            {round.isPublished ? (
                              <Badge className="bg-green-500/20 text-green-400">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Published
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-400">
                                <Clock className="mr-1 h-3 w-3" />
                                Draft
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-white/50">
                            {round.debates.length} debates
                          </span>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Registered Teams</CardTitle>
              <CardDescription className="text-white/60">
                Teams participating in this tournament
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-white/40" />
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    No teams registered yet
                  </h3>
                  <p className="text-center text-white/60">
                    Teams will appear here once they register
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="group"
                    >
                      <Card className="border-white/10 bg-white/5 transition-all hover:border-cyan-500/50 hover:bg-white/10">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-white group-hover:text-cyan-400">
                                {team.name}
                              </h3>
                              <p className="text-sm text-white/60">
                                {team.members.length} members
                              </p>
                            </div>
                            <div className="flex -space-x-2">
                              {team.members.slice(0, 3).map((member) => (
                                <div
                                  key={member.user.id}
                                  className="h-8 w-8 rounded-full border-2 border-[#0b1530] bg-cyan-500/20 flex items-center justify-center text-xs font-medium text-cyan-400"
                                >
                                  {member.user.username[0].toUpperCase()}
                                </div>
                              ))}
                              {team.members.length > 3 && (
                                <div className="h-8 w-8 rounded-full border-2 border-[#0b1530] bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                                  +{team.members.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'standings' && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Tournament Standings</CardTitle>
              <CardDescription className="text-white/60">
                Current rankings based on wins and tie-breakers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {standings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Trophy className="mb-4 h-12 w-12 text-white/40" />
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    No standings yet
                  </h3>
                  <p className="text-center text-white/60">
                    Standings will appear after rounds are completed
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Rank</TableHead>
                      <TableHead className="text-white/70">Team</TableHead>
                      <TableHead className="text-white/70">Wins</TableHead>
                      <TableHead className="text-white/70">Losses</TableHead>
                      <TableHead className="text-white/70">Prop</TableHead>
                      <TableHead className="text-white/70">Opp</TableHead>
                      <TableHead className="text-white/70">Opp Str</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((standing, index) => (
                      <TableRow
                        key={standing.teamId}
                        className="border-white/10 text-white/90"
                      >
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell>{standing.teamName}</TableCell>
                        <TableCell className="font-semibold text-green-400">
                          {standing.wins}
                        </TableCell>
                        <TableCell className="text-red-400">
                          {standing.losses}
                        </TableCell>
                        <TableCell className="text-white/60">
                          {standing.propCount}
                        </TableCell>
                        <TableCell className="text-white/60">
                          {standing.oppCount}
                        </TableCell>
                        <TableCell className="text-white/60">
                          {standing.opponentStrength.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Tournament Settings</CardTitle>
              <CardDescription className="text-white/60">
                Manage tournament organizers and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-white">
                    Organizers
                  </h3>
                  <p className="text-sm text-white/60">
                    Manage who can edit this tournament
                  </p>
                  <Button
                    className="mt-2 gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Add Organizer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'verification' && tournament && (
          <VerificationStatus
            tournamentId={tournament.id}
            isVerified={tournament.isVerified}
            isOrganizer={true}  // TODO: Check if user is organizer
            isAdmin={false}  // TODO: Check if user is admin
            onRequestVerification={async () => {
              // TODO: Implement verification request
              console.log('Requesting verification');
            }}
            onApprove={async (note: string) => {
              // TODO: Implement admin approval
              console.log('Approving verification:', note);
            }}
            onReject={async (note: string) => {
              // TODO: Implement admin rejection
              console.log('Rejecting verification:', note);
            }}
          />
        )}
      </div>
    </div>
  );
}
