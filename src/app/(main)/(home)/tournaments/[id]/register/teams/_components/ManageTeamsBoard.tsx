'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { Building2, Loader2, Plus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
    bulkAddDebatersToTeam,
    createTeamAsOrganizer,
    deleteTeam,
    getInstitutionTeamState,
    moveParticipant,
    type DebaterParticipant,
    type TeamWithMembers,
} from '@/actions/teams.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { DebaterCard } from './DebaterCard';
import { TeamColumn } from './TeamColumn';

interface ManageTeamsBoardProps {
    tournamentId: string;
    tournament: {
        teamMinSize: number;
        teamMaxSize: number;
    };
    manageableInstitutions: { id: string; name: string }[];
    defaultInstitutionId: string | null;
    initialTeamState: {
        teams: TeamWithMembers[];
        debaters: DebaterParticipant[];
    } | null;
    isLocked: boolean;
    isOrganizer: boolean;
    canCreateInstitutions: boolean;
}

function sortInstitutions(institutions: { id: string; name: string }[]) {
    return [...institutions].sort((left, right) => left.name.localeCompare(right.name));
}

export function ManageTeamsBoard({
    tournamentId,
    tournament,
    manageableInstitutions,
    defaultInstitutionId,
    initialTeamState,
    isLocked,
    isOrganizer,
    canCreateInstitutions,
}: ManageTeamsBoardProps) {
    const router = useRouter();
    const [isRefreshing, startRefreshTransition] = useTransition();

    const [institutions, setInstitutions] = useState(sortInstitutions(manageableInstitutions));
    const [selectedInstitutionId, setSelectedInstitutionId] = useState(
        defaultInstitutionId ?? manageableInstitutions[0]?.id ?? ''
    );
    const [teams, setTeams] = useState<TeamWithMembers[]>(initialTeamState?.teams ?? []);
    const [debaters, setDebaters] = useState<DebaterParticipant[]>(initialTeamState?.debaters ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createInstitutionId, setCreateInstitutionId] = useState(
        defaultInstitutionId ?? manageableInstitutions[0]?.id ?? (canCreateInstitutions ? '__new__' : '')
    );
    const [createInstitutionName, setCreateInstitutionName] = useState('');
    const [createTeamName, setCreateTeamName] = useState('');
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);

    const [addDebatersDialogOpen, setAddDebatersDialogOpen] = useState(false);
    const [addDebatersTeamId, setAddDebatersTeamId] = useState<string | null>(null);
    const [addDebatersTeamName, setAddDebatersTeamName] = useState('');
    const [addDebatersNames, setAddDebatersNames] = useState('');
    const [addDebatersResults, setAddDebatersResults] = useState<
        Array<{ line: number; name: string; success: boolean; error?: string }> | null
    >(null);
    const [isAddingDebaters, setIsAddingDebaters] = useState(false);

    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignTeamId, setAssignTeamId] = useState<string | null>(null);
    const [assignTeamName, setAssignTeamName] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
    );

    useEffect(() => {
        const nextInstitutions = sortInstitutions(manageableInstitutions);
        setInstitutions(nextInstitutions);

        setSelectedInstitutionId((currentValue) => {
            if (currentValue && nextInstitutions.some((institution) => institution.id === currentValue)) {
                return currentValue;
            }

            return defaultInstitutionId ?? nextInstitutions[0]?.id ?? '';
        });
    }, [defaultInstitutionId, manageableInstitutions]);

    useEffect(() => {
        if (!selectedInstitutionId) {
            setTeams([]);
            setDebaters([]);
            return;
        }

        if (initialTeamState && selectedInstitutionId === defaultInstitutionId) {
            setTeams(initialTeamState.teams);
            setDebaters(initialTeamState.debaters);
        }
    }, [defaultInstitutionId, initialTeamState, selectedInstitutionId]);

    const selectedInstitution = institutions.find((institution) => institution.id === selectedInstitutionId) ?? null;
    const unassignedDebaters = debaters.filter((debater) => !debater.teamMembership);
    const activeDebater = activeParticipantId
        ? debaters.find((debater) => debater.id === activeParticipantId) ?? null
        : null;
    const assignTargetTeam = assignTeamId
        ? teams.find((team) => team.id === assignTeamId) ?? null
        : null;
    const assignTargetIsFull = assignTargetTeam
        ? assignTargetTeam.members.length >= tournament.teamMaxSize
        : false;

    async function fetchTeamState(institutionId: string) {
        if (!institutionId) {
            setTeams([]);
            setDebaters([]);
            return;
        }

        setIsLoading(true);
        try {
            const result = await getInstitutionTeamState(tournamentId, institutionId);
            if (!result.success || !result.data) {
                toast.error(result.error ?? 'Failed to load team data');
                return;
            }

            setTeams(result.data.teams);
            setDebaters(result.data.debaters);
        } catch {
            toast.error('Failed to load team data');
        } finally {
            setIsLoading(false);
        }
    }

    function refreshPage() {
        startRefreshTransition(() => {
            router.refresh();
        });
    }

    async function syncBoardAfterMutation(institutionId: string) {
        await fetchTeamState(institutionId);
        refreshPage();
    }

    function resetCreateDialog(nextInstitutionId?: string) {
        setCreateTeamName('');
        setCreateInstitutionName('');
        setCreateInstitutionId(
            nextInstitutionId
                ?? selectedInstitutionId
                ?? institutions[0]?.id
                ?? (canCreateInstitutions ? '__new__' : '')
        );
    }

    function openCreateDialog() {
        resetCreateDialog();
        setCreateDialogOpen(true);
    }

    function openAddDebatersDialog(teamId: string, teamName: string) {
        setAddDebatersTeamId(teamId);
        setAddDebatersTeamName(teamName);
        setAddDebatersNames('');
        setAddDebatersResults(null);
        setAddDebatersDialogOpen(true);
    }

    function openAssignDialog(teamId: string, teamName: string) {
        setAssignTeamId(teamId);
        setAssignTeamName(teamName);
        setAssignDialogOpen(true);
    }

    async function handleInstitutionChange(institutionId: string) {
        setSelectedInstitutionId(institutionId);
        await fetchTeamState(institutionId);
    }

    async function handleCreateTeam() {
        if (isLocked) return;

        const isCreatingInstitution = createInstitutionId === '__new__';
        const institutionId = isCreatingInstitution
            ? undefined
            : createInstitutionId || selectedInstitutionId || undefined;
        const institutionName = isCreatingInstitution ? createInstitutionName.trim() : undefined;
        const teamName = createTeamName.trim() || undefined;

        if (!institutionId && !institutionName) {
            toast.error('Choose an institution first.');
            return;
        }

        setIsCreatingTeam(true);
        try {
            const result = await createTeamAsOrganizer({
                tournamentId,
                institutionId,
                institutionName,
                name: teamName,
            });

            if (!result.success || !result.data) {
                toast.error(result.error ?? 'Failed to create team');
                return;
            }

            const nextInstitution = result.data.team.institution;
            setInstitutions((currentInstitutions) => {
                if (currentInstitutions.some((institution) => institution.id === nextInstitution.id)) {
                    return currentInstitutions;
                }

                return sortInstitutions([...currentInstitutions, nextInstitution]);
            });
            setSelectedInstitutionId(nextInstitution.id);
            setCreateDialogOpen(false);
            resetCreateDialog(nextInstitution.id);

            toast.success(`Created ${result.data.team.name}`);
            await syncBoardAfterMutation(nextInstitution.id);
        } catch {
            toast.error('Failed to create team');
        } finally {
            setIsCreatingTeam(false);
        }
    }

    async function handleDeleteTeam(teamId: string) {
        if (isLocked || !selectedInstitutionId) return;

        const teamToDelete = teams.find((team) => team.id === teamId);
        if (!teamToDelete) return;

        const previousTeams = teams;
        const previousDebaters = debaters;

        setTeams((currentTeams) => currentTeams.filter((team) => team.id !== teamId));
        setDebaters((currentDebaters) => currentDebaters.map((debater) => (
            debater.teamMembership?.teamId === teamId
                ? { ...debater, teamMembership: null }
                : debater
        )));

        try {
            const result = await deleteTeam({ teamId });
            if (!result.success) {
                setTeams(previousTeams);
                setDebaters(previousDebaters);
                toast.error(result.error ?? 'Failed to delete team');
                return;
            }

            toast.success(`Deleted ${teamToDelete.name}`);
            await syncBoardAfterMutation(selectedInstitutionId);
        } catch {
            setTeams(previousTeams);
            setDebaters(previousDebaters);
            toast.error('Failed to delete team');
        }
    }

    async function handleMoveParticipant(participantId: string, toTeamId: string | null) {
        if (isLocked || !selectedInstitutionId) return;

        const participant = debaters.find((debater) => debater.id === participantId);
        if (!participant) return;

        const fromTeamId = participant.teamMembership?.teamId ?? null;
        if (fromTeamId === toTeamId) return;

        if (toTeamId) {
            const destinationTeam = teams.find((team) => team.id === toTeamId);
            if (!destinationTeam) return;

            if (destinationTeam.members.length >= tournament.teamMaxSize) {
                toast.error(`Team is full (max ${tournament.teamMaxSize} members)`);
                return;
            }
        }

        const previousDebaters = debaters;
        const previousTeams = teams;

        setDebaters((currentDebaters) => currentDebaters.map((debater) => (
            debater.id === participantId
                ? {
                    ...debater,
                    teamMembership: toTeamId
                        ? {
                            id: debater.teamMembership?.id ?? `temp-${participantId}`,
                            teamId: toTeamId,
                            participantId: debater.id,
                            createdAt: debater.teamMembership?.createdAt ?? new Date(),
                        }
                        : null,
                }
                : debater
        )));

        setTeams((currentTeams) => currentTeams.map((team) => {
            if (team.id === fromTeamId) {
                return {
                    ...team,
                    members: team.members.filter((member) => member.participantId !== participantId),
                };
            }

            if (team.id === toTeamId) {
                const existingMember = team.members.find((member) => member.participantId === participantId);
                if (existingMember) {
                    return team;
                }

                return {
                    ...team,
                    members: [
                        ...team.members,
                        {
                            id: `temp-${participantId}`,
                            teamId: team.id,
                            participantId,
                            createdAt: new Date(),
                            participant,
                        },
                    ],
                };
            }

            return team;
        }));

        try {
            const result = await moveParticipant({ tournamentId, participantId, toTeamId });
            if (!result.success) {
                setDebaters(previousDebaters);
                setTeams(previousTeams);
                toast.error(result.error ?? 'Failed to move participant');
                return;
            }

            await syncBoardAfterMutation(selectedInstitutionId);
        } catch {
            setDebaters(previousDebaters);
            setTeams(previousTeams);
            toast.error('Failed to move participant');
        }
    }

    async function handleBulkAddDebaters() {
        if (!addDebatersTeamId || !addDebatersNames.trim()) return;

        setIsAddingDebaters(true);
        setAddDebatersResults(null);

        try {
            const result = await bulkAddDebatersToTeam({
                tournamentId,
                teamId: addDebatersTeamId,
                names: addDebatersNames,
            });

            if (!result.success || !result.data) {
                toast.error(result.error ?? 'Failed to add debaters');
                return;
            }

            setAddDebatersResults(result.data.results);
            toast.success(`Added ${result.data.totalCreated} debater(s)`);

            if (result.data.totalCreated > 0 && selectedInstitutionId) {
                await syncBoardAfterMutation(selectedInstitutionId);
            }
        } catch {
            toast.error('Failed to add debaters');
        } finally {
            setIsAddingDebaters(false);
        }
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveParticipantId(String(event.active.id).replace('participant:', ''));
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveParticipantId(null);

        const { active, over } = event;
        if (!over) return;

        const participantId = String(active.id).replace('participant:', '');
        const overId = String(over.id);

        let toTeamId: string | null = null;

        if (overId === 'unassigned') {
            toTeamId = null;
        } else if (overId.startsWith('team:')) {
            toTeamId = overId.replace('team:', '');
        } else if (overId.startsWith('participant:')) {
            const targetParticipantId = overId.replace('participant:', '');
            const targetDebater = debaters.find((debater) => debater.id === targetParticipantId);
            toTeamId = targetDebater?.teamMembership?.teamId ?? null;
        } else {
            return;
        }

        void handleMoveParticipant(participantId, toTeamId);
    }

    const addDebatersCount = addDebatersNames
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .length;

    return (
        <>
            <Card className="overflow-hidden border-white/10 bg-white/5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.65)]">
                <CardHeader className="border-b border-white/10 bg-white/[0.07] px-5 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg text-white">Manage teams</CardTitle>
                                {isOrganizer && (
                                    <Badge variant="outline" className="border-white/20 text-white/70">
                                        Organizer access
                                    </Badge>
                                )}
                                {isLocked && (
                                    <Badge variant="outline" className="border-red-400/40 text-red-300">
                                        Registration closed
                                    </Badge>
                                )}
                                {(isRefreshing || isLoading) && (
                                    <Badge variant="outline" className="border-white/20 text-white/70">
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        Syncing
                                    </Badge>
                                )}
                            </div>
                            <p className="max-w-2xl text-sm text-white/70">
                                Add no-account debaters directly on each team, then reassign or unassign them as needed.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                            {institutions.length > 0 ? (
                                <Select value={selectedInstitutionId} onValueChange={(value) => void handleInstitutionChange(value)}>
                                    <SelectTrigger className="min-w-60 border-white/20 bg-white/10 text-white">
                                        <SelectValue placeholder="Select institution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutions.map((institution) => (
                                            <SelectItem key={institution.id} value={institution.id}>
                                                {institution.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-white/70">
                                    <Building2 className="h-4 w-4" />
                                    No institution yet
                                </div>
                            )}

                            <Button
                                onClick={openCreateDialog}
                                disabled={isLocked}
                                className="bg-brand text-brand-foreground hover:bg-brand/90"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Team
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-5 p-5">
                    {!selectedInstitution ? (
                        <div className="rounded-2xl border border-dashed border-white/20 bg-gradient-to-br from-white/5 to-transparent p-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                                <Users className="h-6 w-6 text-white/70" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Create the first team</h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
                                Start by creating a team. Organizers can create a new institution from there too.
                            </p>
                            <Button
                                onClick={openCreateDialog}
                                className="mt-5 bg-brand text-brand-foreground hover:bg-brand/90"
                                disabled={isLocked}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Team
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                                        <Building2 className="h-4 w-4 text-white/70" />
                                        {selectedInstitution.name}
                                    </div>
                                    <p className="mt-1 text-sm text-white/60">
                                        {teams.length} team(s) and {unassignedDebaters.length} unassigned debater(s) in this institution.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                                        How it works
                                    </div>
                                    <p className="mt-2 text-sm text-white/60">
                                        Use <span className="font-medium text-white">Add Debaters</span> on a team to create guest debaters. If you remove them from a team later, they stay available in this institution&apos;s unassigned pool.
                                    </p>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                                </div>
                            ) : (
                                <DndContext
                                    id="teams-dnd-context"
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="flex gap-4 overflow-x-auto pb-2">
                                        <TeamColumn
                                            id="unassigned"
                                            title="Unassigned Debaters"
                                            debaters={unassignedDebaters}
                                            teamMinSize={tournament.teamMinSize}
                                            teamMaxSize={tournament.teamMaxSize}
                                            isLocked={isLocked}
                                        />

                                        {teams.map((team) => {
                                            const teamDebaters = debaters.filter(
                                                (debater) => debater.teamMembership?.teamId === team.id
                                            );

                                            return (
                                                <TeamColumn
                                                    key={team.id}
                                                    id={`team:${team.id}`}
                                                    title={team.name}
                                                    debaters={teamDebaters}
                                                    teamMinSize={tournament.teamMinSize}
                                                    teamMaxSize={tournament.teamMaxSize}
                                                    isLocked={isLocked}
                                                    onDelete={() => void handleDeleteTeam(team.id)}
                                                    onAddDebaters={() => openAddDebatersDialog(team.id, team.name)}
                                                    onAssignExisting={unassignedDebaters.length > 0
                                                        ? () => openAssignDialog(team.id, team.name)
                                                        : undefined}
                                                />
                                            );
                                        })}
                                    </div>

                                    <DragOverlay>
                                        {activeDebater ? (
                                            <DebaterCard
                                                debater={activeDebater}
                                                disabled
                                                isDragging
                                            />
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={createDialogOpen}
                onOpenChange={(open) => {
                    setCreateDialogOpen(open);
                    if (!open) {
                        resetCreateDialog();
                    }
                }}
            >
                <DialogContent className="border-white/10 bg-[#0f1723] text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Create Team</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Pick an institution and optionally name the team. If you leave the team name empty, we&apos;ll generate it automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {canCreateInstitutions ? (
                            <div className="space-y-2">
                                <Label className="text-white/80">Institution</Label>
                                <Select value={createInstitutionId} onValueChange={setCreateInstitutionId}>
                                    <SelectTrigger className="border-white/20 bg-white/10 text-white">
                                        <SelectValue placeholder="Select institution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutions.map((institution) => (
                                            <SelectItem key={institution.id} value={institution.id}>
                                                {institution.name}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="__new__">Create new institution</SelectItem>
                                    </SelectContent>
                                </Select>

                                {createInstitutionId === '__new__' && (
                                    <Input
                                        value={createInstitutionName}
                                        onChange={(event) => setCreateInstitutionName(event.target.value)}
                                        placeholder="Institution name"
                                        className="border-white/20 bg-white/10 text-white placeholder:text-white/35"
                                    />
                                )}
                            </div>
                        ) : selectedInstitution ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="text-xs uppercase tracking-[0.18em] text-white/40">Institution</div>
                                <div className="mt-2 text-sm font-medium text-white">{selectedInstitution.name}</div>
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <Label className="text-white/80">Team Name</Label>
                            <Input
                                value={createTeamName}
                                onChange={(event) => setCreateTeamName(event.target.value)}
                                placeholder="Leave empty for automatic naming"
                                className="border-white/20 bg-white/10 text-white placeholder:text-white/35"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                            onClick={() => setCreateDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-brand text-brand-foreground hover:bg-brand/90"
                            onClick={() => void handleCreateTeam()}
                            disabled={isCreatingTeam || isLocked}
                        >
                            {isCreatingTeam ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Create Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={addDebatersDialogOpen}
                onOpenChange={(open) => {
                    setAddDebatersDialogOpen(open);
                    if (!open) {
                        setAddDebatersResults(null);
                        setAddDebatersNames('');
                    }
                }}
            >
                <DialogContent className="border-white/10 bg-[#0f1723] text-white sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Debaters to {addDebatersTeamName}</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Enter one name per line. Debaters inherit the team&apos;s institution automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-white/80">Names</Label>
                                <Badge variant="outline" className="border-white/15 text-white/70">
                                    {addDebatersCount} entered
                                </Badge>
                            </div>
                            <Textarea
                                value={addDebatersNames}
                                onChange={(event) => setAddDebatersNames(event.target.value)}
                                placeholder={'Ivan Ivanov\nMaria Petrova\nGeorgi Dimitrov'}
                                rows={8}
                                className="border-white/20 bg-white/10 text-white placeholder:text-white/35"
                            />
                        </div>

                        {addDebatersResults && (
                            <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-4">
                                {addDebatersResults.map((result) => (
                                    <div
                                        key={`${result.line}-${result.name}`}
                                        className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-white">{result.line}. {result.name}</div>
                                            {!result.success && result.error && (
                                                <div className="mt-1 text-xs text-red-300">{result.error}</div>
                                            )}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={result.success
                                                ? 'border-emerald-400/30 text-emerald-300'
                                                : 'border-red-400/30 text-red-300'}
                                        >
                                            {result.success ? 'Added' : 'Skipped'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                            onClick={() => setAddDebatersDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-brand text-brand-foreground hover:bg-brand/90"
                            onClick={() => void handleBulkAddDebaters()}
                            disabled={isAddingDebaters || isLocked || !addDebatersNames.trim()}
                        >
                            {isAddingDebaters ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Add Debaters
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="border-white/10 bg-[#0f1723] text-white sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Assign Debaters to {assignTeamName}</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Pick from the unassigned debaters in this institution.
                        </DialogDescription>
                    </DialogHeader>

                    {assignTargetTeam && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                            {assignTargetTeam.members.length}/{tournament.teamMaxSize} members
                            {assignTargetIsFull && (
                                <span className="ml-2 text-red-300">Team is full.</span>
                            )}
                        </div>
                    )}

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {unassignedDebaters.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center text-sm text-white/40">
                                No unassigned debaters available.
                            </div>
                        ) : (
                            unassignedDebaters.map((debater) => (
                                <div
                                    key={debater.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">
                                            {displayNameFromDbUser(debater.user)}
                                        </div>
                                        <div className="text-xs text-white/45">
                                            {debater.user.id.startsWith('guest_') ? 'Guest debater' : 'Registered debater'}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/15 bg-white/10 text-white hover:bg-white/15"
                                        onClick={() => {
                                            if (assignTeamId) {
                                                void handleMoveParticipant(debater.id, assignTeamId);
                                            }
                                        }}
                                        disabled={isLocked || assignTargetIsFull}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
