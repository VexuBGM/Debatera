'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, ArrowLeft, Users, Building2, Play } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
}

interface Registration {
  id: string;
  institutionId: string;
  status: string;
  institution: Institution;
}

interface Room {
  id: string;
  streamCallId: string;
}

interface Match {
  id: string;
  affRegistration: Registration;
  negRegistration: Registration | null;
  room: Room | null;
}

interface Round {
  id: string;
  number: number;
  matches: Match[];
}

interface Tournament {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdByUserId: string;
  createdAt: string;
  registrations: Registration[];
  rounds: Round[];
  createdBy: {
    id: string;
    username: string | null;
    email: string | null;
  };
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [generatingRound, setGeneratingRound] = useState(false);

  const isOwner = tournament?.createdByUserId === userId;

  useEffect(() => {
    if (!tournamentId) return;
    fetchTournament();
  }, [tournamentId]);

  async function fetchTournament() {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTournament(data);
    } catch {
      toast.error('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setRegistering(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register-institution`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }
      toast.success('Institution registered successfully!');
      fetchTournament();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  async function handleUnregister() {
    setRegistering(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register-institution`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Unregistration failed');
      }
      toast.success('Institution unregistered');
      fetchTournament();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unregistration failed');
    } finally {
      setRegistering(false);
    }
  }

  async function handleGenerateRound() {
    setGeneratingRound(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate round');
      }
      toast.success('Round generated successfully!');
      fetchTournament();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate round');
    } finally {
      setGeneratingRound(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="max-w-4xl mx-auto p-4">
        <p>Tournament not found</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tournaments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-cyan-500" />
            <h1 className="text-2xl font-semibold">{tournament.name}</h1>
            <Badge variant={tournament.status === 'PUBLISHED' ? 'default' : 'secondary'}>
              {tournament.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created by {tournament.createdBy?.username || tournament.createdBy?.email || 'Unknown'}
          </p>
        </div>
      </div>

      {/* Registration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Registered Institutions ({tournament.registrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.registrations.length === 0 ? (
            <p className="text-muted-foreground">No institutions registered yet.</p>
          ) : (
            <ul className="space-y-2">
              {tournament.registrations.map((reg) => (
                <li key={reg.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                  <Building2 className="h-4 w-4" />
                  <span>{reg.institution.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {reg.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex gap-2">
            <Button onClick={handleRegister} disabled={registering}>
              {registering ? 'Registering...' : 'Register My Institution'}
            </Button>
            <Button variant="outline" onClick={handleUnregister} disabled={registering}>
              Unregister
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rounds Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rounds ({tournament.rounds.length})
            </span>
            {isOwner && (
              <Button
                onClick={handleGenerateRound}
                disabled={generatingRound || tournament.registrations.length < 2}
                size="sm"
              >
                {generatingRound ? 'Generating...' : 'Generate Next Round'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.rounds.length === 0 ? (
            <p className="text-muted-foreground">
              No rounds generated yet.
              {tournament.registrations.length < 2 && ' Need at least 2 registered institutions.'}
            </p>
          ) : (
            <div className="space-y-4">
              {tournament.rounds.map((round) => (
                <div key={round.id} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Round {round.number}</h3>
                  <div className="space-y-2">
                    {round.matches.map((match) => (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            AFF
                          </Badge>
                          <span>{match.affRegistration.institution.name}</span>
                          <span className="text-muted-foreground">vs</span>
                          <Badge variant="outline" className="bg-red-500/10 text-red-600">
                            NEG
                          </Badge>
                          <span>
                            {match.negRegistration?.institution.name || 'BYE'}
                          </span>
                        </div>
                        {match.room && (
                          <Link href={`/rooms/${match.room.id}`}>
                            <Button size="sm" variant="outline">
                              <Play className="h-4 w-4 mr-1" />
                              Join Room
                            </Button>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
