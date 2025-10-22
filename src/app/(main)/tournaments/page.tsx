'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Calendar, CheckCircle } from 'lucide-react';
import { RoleSelectionModal } from '@/components/tournament/RoleSelectionModal';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  isVerified: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    username: string;
    imageUrl: string | null;
  };
  teams?: { id: string }[];
  rounds?: { id: string }[];
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [userTeams, setUserTeams] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchTournaments();
    fetchUserTeams();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTeams = async () => {
    try {
      const userRes = await fetch('/api/user');
      if (!userRes.ok) return;
      
      const userData = await userRes.json();
      
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const allTeams = await teamsRes.json();
        const myTeams = allTeams.filter((team: any) =>
          team.members.some((m: any) => m.user.id === userData.id)
        );
        setUserTeams(myTeams.map((t: any) => ({ id: t.id, name: t.name })));
      }
    } catch (error) {
      console.error('Failed to fetch user teams:', error);
    }
  };

  const handleJoin = async (role: 'DEBATER' | 'JUDGE' | 'SPECTATOR', teamId?: string) => {
    if (!selectedTournament) return;

    // Here you would call the API to join the tournament
    // For now, we'll just simulate success
    console.log('Joining tournament:', selectedTournament.id, 'as', role, 'with team', teamId);
    
    // Refresh tournaments
    await fetchTournaments();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Tournaments</h1>
            <p className="mt-2 text-white/60">
              Manage and participate in debate tournaments
            </p>
          </div>
          <Button
            asChild
            className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
          >
            <Link href="/tournaments/new">
              <Plus className="h-4 w-4" />
              Create Tournament
            </Link>
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        )}

        {/* Tournaments Grid */}
        {!loading && tournaments.length === 0 && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="mb-4 h-12 w-12 text-white/40" />
              <h3 className="mb-2 text-lg font-semibold text-white">
                No tournaments yet
              </h3>
              <p className="mb-4 text-center text-white/60">
                Create your first tournament to get started
              </p>
              <Button
                asChild
                className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
              >
                <Link href="/tournaments/new">
                  <Plus className="h-4 w-4" />
                  Create Tournament
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && tournaments.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="group border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/tournaments/${tournament.id}`}>
                        <CardTitle className="text-white group-hover:text-cyan-400 cursor-pointer">
                          {tournament.name}
                        </CardTitle>
                      </Link>
                      {tournament.description && (
                        <CardDescription className="mt-2 text-white/60">
                          {tournament.description}
                        </CardDescription>
                      )}
                    </div>
                    {tournament.isVerified && (
                      <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm text-white/70">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{tournament.teams?.length || 0} teams</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{tournament.rounds?.length || 0} rounds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span>
                          Created by {tournament.createdBy.username}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTournament(tournament);
                        }}
                        className="flex-1 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                        variant="outline"
                      >
                        Join
                      </Button>
                      <Button
                        asChild
                        className="flex-1"
                        variant="outline"
                      >
                        <Link href={`/tournaments/${tournament.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Role Selection Modal */}
        {selectedTournament && (
          <RoleSelectionModal
            open={!!selectedTournament}
            onOpenChange={(open) => !open && setSelectedTournament(null)}
            tournamentId={selectedTournament.id}
            tournamentName={selectedTournament.name}
            onJoin={handleJoin}
            userTeams={userTeams}
          />
        )}
      </div>
    </div>
  );
}
