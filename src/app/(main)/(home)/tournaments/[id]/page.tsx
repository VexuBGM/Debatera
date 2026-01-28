'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdByUserId: string;
  createdAt: string;
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

  const isOwner = tournament?.createdByUserId === userId;

  useEffect(() => {
    if (!tournamentId) return;
    fetchTournament();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={tournament.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                {tournament.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{new Date(tournament.createdAt).toLocaleDateString()}</p>
            </div>
            {isOwner && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">You are the owner of this tournament</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
