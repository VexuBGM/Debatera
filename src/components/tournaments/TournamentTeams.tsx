'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trophy, Plus, Loader2, Users, Save, GripVertical, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Debater {
  participationId: string;
  userId: string;
  username: string | null;
  email: string | null;
  imageUrl: string | null;
  institutionName: string;
  teamId: string | null;
}

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  institutionId: string;
  institution: {
    id: string;
    name: string;
  };
  participations: any[];
  _count: {
    participations: number;
  };
}

interface InstitutionOption {
  id: string;
  name: string;
}

interface TournamentTeamsProps {
  tournamentId: string;
  teams: TournamentTeam[];
  institutions: InstitutionOption[];
  onTeamCreated: () => void;
  myInstitution: { id: string; name: string; isCoach: boolean } | null;
}

interface DebaterCardProps {
  debater: Debater;
  isDragging?: boolean;
}

function DebaterCard({ debater, isDragging = false }: DebaterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: debater.participationId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-2 p-2 bg-card border rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent transition-colors
        ${isDragging ? 'shadow-lg ring-2 ring-cyan-500' : ''}
      `}
    >
      <div>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate text-foreground">
          {debater.username || debater.email || 'Unknown'}
        </p>
        <p className="text-xs text-muted-foreground truncate">{debater.institutionName}</p>
      </div>
    </div>
  );
}

interface DroppableContainerProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function DroppableContainer({ id, children, className }: DroppableContainerProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      id={id}
      className={`${className} ${isOver ? 'ring-2 ring-cyan-500 ring-offset-2' : ''}`}
    >
      {children}
    </div>
  );
}

export default function TournamentTeams({
  tournamentId,
  teams,
  institutions,
  onTeamCreated,
  myInstitution,
}: TournamentTeamsProps) {
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [registeredInstitutionIds, setRegisteredInstitutionIds] = useState<Set<string>>(new Set());
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  // State for team assignments
  const [teamAssignments, setTeamAssignments] = useState<Map<string, Debater[]>>(new Map());
  const [unassignedDebaters, setUnassignedDebaters] = useState<Debater[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filter teams to only show user's institution teams
  const myInstitutionTeams = teams.filter(team => 
    myInstitution ? team.institutionId === myInstitution.id : false
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all debaters and their current team assignments
  useEffect(() => {
    if (myInstitution) {
      fetchDebaters();
    }
    fetchRegisteredInstitutions();
  }, [tournamentId, teams, myInstitution?.id]);

  const fetchRegisteredInstitutions = async () => {
    setIsCheckingRegistration(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/institutions`);
      if (response.ok) {
        const data = await response.json();
        const ids = new Set<string>(data.map((reg: any) => reg.institutionId as string));
        setRegisteredInstitutionIds(ids);
      } else {
        console.error('Failed to fetch registered institutions:', response.status);
        setRegisteredInstitutionIds(new Set());
      }
    } catch (err) {
      console.error('Failed to fetch registered institutions:', err);
      setRegisteredInstitutionIds(new Set());
    } finally {
      setIsCheckingRegistration(false);
    }
  };

  const fetchDebaters = async () => {
    if (!myInstitution) {
      setUnassignedDebaters([]);
      setTeamAssignments(new Map());
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/participations`);
      if (!response.ok) throw new Error('Failed to fetch participations');

      const data = await response.json();
      const allDebaters: Debater[] = data.debaters.map((p: any) => ({
        participationId: p.id,
        userId: p.user.id,
        username: p.user.username,
        email: p.user.email,
        imageUrl: p.user.imageUrl,
        institutionName: p.institution?.name || p.team?.institution?.name || 'No institution',
        teamId: p.team?.id || null,
      }));

      // Filter debaters to only show those from user's institution
      const debaters = allDebaters.filter(d => {
        // Find the original participation data to check institutionId
        const participation = data.debaters.find((p: any) => p.id === d.participationId);
        return participation?.institutionId === myInstitution.id;
      });

      // Initialize team assignments for user's institution teams only
      const assignments = new Map<string, Debater[]>();
      myInstitutionTeams.forEach((team) => {
        assignments.set(team.id, []);
      });

      const unassigned: Debater[] = [];

      debaters.forEach((debater) => {
        if (debater.teamId && assignments.has(debater.teamId)) {
          assignments.get(debater.teamId)!.push(debater);
        } else {
          unassigned.push(debater);
        }
      });

      setTeamAssignments(assignments);
      setUnassignedDebaters(unassigned);
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!myInstitution) {
      toast.error('You must be a member of an institution to create teams');
      return;
    }

    setIsCreatingTeam(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: myInstitution.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team');
      }

      toast.success('Team created successfully');
      setIsCreateTeamOpen(false);
      onTeamCreated();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which container the active item is in
    const activeContainer = findContainer(activeId);
    // Check if dropping on a container directly or on an item
    const overContainer = overId === 'pool' || overId.startsWith('team-') 
      ? overId 
      : findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setHasChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    // Check if dropping on a container directly or on an item
    const overContainer = overId === 'pool' || overId.startsWith('team-') 
      ? overId 
      : findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      // Reordering within same container
      if (activeContainer === 'pool') {
        setUnassignedDebaters((prev) => {
          const oldIndex = prev.findIndex((d) => d.participationId === activeId);
          const newIndex = prev.findIndex((d) => d.participationId === overId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      } else {
        setTeamAssignments((prev) => {
          const newAssignments = new Map(prev);
          const teamId = activeContainer.replace('team-', '');
          const teamDebaters = newAssignments.get(teamId) || [];
          const oldIndex = teamDebaters.findIndex((d) => d.participationId === activeId);
          const newIndex = teamDebaters.findIndex((d) => d.participationId === overId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          newAssignments.set(teamId, arrayMove(teamDebaters, oldIndex, newIndex));
          return newAssignments;
        });
      }
    } else {
      // Moving between different containers
      // Find the debater to move
      let debater: Debater | undefined;

      if (activeContainer === 'pool') {
        debater = unassignedDebaters.find((d) => d.participationId === activeId);
      } else {
        const sourceTeamId = activeContainer.replace('team-', '');
        const teamDebaters = teamAssignments.get(sourceTeamId) || [];
        debater = teamDebaters.find((d) => d.participationId === activeId);
      }

      if (!debater) return;

      // Handle pool to team or team to team
      if (activeContainer === 'pool' && overContainer !== 'pool') {
        const targetTeamId = overContainer.replace('team-', '');
        const targetTeamDebaters = teamAssignments.get(targetTeamId) || [];
        
        if (targetTeamDebaters.length >= 5) {
          toast.error('Teams can have a maximum of 5 debaters');
          return;
        }

        setUnassignedDebaters((prev) => prev.filter((d) => d.participationId !== activeId));
        setTeamAssignments((prev) => {
          const newAssignments = new Map(prev);
          const currentTeamDebaters = newAssignments.get(targetTeamId) || [];
          newAssignments.set(targetTeamId, [...currentTeamDebaters, debater!]);
          return newAssignments;
        });
        setHasChanges(true);
      }
      // Handle team to pool
      else if (activeContainer !== 'pool' && overContainer === 'pool') {
        const sourceTeamId = activeContainer.replace('team-', '');
        
        setTeamAssignments((prev) => {
          const newAssignments = new Map(prev);
          const teamDebaters = newAssignments.get(sourceTeamId) || [];
          newAssignments.set(
            sourceTeamId,
            teamDebaters.filter((d) => d.participationId !== activeId)
          );
          return newAssignments;
        });
        setUnassignedDebaters((prev) => [...prev, debater!]);
        setHasChanges(true);
      }
      // Handle team to team
      else if (activeContainer !== 'pool' && overContainer !== 'pool') {
        const sourceTeamId = activeContainer.replace('team-', '');
        const targetTeamId = overContainer.replace('team-', '');
        const targetTeamDebaters = teamAssignments.get(targetTeamId) || [];
        
        if (targetTeamDebaters.length >= 5) {
          toast.error('Teams can have a maximum of 5 debaters');
          return;
        }

        setTeamAssignments((prev) => {
          const newAssignments = new Map(prev);
          
          // Remove from source
          const sourceDebaters = newAssignments.get(sourceTeamId) || [];
          newAssignments.set(
            sourceTeamId,
            sourceDebaters.filter((d) => d.participationId !== activeId)
          );
          
          // Add to target
          const targetDebaters = newAssignments.get(targetTeamId) || [];
          newAssignments.set(targetTeamId, [...targetDebaters, debater!]);
          
          return newAssignments;
        });
        setHasChanges(true);
      }
    }
  };

  const findContainer = (id: string): string | undefined => {
    if (unassignedDebaters.some((d) => d.participationId === id)) {
      return 'pool';
    }

    for (const [teamId, debaters] of teamAssignments.entries()) {
      if (debaters.some((d) => d.participationId === id)) {
        return `team-${teamId}`;
      }
    }

    return undefined;
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Build assignments array
      const assignments: { participationId: string; teamId: string | null }[] = [];

      // Unassigned debaters
      unassignedDebaters.forEach((debater) => {
        assignments.push({
          participationId: debater.participationId,
          teamId: null,
        });
      });

      // Assigned debaters
      teamAssignments.forEach((debaters, teamId) => {
        debaters.forEach((debater) => {
          assignments.push({
            participationId: debater.participationId,
            teamId: teamId,
          });
        });
      });

      const response = await fetch(`/api/tournaments/${tournamentId}/team-assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save team assignments');
      }

      if (data.warning) {
        toast.warning(data.warning, {
          description: data.invalidTeams?.join(', '),
          duration: 5000,
        });
      } else {
        toast.success('Team assignments saved successfully');
      }

      setHasChanges(false);
      onTeamCreated(); // Refresh data
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete ${teamName}? All debaters will be moved to the unassigned pool.`)) {
      return;
    }

    setDeletingTeamId(teamId);

    try {
      const response = await fetch(`/api/tournament-teams/${teamId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete team');
      }

      toast.success('Team deleted successfully');
      onTeamCreated(); // Refresh data
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingTeamId(null);
    }
  };

  const getTeamValidationStatus = (teamId: string) => {
    const debaters = teamAssignments.get(teamId) || [];
    const count = debaters.length;

    if (count === 0) return { valid: true, message: 'Empty', variant: 'secondary' as const };
    if (count < 2) return { valid: false, message: 'Need 2-5', variant: 'destructive' as const };
    if (count > 5) return { valid: false, message: 'Max 5', variant: 'destructive' as const };
    return { valid: true, message: `${count}/5`, variant: 'default' as const };
  };

  const filteredUnassignedDebaters = useMemo(() => {
    if (!searchTerm) return unassignedDebaters;
    const lower = searchTerm.toLowerCase();
    return unassignedDebaters.filter(
      (d) =>
        d.username?.toLowerCase().includes(lower) ||
        d.email?.toLowerCase().includes(lower) ||
        d.institutionName.toLowerCase().includes(lower)
    );
  }, [unassignedDebaters, searchTerm]);

  const activeDragItem = useMemo(() => {
    if (!activeId) return null;
    
    const fromPool = unassignedDebaters.find((d) => d.participationId === activeId);
    if (fromPool) return fromPool;

    for (const debaters of teamAssignments.values()) {
      const found = debaters.find((d) => d.participationId === activeId);
      if (found) return found;
    }

    return null;
  }, [activeId, unassignedDebaters, teamAssignments]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Info Alert when user's institution is not registered */}
        {!isCheckingRegistration && myInstitution && !registeredInstitutionIds.has(myInstitution.id) && (
          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              <strong>Your institution is not registered yet.</strong> {myInstitution.name} must register for the tournament before teams can be created.
              Go to the "Registration" tab to register your institution first.
            </AlertDescription>
          </Alert>
        )}

        {/* Info Alert when user has no institution */}
        {!myInstitution && (
          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              <strong>No institution membership found.</strong> You must be a member of an institution to create and manage teams.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Assignment</CardTitle>
                <CardDescription>
                  {myInstitution 
                    ? `Manage teams for ${myInstitution.name}. Drag debaters from the pool to teams. Teams must have 2-5 debaters.`
                    : 'Join an institution to manage teams and debaters.'
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      New Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Team</DialogTitle>
                      <DialogDescription>
                        Create a new team for {myInstitution?.name || 'your institution'} in this tournament
                      </DialogDescription>
                    </DialogHeader>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {!myInstitution && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          You must be a member of an institution to create teams.
                        </AlertDescription>
                      </Alert>
                    )}
                    {myInstitution && !registeredInstitutionIds.has(myInstitution.id) && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          Your institution must be registered for this tournament first. Go to the "Registration" tab to register.
                        </AlertDescription>
                      </Alert>
                    )}
                    <form onSubmit={handleCreateTeam} className="space-y-4">
                      {myInstitution && (
                        <div className="space-y-2">
                          <Label>Institution</Label>
                          <div className="p-3 bg-muted rounded-md">
                            <p className="font-medium">{myInstitution.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Your institution
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={isCreatingTeam || !myInstitution || !registeredInstitutionIds.has(myInstitution?.id || '')}
                          className="bg-cyan-500 hover:bg-cyan-600"
                        >
                          {isCreatingTeam ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Team'
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreateTeamOpen(false);
                            setError(null);
                          }}
                          disabled={isCreatingTeam}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Debater Pool */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Debater Pool
                <Badge variant="secondary">{unassignedDebaters.length}</Badge>
              </CardTitle>
              <CardDescription>
                {myInstitution 
                  ? `Unassigned debaters from ${myInstitution.name}`
                  : 'Unassigned debaters'
                }
              </CardDescription>
              <Input
                placeholder="Search debaters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              <SortableContext
                items={filteredUnassignedDebaters.map((d) => d.participationId)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableContainer
                  id="pool"
                  className="space-y-2 min-h-[400px] p-2 border-2 border-dashed rounded-lg transition-colors"
                >
                  {filteredUnassignedDebaters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                      <Users className="h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchTerm
                          ? 'No debaters found'
                          : 'All debaters assigned'}
                      </p>
                    </div>
                  ) : (
                    filteredUnassignedDebaters.map((debater) => (
                      <DebaterCard key={debater.participationId} debater={debater} />
                    ))
                  )}
                </DroppableContainer>
              </SortableContext>
            </CardContent>
          </Card>

          {/* Teams */}
          <div className="lg:col-span-2 space-y-4">
            {!myInstitution ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No institution found</h3>
                    <p className="text-muted-foreground">
                      You must be a member of an institution to manage teams
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : myInstitutionTeams.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                    <p className="text-muted-foreground">
                      Create the first team for {myInstitution.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              myInstitutionTeams.map((team) => {
                const validation = getTeamValidationStatus(team.id);
                const teamDebaters = teamAssignments.get(team.id) || [];

                return (
                  <Card key={team.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className="h-5 w-5 text-cyan-500" />
                          <div>
                            <CardTitle className="text-lg">{team.name}</CardTitle>
                            <CardDescription>{team.institution.name}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={validation.variant}>
                            {validation.message}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            disabled={deletingTeamId === team.id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete team"
                          >
                            {deletingTeamId === team.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <SortableContext
                        items={teamDebaters.map((d) => d.participationId)}
                        strategy={verticalListSortingStrategy}
                      >
                        <DroppableContainer
                          id={`team-${team.id}`}
                          className={`space-y-2 min-h-[200px] p-3 border-2 border-dashed rounded-lg transition-colors ${
                            !validation.valid ? 'border-destructive bg-destructive/5' : 'border-border'
                          }`}
                        >
                          {teamDebaters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                              <Users className="h-8 w-8 mb-2 opacity-50" />
                              <p className="text-sm">Drop debaters here</p>
                            </div>
                          ) : (
                            teamDebaters.map((debater) => (
                              <DebaterCard key={debater.participationId} debater={debater} />
                            ))
                          )}
                        </DroppableContainer>
                      </SortableContext>
                      {!validation.valid && teamDebaters.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>Teams must have 2-5 debaters</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDragItem ? <DebaterCard debater={activeDragItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
