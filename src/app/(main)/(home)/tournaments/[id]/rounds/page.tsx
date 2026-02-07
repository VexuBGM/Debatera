'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trophy, Lock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';

interface Round {
  id: string;
  number: number;
  name: string;
  status: RoundStatus;
  createdAt: string;
  updatedAt: string;
}

interface Tournament {
  id: string;
  name: string;
  createdByUserId: string;
}

// =============================================================================
// Status Badge Helper
// =============================================================================

function getStatusBadgeVariant(status: RoundStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DRAFT':
      return 'secondary';
    case 'PUBLISHED':
      return 'default';
    case 'IN_PROGRESS':
      return 'destructive';
    case 'COMPLETED':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: RoundStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PUBLISHED':
      return 'Published';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status;
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function TournamentRoundsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create round dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');

  const isOwner = tournament?.createdByUserId === userId;

  // Fetch tournament details and rounds
  useEffect(() => {
    if (!tournamentId) return;
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function fetchData() {
    try {
      // Fetch tournament details
      const tournamentRes = await fetch(`/api/tournaments/${tournamentId}`);
      if (!tournamentRes.ok) throw new Error('Failed to fetch tournament');
      const tournamentData = await tournamentRes.json();
      setTournament(tournamentData);

      // Fetch rounds
      const roundsRes = await fetch(`/api/tournaments/${tournamentId}/rounds`);
      if (!roundsRes.ok) throw new Error('Failed to fetch rounds');
      const roundsData = await roundsRes.json();
      setRounds(roundsData.rounds || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRound() {
    if (!isOwner) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoundName || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create round');

      toast.success('Round created successfully');
      setCreateDialogOpen(false);
      setNewRoundName('');

      // Navigate to the new round's editor
      router.push(`/tournaments/${tournamentId}/rounds/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create round');
    } finally {
      setCreating(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  // Not found state
  if (!tournament) {
    return (
      <main className="max-w-4xl mx-auto p-4">
        <p>Tournament not found</p>
      </main>
    );
  }

  // Non-admin: show read-only view
  if (!isOwner) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Trophy className="h-6 w-6 text-cyan-500" />
          <h1 className="text-2xl font-semibold">{tournament.name} - Rounds</h1>
        </div>

        {rounds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rounds have been published yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rounds.map((round) => (
              <Link key={round.id} href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{round.name}</p>
                      <p className="text-sm text-muted-foreground">Round {round.number}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(round.status)}>
                      {getStatusLabel(round.status)}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    );
  }

  // Admin view
  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Trophy className="h-6 w-6 text-cyan-500" />
          <h1 className="text-2xl font-semibold">{tournament.name} - Rounds</h1>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Round
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Round</DialogTitle>
              <DialogDescription>
                A new round will be created with the next sequential number.
                You can optionally provide a custom name.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="roundName">Round Name (optional)</Label>
                <Input
                  id="roundName"
                  placeholder={`e.g., Round ${rounds.length + 1} or Quarterfinals`}
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the default name &quot;Round {rounds.length + 1}&quot;
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRound} disabled={creating}>
                {creating ? 'Creating...' : 'Create Round'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rounds.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Rounds Yet</CardTitle>
            <CardDescription>
              Create your first round to start setting up the pairings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Round
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <Card key={round.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {round.number}
                  </div>
                  <div>
                    <p className="font-medium">{round.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {round.status === 'DRAFT' ? 'Not published' : 'Published'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(round.status)}>
                    {getStatusLabel(round.status)}
                  </Badge>
                  <Link href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      {round.status === 'DRAFT' ? 'Edit' : 'View'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
