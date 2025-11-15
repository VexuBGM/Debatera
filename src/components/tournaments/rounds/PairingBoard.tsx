'use client'

import React, { useMemo, useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
import { UnpairedTeamsPool } from './UnpairedTeamsPool'
import { PairingRoom } from './PairingRoom'
import { toast } from 'sonner'

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  institution: {
    id: string;
    name: string;
  };
  participations: Array<{
    user: {
      id: string;
      username: string | null;
      email: string | null;
    };
  }>;
}

interface RoundPairing {
  id: string;
  propTeam: TournamentTeam | null;
  oppTeam: TournamentTeam | null;
  scheduledAt: string | null;
}

interface PairingBoardProps {
  roundId: string;
  roundNumber: number;
  roundName: string;
  pairings: RoundPairing[];
  teams: TournamentTeam[];
  tournamentId: string;
  onRefresh: () => void;
  isGenerating: boolean;
}

export function PairingBoard({
  roundId,
  roundNumber,
  roundName,
  pairings,
  teams,
  tournamentId,
  onRefresh,
  isGenerating,
}: PairingBoardProps) {
  const [activeTeam, setActiveTeam] = useState<TournamentTeam | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Calculate paired team IDs
  const pairedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    pairings.forEach(pairing => {
      if (pairing.propTeam) ids.add(pairing.propTeam.id);
      if (pairing.oppTeam) ids.add(pairing.oppTeam.id);
    });
    return ids;
  }, [pairings]);

  // Calculate statistics
  const stats = useMemo(() => {
    const complete = pairings.filter(p => p.propTeam && p.oppTeam).length;
    const warnings = pairings.filter(p => 
      p.propTeam && p.oppTeam && 
      p.propTeam.institution.id === p.oppTeam.institution.id
    ).length;
    const unpairedCount = teams.length - pairedTeamIds.size;

    return { complete, warnings, unpairedCount, total: pairings.length };
  }, [pairings, teams.length, pairedTeamIds]);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const draggedData = active.data.current;
    
    if (draggedData?.type === 'team') {
      setActiveTeam(draggedData.team);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    setActiveTeam(null);
    if (!over) return;

    const draggedData = active.data.current;
    const dropData = over.data.current;

    // Extract team from dragged element
    if (!draggedData?.type || draggedData.type !== 'team') return;

    const team: TournamentTeam = draggedData.team;

    // Check if dropped on a valid drop zone
    if (!dropData?.side) return;

    const targetSide = dropData.side as 'prop' | 'opp';
    const overIdString = String(over.id);

    // Extract pairing ID from the over.id (format: "pairingId-prop" or "pairingId-opp")
    const targetPairingId = overIdString.replace('-prop', '').replace('-opp', '');

    // Find the target pairing
    const targetPairing = pairings.find(p => p.id === targetPairingId);
    if (!targetPairing) return;

    // Prepare updated teams
    const updates: { propTeamId: string | null; oppTeamId: string | null } = {
      propTeamId: targetPairing.propTeam?.id || null,
      oppTeamId: targetPairing.oppTeam?.id || null,
    };

    // Set the new team on the target side
    if (targetSide === 'prop') {
      updates.propTeamId = team.id;
    } else {
      updates.oppTeamId = team.id;
    }

    // Update the pairing via API
    try {
      const url = `/api/tournaments/${tournamentId}/rounds/${roundId}/pairings/${targetPairingId}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API error:', error);
        throw new Error('Failed to update pairing');
      }

      onRefresh();
      toast.success('Team assigned successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign team');
    }
  }

  async function handleRemoveTeam(pairingId: string, side: 'prop' | 'opp') {
    const pairing = pairings.find(p => p.id === pairingId);
    if (!pairing) return;

    const updates = {
      propTeamId: side === 'prop' ? null : pairing.propTeam?.id || null,
      oppTeamId: side === 'opp' ? null : pairing.oppTeam?.id || null,
    };

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/pairings/${pairingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) throw new Error('Failed to remove team');

      onRefresh();
      toast.success('Team removed from room');
    } catch (error) {
      toast.error('Failed to remove team');
      console.error(error);
    }
  }

  async function handleSwapSides(pairingId: string) {
    const pairing = pairings.find(p => p.id === pairingId);
    if (!pairing || !pairing.propTeam || !pairing.oppTeam) return;

    const updates = {
      propTeamId: pairing.oppTeam.id,
      oppTeamId: pairing.propTeam.id,
    };

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/pairings/${pairingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) throw new Error('Failed to swap sides');

      onRefresh();
      toast.success('Sides swapped');
    } catch (error) {
      toast.error('Failed to swap sides');
      console.error(error);
    }
  }

  async function handleDeletePairing(pairingId: string) {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/pairings/${pairingId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to delete room');

      onRefresh();
      toast.success('Room deleted');
    } catch (error) {
      toast.error('Failed to delete room');
      console.error(error);
    }
  }

  async function handleAddRoom() {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/pairings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propTeamId: null, oppTeamId: null }),
        }
      );

      if (!response.ok) throw new Error('Failed to add room');

      onRefresh();
      toast.success('Room added');
    } catch (error) {
      toast.error('Failed to add room');
      console.error(error);
    }
  }

  async function handleAutoPair() {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}/pairings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ autoGenerate: true }),
        }
      );

      if (!response.ok) throw new Error('Failed to auto-pair');

      onRefresh();
      toast.success('Pairings auto-generated successfully');
    } catch (error) {
      toast.error('Failed to auto-pair');
      console.error(error);
    }
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 relative">
        {/* Header with stats */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{roundName} Pairing Board</h2>
            <div className="flex items-center gap-2">
              <Badge variant={stats.complete === stats.total ? 'default' : 'secondary'} className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {stats.complete} / {stats.total} Complete
              </Badge>
              {stats.warnings > 0 && (
                <Badge variant="destructive" className="gap-1 bg-yellow-500">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.warnings} Warning{stats.warnings !== 1 ? 's' : ''}
                </Badge>
              )}
              {stats.unpairedCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {stats.unpairedCount} Unpaired
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAutoPair}
              disabled={isGenerating || teams.length === 0}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Auto-Pair All
            </Button>
            <Button variant="outline" onClick={handleAddRoom}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </div>
        </div>

        {/* Unpaired teams pool */}
        <UnpairedTeamsPool teams={teams} pairedTeamIds={pairedTeamIds} />

        {/* Rooms/Pairings */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">
            Rooms ({pairings.length})
          </h3>

          {pairings.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h4 className="text-lg font-semibold mb-2">No rooms yet</h4>
              <p className="text-muted-foreground mb-4">
                Click "Auto-Pair All" to generate pairings or "Add Room" to create manually
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={handleAutoPair} disabled={teams.length === 0}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Auto-Pair All
                </Button>
                <Button variant="outline" onClick={handleAddRoom}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pairings.map((pairing, index) => (
                <PairingRoom
                  key={pairing.id}
                  pairing={pairing}
                  roomNumber={index + 1}
                  roundNumber={roundNumber}
                  allPairings={pairings}
                  onRemoveTeam={(side) => handleRemoveTeam(pairing.id, side)}
                  onSwapSides={() => handleSwapSides(pairing.id)}
                  onDeletePairing={() => handleDeletePairing(pairing.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DragOverlay for smooth dragging */}
      <DragOverlay dropAnimation={null}>
        {activeTeam ? (
          <div className="rounded-lg border bg-card p-3 shadow-lg opacity-90 cursor-grabbing">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{activeTeam.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {activeTeam.institution.name}
                </div>
                {activeTeam.participations.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span className="truncate">
                      {activeTeam.participations.length} debater{activeTeam.participations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="shrink-0">
                #{activeTeam.teamNumber}
              </Badge>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
