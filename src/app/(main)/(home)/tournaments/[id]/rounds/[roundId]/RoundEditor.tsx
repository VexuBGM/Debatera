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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { TeamData, JudgeData, EditorDebate } from './types';
import { DebateCard } from './DebateCard';
import { DraggableItem } from './DraggableItem';
import { DroppablePanel } from './DroppablePanel';

// =============================================================================
// Types
// =============================================================================

interface RoundEditorProps {
  debates: EditorDebate[];
  allTeams: TeamData[];
  allJudges: JudgeData[];
  canEdit: boolean;
  onDebatesChange: (debates: EditorDebate[]) => void;
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
  canEdit,
  onDebatesChange,
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
    }
    return ids;
  }, [debates]);

  const assignedJudgeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const debate of debates) {
      for (const judgeId of debate.judgeParticipantIds) {
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
        name: team?.name || 'Team',
      });
    } else if (dataType === 'judge') {
      const judge = judgeMap.get(id);
      setActiveDrag({
        type: 'judge',
        id,
        name: judge?.user?.username || judge?.user?.email || 'Judge',
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
    const activeSourceSlot = active.data.current?.slot as 'prop' | 'opp' | 'judges' | undefined;

    // Parse the drop target
    // Format: "debate-{debateId}-{slot}" or "unassigned-teams" or "unassigned-judges"
    const overParts = overId.split('-');

    // Dropping on unassigned panel
    if (overId === 'unassigned-teams' && activeType === 'team') {
      // Remove team from debate
      if (activeSourceDebateId && activeSourceSlot) {
        removeTeamFromDebate(activeSourceDebateId, activeSourceSlot as 'prop' | 'opp');
      }
      return;
    }

    if (overId === 'unassigned-judges' && activeType === 'judge') {
      // Remove judge from debate
      if (activeSourceDebateId) {
        removeJudgeFromDebate(activeSourceDebateId, activeId);
      }
      return;
    }

    // Dropping on a debate slot
    if (overParts[0] === 'debate' && overParts.length >= 3) {
      const targetDebateId = overParts[1];
      const targetSlot = overParts[2] as 'prop' | 'opp' | 'judges';

      // Validate drop
      if (activeType === 'team' && (targetSlot === 'prop' || targetSlot === 'opp')) {
        // Check if team is already in another slot
        if (activeSourceDebateId && activeSourceSlot) {
          // Moving within/between debates
          moveTeam(activeId, activeSourceDebateId, activeSourceSlot as 'prop' | 'opp', targetDebateId, targetSlot);
        } else {
          // Adding from unassigned
          addTeamToDebate(activeId, targetDebateId, targetSlot);
        }
      } else if (activeType === 'judge' && targetSlot === 'judges') {
        if (activeSourceDebateId) {
          // Moving between debates
          moveJudge(activeId, activeSourceDebateId, targetDebateId);
        } else {
          // Adding from unassigned
          addJudgeToDebate(activeId, targetDebateId);
        }
      } else {
        toast.error('Invalid drop target');
      }
    }
  }

  // =============================================================================
  // State Update Helpers
  // =============================================================================

  function addTeamToDebate(teamId: string, debateId: string, slot: 'prop' | 'opp') {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;

        // Check if slot is already occupied
        const currentTeamId = slot === 'prop' ? d.propTeamId : d.oppTeamId;
        if (currentTeamId && currentTeamId !== teamId) {
          toast.error('Slot is already occupied. Remove the team first.');
          return d;
        }

        return {
          ...d,
          [slot === 'prop' ? 'propTeamId' : 'oppTeamId']: teamId,
          isBye: false, // Adding a team clears BYE status
        };
      })
    );
  }

  function removeTeamFromDebate(debateId: string, slot: 'prop' | 'opp') {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;
        return {
          ...d,
          [slot === 'prop' ? 'propTeamId' : 'oppTeamId']: null,
        };
      })
    );
  }

  function moveTeam(
    teamId: string,
    fromDebateId: string,
    fromSlot: 'prop' | 'opp',
    toDebateId: string,
    toSlot: 'prop' | 'opp'
  ) {
    // If moving to same position, do nothing
    if (fromDebateId === toDebateId && fromSlot === toSlot) return;

    onDebatesChange(
      debates.map((d) => {
        // Remove from source
        if (d.id === fromDebateId) {
          const update = { ...d };
          if (fromSlot === 'prop') update.propTeamId = null;
          else update.oppTeamId = null;

          // If same debate, also set the target slot
          if (d.id === toDebateId) {
            if (toSlot === 'prop') update.propTeamId = teamId;
            else update.oppTeamId = teamId;
            update.isBye = false;
          }

          return update;
        }

        // Add to target (if different debate)
        if (d.id === toDebateId && fromDebateId !== toDebateId) {
          // Check if target slot is occupied
          const currentTeamId = toSlot === 'prop' ? d.propTeamId : d.oppTeamId;
          if (currentTeamId) {
            toast.error('Target slot is already occupied');
            return d;
          }

          return {
            ...d,
            [toSlot === 'prop' ? 'propTeamId' : 'oppTeamId']: teamId,
            isBye: false,
          };
        }

        return d;
      })
    );
  }

  function addJudgeToDebate(judgeId: string, debateId: string) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;

        // Check if judge is already in this debate
        if (d.judgeParticipantIds.includes(judgeId)) {
          return d;
        }

        return {
          ...d,
          judgeParticipantIds: [...d.judgeParticipantIds, judgeId],
        };
      })
    );
  }

  function removeJudgeFromDebate(debateId: string, judgeId: string) {
    onDebatesChange(
      debates.map((d) => {
        if (d.id !== debateId) return d;
        return {
          ...d,
          judgeParticipantIds: d.judgeParticipantIds.filter((id) => id !== judgeId),
        };
      })
    );
  }

  function moveJudge(judgeId: string, fromDebateId: string, toDebateId: string) {
    if (fromDebateId === toDebateId) return;

    onDebatesChange(
      debates.map((d) => {
        if (d.id === fromDebateId) {
          return {
            ...d,
            judgeParticipantIds: d.judgeParticipantIds.filter((id) => id !== judgeId),
          };
        }
        if (d.id === toDebateId) {
          // Check if judge is already in this debate
          if (d.judgeParticipantIds.includes(judgeId)) {
            return d;
          }
          return {
            ...d,
            judgeParticipantIds: [...d.judgeParticipantIds, judgeId],
          };
        }
        return d;
      })
    );
  }

  // Handler for debate card changes (swap, toggle bye, etc.)
  function handleDebateChange(debateId: string, updates: Partial<EditorDebate>) {
    onDebatesChange(
      debates.map((d) => (d.id === debateId ? { ...d, ...updates } : d))
    );
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
              canEdit={false}
              onDebateChange={() => {}}
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
                          <div className="font-medium">{team.name}</div>
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
                  Click &quot;Auto-Generate&quot; to create pairings automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
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
                  canEdit={canEdit}
                  onDebateChange={(updates) => handleDebateChange(debate.id, updates)}
                />
              ))}
            </SortableContext>
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
                            {judge.user?.username || judge.user?.email || 'Unknown'}
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
