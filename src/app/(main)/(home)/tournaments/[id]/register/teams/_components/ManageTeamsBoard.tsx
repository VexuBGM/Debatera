'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import {
    getInstitutionTeamState,
    createTeam,
    deleteTeam,
    moveParticipant,
    TeamWithMembers,
    DebaterParticipant
} from '@/actions/teams.actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { TeamColumn } from './TeamColumn';
import { DebaterCard } from './DebaterCard';

interface ManageTeamsBoardProps {
    tournamentId: string;
    tournament: {
        teamMinSize: number;
        teamMaxSize: number;
    };
    manageableInstitutions: { id: string; name: string }[];
    defaultInstitutionId: string;
    initialTeamState: {
        teams: TeamWithMembers[];
        debaters: DebaterParticipant[];
    } | null;
    isLocked: boolean;
}

/**
 * Main drag-and-drop board for managing teams.
 * Allows creating teams and dragging debaters between teams and the unassigned pool.
 */
export function ManageTeamsBoard({
    tournamentId,
    tournament,
    manageableInstitutions,
    defaultInstitutionId,
    initialTeamState,
    isLocked,
}: ManageTeamsBoardProps) {
    const [selectedInstitutionId, setSelectedInstitutionId] = useState(defaultInstitutionId);
    const [teams, setTeams] = useState<TeamWithMembers[]>(initialTeamState?.teams ?? []);
    const [debaters, setDebaters] = useState<DebaterParticipant[]>(initialTeamState?.debaters ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

    // Configure drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px drag before activating
            },
        })
    );

    // Compute unassigned debaters (those without a team membership)
    const unassignedDebaters = debaters.filter(d => !d.teamMembership);

    // Find the active debater for drag overlay
    const activeDebater = activeParticipantId
        ? debaters.find(d => d.id === activeParticipantId)
        : null;

    // Fetch team state when institution changes
    const fetchTeamState = useCallback(async (institutionId: string) => {
        setIsLoading(true);
        try {
            const result = await getInstitutionTeamState(tournamentId, institutionId);
            if (result.success && result.data) {
                setTeams(result.data.teams);
                setDebaters(result.data.debaters);
            } else {
                toast.error(result.error ?? 'Failed to load team data');
            }
        } catch {
            toast.error('Failed to load team data');
        } finally {
            setIsLoading(false);
        }
    }, [tournamentId]);

    // Handle institution change
    const handleInstitutionChange = useCallback((institutionId: string) => {
        setSelectedInstitutionId(institutionId);
        fetchTeamState(institutionId);
    }, [fetchTeamState]);

    // Reload state when props change (e.g., after navigation)
    useEffect(() => {
        if (initialTeamState) {
            setTeams(initialTeamState.teams);
            setDebaters(initialTeamState.debaters);
        }
    }, [initialTeamState]);

    // Handle team creation
    const handleCreateTeam = async () => {
        if (isLocked) return;

        setIsCreatingTeam(true);
        try {
            const result = await createTeam({ tournamentId, institutionId: selectedInstitutionId });
            if (result.success && result.data) {
                setTeams(prev => [...prev, result.data!.team]);
                toast.success(`Created team: ${result.data.team.name}`);
            } else {
                toast.error(result.error ?? 'Failed to create team');
            }
        } catch {
            toast.error('Failed to create team');
        } finally {
            setIsCreatingTeam(false);
        }
    };

    // Handle team deletion
    const handleDeleteTeam = async (teamId: string) => {
        if (isLocked) return;

        const teamToDelete = teams.find(t => t.id === teamId);
        if (!teamToDelete) return;

        // Optimistically update UI
        setTeams(prev => prev.filter(t => t.id !== teamId));

        // Update debaters to remove team membership
        setDebaters(prev => prev.map(d =>
            d.teamMembership?.teamId === teamId
                ? { ...d, teamMembership: null }
                : d
        ));

        try {
            const result = await deleteTeam({ teamId });
            if (!result.success) {
                // Revert on failure
                setTeams(prev => [...prev, teamToDelete]);
                toast.error(result.error ?? 'Failed to delete team');
            } else {
                toast.success(`Deleted team: ${teamToDelete.name}`);
            }
        } catch {
            // Revert on error
            setTeams(prev => [...prev, teamToDelete]);
            toast.error('Failed to delete team');
        }
    };

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        const participantId = String(event.active.id).replace('participant:', '');
        setActiveParticipantId(participantId);
    };

    // Handle drag end
    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveParticipantId(null);

        if (isLocked) return;

        const { active, over } = event;
        if (!over) return;

        const participantId = String(active.id).replace('participant:', '');
        const overId = String(over.id);

        // Determine destination team (null for unassigned)
        let toTeamId: string | null = null;
        if (overId === 'unassigned') {
            toTeamId = null;
        } else if (overId.startsWith('team:')) {
            toTeamId = overId.replace('team:', '');
        } else if (overId.startsWith('participant:')) {
            // Dropped on another participant - find their team
            const targetParticipantId = overId.replace('participant:', '');
            const targetDebater = debaters.find(d => d.id === targetParticipantId);
            toTeamId = targetDebater?.teamMembership?.teamId ?? null;
        } else {
            return;
        }

        // Find current team of the participant
        const participant = debaters.find(d => d.id === participantId);
        if (!participant) return;

        const fromTeamId = participant.teamMembership?.teamId ?? null;

        // No change needed if same location
        if (fromTeamId === toTeamId) return;

        // Check max size before optimistic update
        if (toTeamId) {
            const destinationTeam = teams.find(t => t.id === toTeamId);
            if (destinationTeam && destinationTeam.members.length >= tournament.teamMaxSize) {
                toast.error(`Team is full (max ${tournament.teamMaxSize} members)`);
                return;
            }
        }

        // Optimistic update
        const previousDebaters = [...debaters];
        const previousTeams = [...teams];

        // Update debater's team membership
        setDebaters(prev => prev.map(d =>
            d.id === participantId
                ? {
                    ...d,
                    teamMembership: toTeamId ? {
                        id: 'temp-membership',
                        teamId: toTeamId,
                        participantId: d.id,
                        createdAt: new Date()
                    } : null
                }
                : d
        ));

        // Update teams' members arrays
        setTeams(prev => prev.map(team => {
            // Remove from old team
            if (team.id === fromTeamId) {
                return {
                    ...team,
                    members: team.members.filter(m => m.participantId !== participantId),
                };
            }
            // Add to new team
            if (team.id === toTeamId) {
                const debater = debaters.find(d => d.id === participantId)!;
                return {
                    ...team,
                    members: [...team.members, {
                        id: `temp-${participantId}`,
                        teamId: team.id,
                        participantId,
                        createdAt: new Date(),
                        participant: debater,
                    }],
                };
            }
            return team;
        }));

        // Call server
        try {
            const result = await moveParticipant({ tournamentId, participantId, toTeamId });
            if (!result.success) {
                // Revert on failure
                setDebaters(previousDebaters);
                setTeams(previousTeams);
                toast.error(result.error ?? 'Failed to move participant');
            }
        } catch {
            // Revert on error
            setDebaters(previousDebaters);
            setTeams(previousTeams);
            toast.error('Failed to move participant');
        }
    };

    return (
        <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg text-white">Manage Teams</CardTitle>
                <div className="flex items-center gap-3">
                    {/* Institution selector */}
                    {manageableInstitutions.length > 1 && (
                        <Select value={selectedInstitutionId} onValueChange={handleInstitutionChange}>
                            <SelectTrigger className="w-50 bg-white/5 border-white/20 text-white">
                                <SelectValue placeholder="Select institution" />
                            </SelectTrigger>
                            <SelectContent>
                                {manageableInstitutions.map(inst => (
                                    <SelectItem key={inst.id} value={inst.id}>
                                        {inst.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Create team button */}
                    <Button
                        onClick={handleCreateTeam}
                        disabled={isLocked || isCreatingTeam}
                        size="sm"
                        className="bg-cyan-500 hover:bg-cyan-400 text-black"
                    >
                        {isCreatingTeam ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create Team
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                    </div>
                ) : (
                    <DndContext
                        id="teams-dnd-context"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            {/* Unassigned column */}
                            <TeamColumn
                                id="unassigned"
                                title="Unassigned Debaters"
                                debaters={unassignedDebaters}
                                teamMinSize={tournament.teamMinSize}
                                teamMaxSize={tournament.teamMaxSize}
                                isLocked={isLocked}
                            />

                            {/* Team columns */}
                            {teams.map(team => {
                                const teamDebaters = debaters.filter(d => d.teamMembership?.teamId === team.id);
                                return (
                                    <TeamColumn
                                        key={team.id}
                                        id={`team:${team.id}`}
                                        title={team.name}
                                        debaters={teamDebaters}
                                        teamMinSize={tournament.teamMinSize}
                                        teamMaxSize={tournament.teamMaxSize}
                                        isLocked={isLocked}
                                        onDelete={() => handleDeleteTeam(team.id)}
                                    />
                                );
                            })}
                        </div>

                        {/* Drag overlay for smooth dragging */}
                        <DragOverlay>
                            {activeDebater && (
                                <DebaterCard debater={activeDebater} isDragging />
                            )}
                        </DragOverlay>
                    </DndContext>
                )}
            </CardContent>
        </Card>
    );
}
