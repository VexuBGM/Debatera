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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trophy, Lock, ChevronDown, Check, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';

// =============================================================================
// Types
// =============================================================================

type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';

const ALL_ROUND_STATUSES: RoundStatus[] = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED'];

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

function getStatusBadgeVariant(status: RoundStatus): 'draft' | 'published' | 'in-progress' | 'completed' {
  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'PUBLISHED':
      return 'published';
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'COMPLETED':
      return 'completed';
    default:
      return 'draft';
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
  const [updatingStatusForRound, setUpdatingStatusForRound] = useState<string | null>(null);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [roundToRename, setRoundToRename] = useState<Round | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<Round | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleStatusChange(roundId: string, newStatus: RoundStatus) {
    setUpdatingStatusForRound(roundId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.validationErrors?.length) {
          data.validationErrors.forEach((err: string) => toast.error(err));
        } else {
          throw new Error(data?.error || 'Failed to update status');
        }
        return;
      }

      toast.success(`Round status changed to ${newStatus.toLowerCase().replace('_', ' ')}`);
      setRounds((prev) =>
        prev.map((r) => (r.id === roundId ? { ...r, status: newStatus } : r))
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatusForRound(null);
    }
  }

  function openRenameDialog(round: Round) {
    setRoundToRename(round);
    setRenameValue(round.name);
    setRenameDialogOpen(true);
  }

  async function handleRename() {
    if (!roundToRename || !renameValue.trim()) return;

    setRenaming(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundToRename.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to rename round');

      toast.success('Round renamed successfully');
      setRounds((prev) =>
        prev.map((r) => (r.id === roundToRename.id ? { ...r, name: renameValue.trim() } : r))
      );
      setRenameDialogOpen(false);
      setRoundToRename(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename round');
    } finally {
      setRenaming(false);
    }
  }

  function openDeleteDialog(round: Round) {
    setRoundToDelete(round);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteRound() {
    if (!roundToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete round');

      toast.success('Round deleted successfully');
      setRounds((prev) => prev.filter((r) => r.id !== roundToDelete.id));
      setDeleteDialogOpen(false);
      setRoundToDelete(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete round');
    } finally {
      setDeleting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <PageContainer size="md">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </PageContainer>
    );
  }

  // Not found state
  if (!tournament) {
    return (
      <PageContainer size="md">
        <EmptyState
          icon={<Trophy className="h-16 w-16" />}
          title="Tournament Not Found"
          description="The tournament you're looking for doesn't exist or may have been removed."
          action={{ label: 'Browse Tournaments', href: '/' }}
          className="min-h-[60vh]"
        />
      </PageContainer>
    );
  }

  // Non-admin: show read-only view
  if (!isOwner) {
    return (
      <PageContainer size="md">
        <PageHeader
          icon={<Trophy className="h-6 w-6 text-brand" />}
          title={`${tournament.name} - Rounds`}
        />

        {rounds.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<Lock className="h-12 w-12" />}
                title="No Rounds Yet"
                description="No rounds have been published yet."
              />
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
      </PageContainer>
    );
  }

  // Admin view
  return (
    <PageContainer size="md">
      <PageHeader
        icon={<Trophy className="h-6 w-6 text-brand" />}
        title={`${tournament.name} - Rounds`}
        actions={
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
        }
      />

      {rounds.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Trophy className="h-12 w-12" />}
              title="No Rounds Yet"
              description="Create your first round to start setting up the pairings."
              action={{ label: 'Create First Round', onClick: () => setCreateDialogOpen(true) }}
            />
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                        disabled={updatingStatusForRound === round.id}
                      >
                        <Badge variant={getStatusBadgeVariant(round.status)}>
                          {getStatusLabel(round.status)}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ALL_ROUND_STATUSES.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          disabled={status === round.status || updatingStatusForRound === round.id}
                          onClick={() => handleStatusChange(round.id, status)}
                        >
                          <Badge variant={getStatusBadgeVariant(status)} className="mr-2">
                            {getStatusLabel(status)}
                          </Badge>
                          {status === round.status && <Check className="h-3 w-3 ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      {round.status === 'DRAFT' ? 'Edit' : 'View'}
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openRenameDialog(round)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={round.status !== 'DRAFT'}
                        onClick={() => openDeleteDialog(round)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Round</DialogTitle>
            <DialogDescription>
              Enter a new name for this round.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="renameName">Round Name</Label>
              <Input
                id="renameName"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRename();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{roundToDelete?.name}&quot;? This will permanently
              remove the round and all its debates, pairings, and ballots. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRound}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
