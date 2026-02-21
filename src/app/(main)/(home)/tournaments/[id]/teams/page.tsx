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
import { Textarea } from '@/components/ui/textarea';
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
import { Users, Plus, Trash2, UserPlus, UserMinus, Shield, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getTeamManagementData,
  createTeamAsOrganizer,
  deleteTeamAsOrganizer,
  assignDebaterToTeam,
  bulkAddDebatersToTeam,
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
  const [createNewInstName, setCreateNewInstName] = useState('');
  const [createTeamName, setCreateTeamName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Add debaters to team dialog
  const [addDebatersDialogOpen, setAddDebatersDialogOpen] = useState(false);
  const [addDebatersTeamId, setAddDebatersTeamId] = useState<string | null>(null);
  const [addDebatersTeamName, setAddDebatersTeamName] = useState('');
  const [addDebatersNames, setAddDebatersNames] = useState('');
  const [addDebatersLoading, setAddDebatersLoading] = useState(false);
  const [addDebatersResults, setAddDebatersResults] = useState<
    Array<{ line: number; name: string; success: boolean; error?: string }> | null
  >(null);

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

    const isNew = createInstitutionId === '__new__';
    const instId = isNew ? undefined : createInstitutionId || undefined;
    const instName = isNew ? createNewInstName.trim() : undefined;

    if (!instId && !instName) {
      toast.error('Please select or create an institution.');
      return;
    }

    setCreateLoading(true);
    try {
      const result = await createTeamAsOrganizer({
        tournamentId,
        institutionId: instId,
        institutionName: instName,
        name: createTeamName.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to create team');
        return;
      }
      toast.success(`Team "${result.data?.team.name}" created`);
      setCreateDialogOpen(false);
      setCreateTeamName('');
      setCreateInstitutionId('');
      setCreateNewInstName('');
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

  // ── Bulk add debaters to team ─────────────────────
  function openAddDebatersDialog(teamId: string, teamName: string) {
    setAddDebatersTeamId(teamId);
    setAddDebatersTeamName(teamName);
    setAddDebatersNames('');
    setAddDebatersResults(null);
    setAddDebatersDialogOpen(true);
  }

  async function handleBulkAddDebaters() {
    if (!tournamentId || !addDebatersTeamId || !addDebatersNames.trim()) return;
    setAddDebatersLoading(true);
    setAddDebatersResults(null);
    try {
      const result = await bulkAddDebatersToTeam({
        tournamentId,
        teamId: addDebatersTeamId,
        names: addDebatersNames,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to add debaters');
        return;
      }
      if (result.data) {
        setAddDebatersResults(result.data.results);
        toast.success(`Added ${result.data.totalCreated} debater(s)`);
        if (result.data.totalCreated > 0) {
          await fetchData();
        }
      }
    } catch {
      toast.error('Failed to add debaters');
    } finally {
      setAddDebatersLoading(false);
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
                <div className="space-y-2">
                  <Label>Institution</Label>
                  <Select value={createInstitutionId} onValueChange={setCreateInstitutionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution…" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">
                        <span className="flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Create new institution…
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {createInstitutionId === '__new__' && (
                    <Input
                      placeholder="Institution name"
                      value={createNewInstName}
                      onChange={(e) => setCreateNewInstName(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
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
                      <div>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {team.institution.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {canManage && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => openAddDebatersDialog(team.id, team.name)}
                            >
                              <UserPlus className="h-3.5 w-3.5 mr-1" />
                              Add Debaters
                            </Button>
                            {unassignedDebaters.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Assign existing debater"
                                onClick={() => openAssignDialog(team.id, team.name)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
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

      {/* ── Bulk Add Debaters dialog ────────────────── */}
      <Dialog
        open={addDebatersDialogOpen}
        onOpenChange={(open) => {
          setAddDebatersDialogOpen(open);
          if (!open) setAddDebatersResults(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Debaters to {addDebatersTeamName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter one name per line. Debaters will inherit the team&apos;s institution automatically.
            </p>
            <Textarea
              placeholder={'Ivan Ivanov\nMaria Petrova\nGeorgi Dimitrov'}
              value={addDebatersNames}
              onChange={(e) => setAddDebatersNames(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              {addDebatersNames.split('\n').filter((l) => l.trim()).length} name(s) entered
            </p>
            <Button
              className="w-full"
              onClick={handleBulkAddDebaters}
              disabled={addDebatersLoading || !addDebatersNames.trim()}
            >
              {addDebatersLoading ? 'Adding…' : 'Add Debaters'}
            </Button>

            {addDebatersResults && (
              <div className="max-h-48 overflow-y-auto space-y-1 text-sm border rounded p-2">
                {addDebatersResults.map((r) => (
                  <div key={r.line} className={`flex justify-between ${r.success ? 'text-green-600' : 'text-red-500'}`}>
                    <span>{r.line}. {r.name}</span>
                    <span>{r.success ? '✓' : r.error || 'Failed'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign existing debaters dialog ─────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Debater to {assignTeamName}</DialogTitle>
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
