'use client';

/**
 * Round Editor Component
 *
 * Main drag-and-drop interface for editing round pairings.
 * Uses dnd-kit for drag and drop.
 */

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { TeamData, JudgeData, VenueData, EditorDebate, DebateFormat, BpPosition, TeamSlot, DndSlot } from './types';
import { BP_POSITIONS_ORDERED } from './types';
import { DebateCard } from './DebateCard';
import { DraggableItem } from './DraggableItem';
import { DroppablePanel } from './DroppablePanel';
import { hasInstitutionConflict } from '@/lib/tournamentRounds/institutionConflict';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { getTeamDisplayName } from '@/lib/teams/teamDisplayName';

// =============================================================================
// Types
// =============================================================================

interface RoundEditorProps {
  debates: EditorDebate[];
  allTeams: TeamData[];
  allJudges: JudgeData[];
  allVenues: VenueData[];
  venueMap: Map<string, VenueData>;
  canEdit: boolean;
  onDebatesChange: (debates: EditorDebate[]) => void;
  // Call-related (optional — only needed for ONLINE tournaments)
  tournamentId?: string;
  roundId?: string;
  roundStatus?: string;
  eventMode?: string;
  userCallEligibility?: Record<string, string>;
  showDebaterNames?: boolean;
  debateFormat?: DebateFormat;
}

interface ActiveDrag {
  type: 'team' | 'judge';
  id: string;
  name: string;
}

// =============================================================================
// Component
// =============================================================================

