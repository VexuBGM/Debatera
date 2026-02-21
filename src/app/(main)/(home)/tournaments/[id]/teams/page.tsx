'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Trash2, UserPlus, UserMinus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  getTeamManagementData,
  createTeamAsOrganizer,
  deleteTeamAsOrganizer,
  assignDebaterToTeam,
  type TeamWithMembers,
  type DebaterParticipant,
} from '@/actions/teams.actions';

function getDisplayName(user: { displayName?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; id: string }): string {
  if (user.displayName) return user.displayName;
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (user.email) return user.email.split('@')[0];
  return user.id;
}

export default function TeamsManagementPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [unassignedDebaters, setUnassignedDebaters] = useState<DebaterParticipant[]>([]);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [tournament, setTournament] = useState<{ id: string; name: string; createdByUserId: string } | null>(null);
  const [teamSizeMin, setTeamSizeMin] = useState(2);
  const [teamSizeMax, setTeamSizeMax] = useState(5);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Create team dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createInstitutionId, setCreateInstitutionId] = useState('');
  const [createTeamName, setCreateTeamName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<string | null>(null);
  const [assignTeamName, setAssignTeamName] = useState('');

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const result = await getTeamManagementData(tournamentId);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to load data');
        return;
      }
      setTeams(result.data.teams);
      setUnassignedDebaters(result.data.unassignedDebaters);
      setInstitutions(result.data.institutions);
      setTournament(result.data.tournament);
      setTeamSizeMin(result.data.teamSizeMin);
      setTeamSizeMax(result.data.teamSizeMax);
      setIsOrganizer(result.data.isOrganizer);
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleCreateTeam() {
    if (!tournamentId) return;
    const instId = createInstitutionId || institutions[0]?.id;
    if (!instId) {
      toast.error('No institution available. Add participants first.');
      return;
    }
    setCreateLoading(true);
    try {
      const result = await createTeamAsOrganizer({
        tournamentId,
        institutionId: instId,
        name: createTeamName.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to create team');
        return;
      }
      toast.success(`Team "${result.data?.team.name}" created`);
      setCreateDialogOpen(false);
      setCreateTeamName('');
      await fetchData();
    } catch {
      toast.error('Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    setActionLoading(teamId);
    try {
      const result = await deleteTeamAsOrganizer({ teamId });
      if (!result.success) {
        toast.error(result.error || 'Failed to delete team');
        return;
      }
      toast.success('Team deleted');
      await fetchData();
    } catch {
      toast.error('Failed to delete team');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAssignDebater(participantId: string, teamId: string | null) {
    if (!tournamentId) return;
    setActionLoading(participantId);
    try {
      const result = await assignDebaterToTeam({
        tournamentId,
        participantId,
        teamId,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to assign debater');
        return;
      }
      toast.success(teamId ? 'Debater assigned to team' : 'Debater removed from team');
      await fetchData();
    } catch {
      toast.error('Failed to update assignment');
    } finally {
      setActionLoading(null);
    }
  }

  function openAssignDialog(teamId: string, teamName: string) {
    setAssignTeamId(teamId);
    setAssignTeamName(teamName);
    setAssignDialogOpen(true);
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="max-w-6xl mx-auto p-4">
        <p className="text-muted-foreground">Tournament not found or access denied.</p>
      </main>
    );
  }

  const canManage = isOrganizer || (userId && tournament.createdByUserId === userId);

  function teamSizeStatus(memberCount: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
    if (memberCount < teamSizeMin) {
      return { label: `${memberCount}/${teamSizeMin} min`, variant: 'destructive' };
    }
    if (memberCount > teamSizeMax) {
      return { label: `${memberCount}/${teamSizeMax} max exceeded`, variant: 'destructive' };
    }
    if (memberCount === teamSizeMax) {
      return { label: `${memberCount}/${teamSizeMax} full`, variant: 'default' };
    }
    return { label: `${memberCount}/${teamSizeMax}`, variant: 'secondary' };
  }

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Teams — {tournament.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {teams.length} team(s) • {unassignedDebaters.length} unassigned debater(s) • Size: {teamSizeMin}–{teamSizeMax}
          </p>
        </div>

        {canManage && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {institutions.length > 1 && (
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Select value={createInstitutionId} onValueChange={setCreateInstitutionId}>
                      <SelectTrigger>
                        <SelectValue placeholder={institutions[0]?.name || 'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Team Name (optional, auto-generated if empty)</Label>
                  <Input
                    placeholder="e.g. Team Alpha"
                    value={createTeamName}
                    onChange={(e) => setCreateTeamName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateTeam();
                    }}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateTeam}
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating…' : 'Create Team'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Teams</h2>
          {teams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No teams yet. Create a team to get started.</p>
              </CardContent>
            </Card>
          ) : (
            teams.map((team) => {
              const status = teamSizeStatus(team.members.length);
              return (
                <Card key={team.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openAssignDialog(team.id, team.name)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteTeam(team.id)}
                              disabled={actionLoading === team.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {team.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                {getDisplayName(member.participant.user).charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm">{getDisplayName(member.participant.user)}</span>
                              {member.participant.user.id.startsWith('guest_') && (
                                <Badge variant="outline" className="text-[10px] py-0">Guest</Badge>
                              )}
                            </div>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleAssignDebater(member.participant.id, null)}
                                disabled={actionLoading === member.participant.id}
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Unassigned debaters column */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Unassigned Debaters ({unassignedDebaters.length})
          </h2>
          <Card>
            <CardContent className="pt-4">
              {unassignedDebaters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All debaters are assigned to teams.
                </p>
              ) : (
                <div className="space-y-2">
                  {unassignedDebaters.map((debater) => (
                    <div key={debater.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                          {getDisplayName(debater.user).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm">{getDisplayName(debater.user)}</span>
                      </div>
                      {canManage && teams.length > 0 && (
                        <Select
                          onValueChange={(teamId) => handleAssignDebater(debater.id, teamId)}
                          disabled={actionLoading === debater.id}
                        >
                          <SelectTrigger className="w-35 h-7 text-xs">
                            <SelectValue placeholder="Assign to…" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => {
                              const isFull = team.members.length >= teamSizeMax;
                              return (
                                <SelectItem
                                  key={team.id}
                                  value={team.id}
                                  disabled={isFull}
                                >
                                  {team.name} ({team.members.length}/{teamSizeMax})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign debaters dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Members to {assignTeamName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2 max-h-72 overflow-y-auto">
            {unassignedDebaters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unassigned debaters available.
              </p>
            ) : (
              unassignedDebaters.map((debater) => (
                <div key={debater.id} className="flex items-center justify-between py-1.5 px-1 hover:bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                      {getDisplayName(debater.user).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{getDisplayName(debater.user)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (assignTeamId) handleAssignDebater(debater.id, assignTeamId);
                    }}
                    disabled={actionLoading === debater.id}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
