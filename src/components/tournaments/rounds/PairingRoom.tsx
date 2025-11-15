'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDroppable } from '@dnd-kit/core'
import { Trash2, AlertTriangle, Users, Lock, Unlock, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface RoomPairing {
  id: string;
  propTeam: TournamentTeam | null;
  oppTeam: TournamentTeam | null;
  scheduledAt: string | null;
}

interface PairingRoomProps {
  pairing: RoomPairing;
  roomNumber: number;
  onRemoveTeam: (side: 'prop' | 'opp') => void;
  onSwapSides: () => void;
  onDeletePairing: () => void;
  allPairings: RoomPairing[];
  roundNumber?: number;
}

interface DropZoneProps {
  id: string;
  side: 'prop' | 'opp';
  team: TournamentTeam | null;
  onRemove: () => void;
  warning?: string | null;
}

function DropZone({ id, side, team, onRemove, warning }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { side },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[100px] rounded-lg border-2 border-dashed transition-all p-3 z-0",
        isOver && "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 ring-2 ring-cyan-300",
        !team && "bg-muted/30",
        team && "border-solid bg-card"
      )}
    >
      {team ? (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{team.name}</span>
                <Badge variant="outline" className="shrink-0">
                  #{team.teamNumber}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {team.institution.name}
              </div>
              {team.participations.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="truncate">
                    {team.participations.map(p => p.user.username || p.user.email).join(', ')}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
          
          {warning && (
            <div className="flex items-start gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <span className="text-xs text-yellow-700 dark:text-yellow-400">{warning}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center py-6">
          <div className="text-sm text-muted-foreground mb-1">
            Drop {side === 'prop' ? 'Proposition' : 'Opposition'} team here
          </div>
          <div className="text-xs text-muted-foreground">
            or drag from unpaired teams
          </div>
        </div>
      )}
    </div>
  );
}

export function PairingRoom({
  pairing,
  roomNumber,
  onRemoveTeam,
  onSwapSides,
  onDeletePairing,
  allPairings,
  roundNumber,
}: PairingRoomProps) {
  // Check for warnings
  const propWarning = React.useMemo(() => {
    if (!pairing.propTeam || !pairing.oppTeam) return null;
    
    // Same institution check
    if (pairing.propTeam.institution.id === pairing.oppTeam.institution.id) {
      return '⚠️ Same institution matchup';
    }
    
    // TODO: Add check for previous round opponents
    // This would require data from previous rounds
    
    return null;
  }, [pairing.propTeam, pairing.oppTeam]);

  const oppWarning = propWarning; // Same warnings apply to both sides

  const isComplete = pairing.propTeam && pairing.oppTeam;
  const isEmpty = !pairing.propTeam && !pairing.oppTeam;

  return (
    <Card className={cn(
      "transition-all",
      isComplete && !propWarning && "border-green-500/50",
      propWarning && "border-yellow-500/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Room {roomNumber}</CardTitle>
            {isComplete && !propWarning && (
              <Badge variant="default" className="bg-green-500">
                Ready
              </Badge>
            )}
            {propWarning && (
              <Badge variant="destructive" className="bg-yellow-500">
                Warning
              </Badge>
            )}
            {isEmpty && (
              <Badge variant="outline">Empty</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {pairing.propTeam && pairing.oppTeam && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onSwapSides}
                title="Swap sides"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDeletePairing}
              title="Delete room"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
            Proposition
          </div>
          <DropZone
            id={`${pairing.id}-prop`}
            side="prop"
            team={pairing.propTeam}
            onRemove={() => onRemoveTeam('prop')}
            warning={propWarning}
          />
        </div>

        <div className="text-center text-xs font-bold text-muted-foreground">
          VS
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
            Opposition
          </div>
          <DropZone
            id={`${pairing.id}-opp`}
            side="opp"
            team={pairing.oppTeam}
            onRemove={() => onRemoveTeam('opp')}
            warning={oppWarning}
          />
        </div>

        {/* Judges section - placeholder for future */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase">
            Judges
          </div>
          <div className="min-h-[60px] rounded-lg border-2 border-dashed bg-muted/30 p-3 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