export function RoundEditor({
  debates,
  allTeams,
  allJudges,
  allVenues,
  venueMap,
  canEdit,
  onDebatesChange,
  tournamentId,
  roundId,
  roundStatus,
  eventMode,
  userCallEligibility,
  showDebaterNames = false,
  debateFormat = 'WSDC',
}: RoundEditorProps) {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // =============================================================================
  // Compute Unassigned Items
  // =============================================================================

  const assignedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const debate of debates) {
      if (debate.propTeamId) ids.add(debate.propTeamId);
      if (debate.oppTeamId) ids.add(debate.oppTeamId);
      // BP team slots
      if (debate.bpSlots) {
        for (const teamId of Object.values(debate.bpSlots)) {
          if (teamId) ids.add(teamId);
        }
      }
    }
    return ids;
  }, [debates]);

  const assignedJudgeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const debate of debates) {
      if (debate.chairJudgeParticipantId) ids.add(debate.chairJudgeParticipantId);
      for (const judgeId of debate.panelistJudgeParticipantIds) {
        ids.add(judgeId);
      }
    }
    return ids;
  }, [debates]);

  const unassignedTeams = useMemo(
    () => allTeams.filter((t) => !assignedTeamIds.has(t.id)),
    [allTeams, assignedTeamIds]
  );

  const unassignedJudges = useMemo(
    () => allJudges.filter((j) => !assignedJudgeIds.has(j.id)),
    [allJudges, assignedJudgeIds]
  );

  const usedVenueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const debate of debates) {
      if (debate.venueId) ids.add(debate.venueId);
    }
    return ids;
  }, [debates]);

  // =============================================================================
  // Lookup Maps
  // =============================================================================

  const teamMap = useMemo(() => {
    const map = new Map<string, TeamData>();
    allTeams.forEach((t) => map.set(t.id, t));
    return map;
  }, [allTeams]);

  const judgeMap = useMemo(() => {
    const map = new Map<string, JudgeData>();
    allJudges.forEach((j) => map.set(j.id, j));
    return map;
  }, [allJudges]);

  // =============================================================================
  // Drag Handlers
  // =============================================================================

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const id = active.id as string;
    const dataType = active.data.current?.type as 'team' | 'judge';

    if (dataType === 'team') {
      const team = teamMap.get(id);
      setActiveDrag({
        type: 'team',
        id,
        name: getTeamDisplayName(team, showDebaterNames),
      });
    } else if (dataType === 'judge') {
      const judge = judgeMap.get(id);
      setActiveDrag({
        type: 'judge',
        id,
        name: displayNameFromDbUser(judge?.user) || 'Judge',
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);

    if (!over || !canEdit) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeType = active.data.current?.type as 'team' | 'judge';
    const activeSourceDebateId = active.data.current?.debateId as string | undefined;
    const activeSourceSlot = active.data.current?.slot as DndSlot | undefined;

    // Use droppable data when available (more robust than parsing the ID string)
    const overData = over.data.current as { debateId?: string; slot?: string; accepts?: string } | undefined;

    // Dropping on unassigned panel
    if (overId === 'unassigned-teams' && activeType === 'team') {
      if (activeSourceDebateId && activeSourceSlot) {
        removeTeamFromDebate(activeSourceDebateId, activeSourceSlot as TeamSlot);
      }
      return;
    }

    if (overId === 'unassigned-judges' && activeType === 'judge') {
      if (activeSourceDebateId && activeSourceSlot) {
        if (activeSourceSlot === 'chair') {
          removeChairFromDebate(activeSourceDebateId);
        } else if (activeSourceSlot === 'panelists') {
          removePanelistFromDebate(activeSourceDebateId, activeId);
        }
      }
      return;
    }

    // Dropping on a debate slot — use the structured data from DroppableSlot
    const targetDebateId = overData?.debateId;
    const targetSlot = overData?.slot;

    if (!targetDebateId || !targetSlot) return;

    const isBpSlot = (s: string): s is BpPosition => BP_POSITIONS_ORDERED.includes(s as BpPosition);
    const isTeamSlot = (s: string) => s === 'prop' || s === 'opp' || isBpSlot(s);

    if (activeType === 'team' && isTeamSlot(targetSlot)) {
      if (activeSourceDebateId && activeSourceSlot) {
        moveTeam(activeId, activeSourceDebateId, activeSourceSlot as TeamSlot, targetDebateId, targetSlot as TeamSlot);
      } else {
        addTeamToDebate(activeId, targetDebateId, targetSlot as TeamSlot);
      }
    } else if (activeType === 'judge' && (targetSlot === 'chair' || targetSlot === 'panelists')) {
      if (activeSourceDebateId && activeSourceSlot) {
        moveJudge(activeId, activeSourceDebateId, activeSourceSlot as 'chair' | 'panelists', targetDebateId, targetSlot);
      } else {
        if (targetSlot === 'chair') {
          addChairToDebate(activeId, targetDebateId);
        } else {
          addPanelistToDebate(activeId, targetDebateId);
        }
      }
    } else {
      toast.error('Invalid drop target');
    }
  }

  // =============================================================================
  // State Update Helpers
  // =============================================================================

  /** Returns true when judge has an institution conflict with the debate. */
  function judgeConflictsWithDebate(judgeId: string, debate: EditorDebate): boolean {
    const judge = judgeMap.get(judgeId);
    if (!judge) return false;
    const propTeam = debate.propTeamId ? teamMap.get(debate.propTeamId) : null;
    const oppTeam = debate.oppTeamId ? teamMap.get(debate.oppTeamId) : null;
    return hasInstitutionConflict(
      judge.institutionId,
      propTeam?.institutionId ?? null,
      oppTeam?.institutionId ?? null
    );
  }

  /** Removes any judges from the debate that now have institution conflicts, showing a toast. */
  function autoUnassignConflictingJudges(debate: EditorDebate): EditorDebate {
    const removedNames: string[] = [];
    let { chairJudgeParticipantId, panelistJudgeParticipantIds } = debate;

    if (chairJudgeParticipantId && judgeConflictsWithDebate(chairJudgeParticipantId, debate)) {
      const judge = judgeMap.get(chairJudgeParticipantId);
      removedNames.push(displayNameFromDbUser(judge?.user) || 'Chair judge');
      chairJudgeParticipantId = null;
    }

    const validPanelists: string[] = [];
    for (const pid of panelistJudgeParticipantIds) {
      if (judgeConflictsWithDebate(pid, debate)) {
        const judge = judgeMap.get(pid);
        removedNames.push(displayNameFromDbUser(judge?.user) || 'Panelist');
      } else {
        validPanelists.push(pid);
      }
    }

    if (removedNames.length > 0) {
      toast.warning(
        `Auto-unassigned due to institution conflict: ${removedNames.join(', ')}`
      );
    }

    return { ...debate, chairJudgeParticipantId, panelistJudgeParticipantIds: validPanelists };
  }

  // ---------------------------------------------------------------------------
  // Helpers for reading / writing team slots (WSDC prop/opp or BP positions)
  // ---------------------------------------------------------------------------
  const isBpSlot = (s: TeamSlot): s is BpPosition => BP_POSITIONS_ORDERED.includes(s as BpPosition);

  function getTeamInSlot(d: EditorDebate, slot: TeamSlot): string | null {
    if (isBpSlot(slot)) return d.bpSlots?.[slot] ?? null;
    return slot === 'prop' ? d.propTeamId : d.oppTeamId;
  }

  function setTeamInSlot(d: EditorDebate, slot: TeamSlot, teamId: string | null): EditorDebate {
    if (isBpSlot(slot)) {
      return { ...d, bpSlots: { ...d.bpSlots!, [slot]: teamId } };
    }
    return { ...d, [slot === 'prop' ? 'propTeamId' : 'oppTeamId']: teamId };
  }

  function addTeamToDebate(teamId: string, debateId: string, slot: TeamSlot) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;

        // Check if slot is already occupied
        const currentTeamId = getTeamInSlot(d, slot);
        if (currentTeamId && currentTeamId !== teamId) {
          toast.error('Slot is already occupied. Remove the team first.');
          return d;
        }

        let updated = setTeamInSlot(d, slot, teamId);
        updated.isBye = false; // Adding a team clears BYE status

        // After placing a team, auto-unassign any judges that now conflict
        return autoUnassignConflictingJudges(updated);
      })
    );
  }

  function removeTeamFromDebate(debateId: string, slot: TeamSlot) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;
        return setTeamInSlot(d, slot, null);
      })
    );
  }

  function moveTeam(
    teamId: string,
    fromDebateId: string,
    fromSlot: TeamSlot,
    toDebateId: string,
    toSlot: TeamSlot
  ) {
    // If moving to same position, do nothing
    if (fromDebateId === toDebateId && fromSlot === toSlot) return;

    onDebatesChange(
      debates.map((d) => {
        // Remove from source
        if (d.id === fromDebateId) {
          let update = setTeamInSlot(d, fromSlot, null);

          // If same debate, also set the target slot
          if (d.id === toDebateId) {
            update = setTeamInSlot(update, toSlot, teamId);
            update.isBye = false;
          }

          return autoUnassignConflictingJudges(update);
        }

        // Add to target (if different debate)
        if (d.id === toDebateId && fromDebateId !== toDebateId) {
          // Check if target slot is occupied
          const currentTeamId = getTeamInSlot(d, toSlot);
          if (currentTeamId) {
            toast.error('Target slot is already occupied');
            return d;
          }

          let updated = setTeamInSlot(d, toSlot, teamId);
          updated.isBye = false;

          return autoUnassignConflictingJudges(updated);
        }

        return d;
      })
    );
  }

  function addChairToDebate(judgeId: string, debateId: string) {
    const debate = debates.find((d) => d.id === debateId);
    if (debate && judgeConflictsWithDebate(judgeId, debate)) {
      toast.error("Can't assign: institution conflict (judge and team share institution).");
      return;
    }

    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;

        // Check if chair slot is already occupied
        if (d.chairJudgeParticipantId) {
          toast.error('Chair slot is already occupied. Remove the current chair first.');
          return d;
        }

        // Remove from panelists if the judge is already a panelist in this debate
        const newPanelists = d.panelistJudgeParticipantIds.filter((id) => id !== judgeId);

        return {
          ...d,
          chairJudgeParticipantId: judgeId,
          panelistJudgeParticipantIds: newPanelists,
        };
      })
    );
  }

  function addPanelistToDebate(judgeId: string, debateId: string) {
    const debate = debates.find((d) => d.id === debateId);
    if (debate && judgeConflictsWithDebate(judgeId, debate)) {
      toast.error("Can't assign: institution conflict (judge and team share institution).");
      return;
    }

    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;

        // Check if judge is already in this debate (as chair or panelist)
        if (d.chairJudgeParticipantId === judgeId) return d;
        if (d.panelistJudgeParticipantIds.includes(judgeId)) return d;

        return {
          ...d,
          panelistJudgeParticipantIds: [...d.panelistJudgeParticipantIds, judgeId],
        };
      })
    );
  }

  function removeChairFromDebate(debateId: string) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;
        return { ...d, chairJudgeParticipantId: null };
      })
    );
  }

  function removePanelistFromDebate(debateId: string, judgeId: string) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;
        return {
          ...d,
          panelistJudgeParticipantIds: d.panelistJudgeParticipantIds.filter((id) => id !== judgeId),
        };
      })
    );
  }

  function moveJudge(
    judgeId: string,
    fromDebateId: string,
    fromSlot: 'chair' | 'panelists',
    toDebateId: string,
    toSlot: 'chair' | 'panelists'
  ) {
    // Same position — no-op
    if (fromDebateId === toDebateId && fromSlot === toSlot) return;

    // Check institution conflict at the destination debate
    const targetDebate = debates.find((d) => d.id === toDebateId);
    if (targetDebate && judgeConflictsWithDebate(judgeId, targetDebate)) {
      toast.error("Can't assign: institution conflict (judge and team share institution).");
      return;
    }

    onDebatesChange(
      debates.map((d) => {
        let updated = { ...d };

        // Remove from source
        if (d.id === fromDebateId) {
          if (fromSlot === 'chair') {
            updated = { ...updated, chairJudgeParticipantId: null };
          } else {
            updated = {
              ...updated,
              panelistJudgeParticipantIds: updated.panelistJudgeParticipantIds.filter((id) => id !== judgeId),
            };
          }
        }

        // Add to target
        if (d.id === toDebateId) {
          if (toSlot === 'chair') {
            if (updated.chairJudgeParticipantId && updated.chairJudgeParticipantId !== judgeId) {
              toast.error('Chair slot is already occupied');
              return d; // abort — can't overwrite chair
            }
            updated = { ...updated, chairJudgeParticipantId: judgeId };
            // Remove from panelists if moving within same debate
            updated = {
              ...updated,
              panelistJudgeParticipantIds: updated.panelistJudgeParticipantIds.filter((id) => id !== judgeId),
            };
          } else {
            if (!updated.panelistJudgeParticipantIds.includes(judgeId)) {
              updated = {
                ...updated,
                panelistJudgeParticipantIds: [...updated.panelistJudgeParticipantIds, judgeId],
              };
            }
            // Clear chair if moving within same debate from chair to panelist
            if (updated.chairJudgeParticipantId === judgeId) {
              updated = { ...updated, chairJudgeParticipantId: null };
            }
          }
        }

        return updated;
      })
    );
  }

  // Handler for debate card changes (swap, toggle bye, etc.)
  // After applying updates, revalidate judges; auto-unassign any that now conflict.
  function handleDebateChange(debateId: string, updates: Partial<EditorDebate>) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;

        const updated = { ...d, ...updates };

        // If teams changed, auto-unassign conflicting judges
        const teamChanged =
          updates.propTeamId !== undefined || updates.oppTeamId !== undefined;

        if (!teamChanged) return updated;

        return autoUnassignConflictingJudges(updated);
      })
    );
  }

  // Add a new empty debate slot
  function handleAddDebate() {
    const maxOrder = debates.reduce((max, d) => Math.max(max, d.order), -1);
    const isBp = debateFormat === 'BP';
    const newDebate: EditorDebate = {
      id: `new-${Date.now()}`,
      order: maxOrder + 1,
      propTeamId: null,
      oppTeamId: null,
      isBye: false,
      venueId: null,
      chairJudgeParticipantId: null,
      panelistJudgeParticipantIds: [],
      ...(isBp && { bpSlots: { BP_OG: null, BP_OO: null, BP_CG: null, BP_CO: null } }),
    };
    onDebatesChange([...debates, newDebate]);
  }

  // Remove a debate slot (returns its teams/judges to unassigned)
  function handleRemoveDebate(debateId: string) {
    const remaining = debates
      .filter((d) => d.id !== debateId)
      .map((d, i) => ({ ...d, order: i }));
    onDebatesChange(remaining);
  }

  // =============================================================================
  // Render
  // =============================================================================

  // Read-only mode for non-draft or non-admin
  if (!canEdit) {
    return (
      <div className="space-y-4">
        {debates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pairings have been created yet.
            </CardContent>
          </Card>
        ) : (
          debates.map((debate) => (
            <DebateCard
              key={debate.id}
              debate={debate}
              teamMap={teamMap}
              judgeMap={judgeMap}
              venue={debate.venueId ? venueMap.get(debate.venueId) ?? null : null}
              allVenues={allVenues}
              usedVenueIds={usedVenueIds}
              canEdit={false}
              onDebateChange={() => {}}
              tournamentId={tournamentId}
              roundId={roundId}
              roundStatus={roundStatus}
              eventMode={eventMode}
              callRole={userCallEligibility?.[debate.id]}
              showDebaterNames={showDebaterNames}
              debateFormat={debateFormat}
            />
          ))
        )}
      </div>
    );
  }

  // Editable mode with DnD
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr_250px] gap-4">
        {/* Unassigned Teams Panel */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Unassigned Teams ({unassignedTeams.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DroppablePanel id="unassigned-teams" type="team">
              <ScrollArea className="h-75 px-3 pb-3">
                {unassignedTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All teams assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unassignedTeams.map((team) => (
                      <DraggableItem
                        key={team.id}
                        id={team.id}
                        type="team"
                        data={{ type: 'team' }}
                      >
                        <div className="p-2 bg-background border rounded-md text-sm">
                          <div className="font-medium">{getTeamDisplayName(team, showDebaterNames)}</div>
                          <div className="text-xs text-muted-foreground">
                            {team.institution.name}
                          </div>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DroppablePanel>
          </CardContent>
        </Card>

        {/* Debates List */}
        <div className="space-y-4">
          {debates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No debates yet.</p>
                <p className="text-sm mt-2">
                  Click &quot;Auto-Generate&quot; to create pairings automatically,<br />
                  or add empty debates manually.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleAddDebate}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Debate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <SortableContext
                items={debates.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                {debates.map((debate) => (
                  <DebateCard
                    key={debate.id}
                    debate={debate}
                    teamMap={teamMap}
                    judgeMap={judgeMap}
                    venue={debate.venueId ? venueMap.get(debate.venueId) ?? null : null}
                    allVenues={allVenues}
                    usedVenueIds={usedVenueIds}
                    canEdit={canEdit}
                    onDebateChange={(updates) => handleDebateChange(debate.id, updates)}
                    onRemoveDebate={() => handleRemoveDebate(debate.id)}
                    tournamentId={tournamentId}
                    roundId={roundId}
                    roundStatus={roundStatus}
                    eventMode={eventMode}
                    callRole={userCallEligibility?.[debate.id]}
                    showDebaterNames={showDebaterNames}
                    debateFormat={debateFormat}
                  />
                ))}
              </SortableContext>

              {/* Add Debate button below the list */}
              <Button
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={handleAddDebate}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Debate
              </Button>
            </>
          )}
        </div>

        {/* Unassigned Judges Panel */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Unassigned Judges ({unassignedJudges.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DroppablePanel id="unassigned-judges" type="judge">
              <ScrollArea className="h-75 px-3 pb-3">
                {unassignedJudges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All judges assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unassignedJudges.map((judge) => (
                      <DraggableItem
                        key={judge.id}
                        id={judge.id}
                        type="judge"
                        data={{ type: 'judge' }}
                      >
                        <div className="p-2 bg-background border rounded-md text-sm">
                          <div className="font-medium">
                            {displayNameFromDbUser(judge.user) || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {judge.institution?.name || 'No institution'}
                          </div>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DroppablePanel>
          </CardContent>
        </Card>
      </div>

      {/* Drag Overlay - shows what's being dragged */}
      <DragOverlay>
        {activeDrag && (
          <div className="p-2 bg-background border-2 border-primary rounded-md shadow-lg text-sm opacity-90">
            <div className="font-medium">{activeDrag.name}</div>
            <div className="text-xs text-muted-foreground">
              {activeDrag.type === 'team' ? 'Team' : 'Judge'}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
