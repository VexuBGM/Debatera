'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trophy, Users, Calendar } from 'lucide-react';

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

  useEffect(() => {
    fetchTournaments();
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
              <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
                <Card className="group cursor-pointer border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-white/10">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white group-hover:text-cyan-400">
                          {tournament.name}
                        </CardTitle>
                        {tournament.description && (
                          <CardDescription className="mt-2 text-white/60">
                            {tournament.description}
                          </CardDescription>
                        )}
                      </div>
                      {tournament.isVerified && (
                        <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
