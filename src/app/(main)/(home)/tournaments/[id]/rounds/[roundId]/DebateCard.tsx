'use client';

/**
 * Debate Card Component
 *
 * Displays a single debate with prop/opp teams and judges.
 * Judges are split into Chair (1/4 width) and Panelists (3/4 width).
 * Supports drag and drop when in edit mode.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowLeftRight,
  Crown,
  GripVertical,
  MapPin,
  Minus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorDebate, TeamData, JudgeData, VenueData, DebateWarning } from './types';
import { DraggableItem } from './DraggableItem';
import { DroppableSlot } from './DroppableSlot';
import { hasInstitutionConflict } from '@/lib/tournamentRounds/institutionConflict';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { getTeamDisplayName } from '@/lib/teams/teamDisplayName';
import Link from 'next/link';

// =============================================================================
// Types
// =============================================================================

interface DebateCardProps {
  debate: EditorDebate;
  teamMap: Map<string, TeamData>;
  judgeMap: Map<string, JudgeData>;
  venue: VenueData | null;
  allVenues: VenueData[];
  usedVenueIds: Set<string>;
  canEdit: boolean;
  onDebateChange: (updates: Partial<EditorDebate>) => void;
  // Call-related (optional — only used for ONLINE tournaments)
  tournamentId?: string;
  roundId?: string;
  roundStatus?: string;
  eventMode?: string;
  callRole?: string; // "judge" | "debater" | undefined
  showDebaterNames?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function getJudgeName(judge: JudgeData | null | undefined): string {
  if (!judge) return 'Unknown';
  return displayNameFromDbUser(judge.user) || 'Unknown Judge';
}

function computeWarnings(
  debate: EditorDebate,
  teamMap: Map<string, TeamData>,
  judgeMap: Map<string, JudgeData>
): DebateWarning[] {
  const warnings: DebateWarning[] = [];

  if (debate.isBye) return warnings;

  // Missing chair judge
  if (!debate.chairJudgeParticipantId) {
    warnings.push({
      type: 'no-chair',
      message: 'No chair judge assigned',
    });
  }

  const propTeam = debate.propTeamId ? teamMap.get(debate.propTeamId) : null;
  const oppTeam = debate.oppTeamId ? teamMap.get(debate.oppTeamId) : null;

  // Same-institution matchup
  if (propTeam && oppTeam && propTeam.institutionId === oppTeam.institutionId) {
    warnings.push({
      type: 'same-institution',
      message: 'Same institution matchup',
    });
  }

  // All judge IDs (chair + panelists)
  const allJudgeIds = [
    ...(debate.chairJudgeParticipantId ? [debate.chairJudgeParticipantId] : []),
    ...debate.panelistJudgeParticipantIds,
  ];

  // Judge conflicts
  for (const judgeId of allJudgeIds) {
    const judge = judgeMap.get(judgeId);
    if (judge) {
      if (
        hasInstitutionConflict(
          judge.institutionId,
          propTeam?.institutionId ?? null,
          oppTeam?.institutionId ?? null
        )
      ) {
        warnings.push({
          type: 'judge-conflict',
          message: `Judge ${getJudgeName(judge)} has institution conflict`,
        });
      }
    }
  }

  // Even panel
  if (allJudgeIds.length > 0 && allJudgeIds.length % 2 === 0) {
    warnings.push({
      type: 'even-panel',
      message: `Even number of judges (${allJudgeIds.length})`,
    });
  }

  return warnings;
}

// =============================================================================
// Component
// =============================================================================

export function DebateCard({
  debate,
  teamMap,
  judgeMap,
  venue,
  allVenues,
  usedVenueIds,
  canEdit,
  onDebateChange,
  tournamentId,
  roundId,
  roundStatus,
  eventMode,
  callRole,
  showDebaterNames = false,
}: DebateCardProps) {
  const propTeam = debate.propTeamId ? teamMap.get(debate.propTeamId) : null;
  const oppTeam = debate.oppTeamId ? teamMap.get(debate.oppTeamId) : null;
  const warnings = computeWarnings(debate, teamMap, judgeMap);
  const chairJudge = debate.chairJudgeParticipantId
    ? judgeMap.get(debate.chairJudgeParticipantId) ?? null
    : null;

  // Swap prop and opp teams
  function handleSwapTeams() {
    onDebateChange({
      propTeamId: debate.oppTeamId,
      oppTeamId: debate.propTeamId,
    });
  }

  // Toggle BYE status
  function handleToggleBye() {
    if (debate.isBye) {
      // Turning off BYE
      onDebateChange({ isBye: false });
    } else {
      // Turning on BYE - only allowed if one team is empty
      const hasOnlyOne = (debate.propTeamId && !debate.oppTeamId) || (!debate.propTeamId && debate.oppTeamId);
      if (hasOnlyOne) {
        onDebateChange({
          isBye: true,
          chairJudgeParticipantId: null,
          panelistJudgeParticipantIds: [],
        });
      }
    }
  }

  // Remove team from slot
  function handleRemoveTeam(slot: 'prop' | 'opp') {
    onDebateChange({
      [slot === 'prop' ? 'propTeamId' : 'oppTeamId']: null,
    });
  }

  // Remove chair judge
  function handleRemoveChair() {
    onDebateChange({ chairJudgeParticipantId: null });
  }

  // Remove panelist judge
  function handleRemovePanelist(judgeId: string) {
    onDebateChange({
      panelistJudgeParticipantIds: debate.panelistJudgeParticipantIds.filter((id) => id !== judgeId),
    });
  }

  // Render team slot content
  function renderTeamSlot(
    slot: 'prop' | 'opp',
    team: TeamData | null,
    teamId: string | null
  ) {
    const slotLabel = slot === 'prop' ? 'Proposition' : 'Opposition';
    const slotColor = slot === 'prop' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

    if (!team) {
      return (
        <DroppableSlot
          id={`debate-${debate.id}-${slot}`}
          type="team"
          debateId={debate.id}
          slot={slot}
          isEmpty
          className="p-3"
        >
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Drop {slotLabel} team here
          </div>
        </DroppableSlot>
      );
    }

    return (
      <DroppableSlot
        id={`debate-${debate.id}-${slot}`}
        type="team"
        debateId={debate.id}
        slot={slot}
        className="p-0"
      >
        <DraggableItem
          id={teamId!}
          type="team"
          data={{ type: 'team', debateId: debate.id, slot }}
          disabled={!canEdit}
        >
          <div className="p-3 bg-muted/50 rounded-md group relative">
            <div className="flex items-start gap-2">
              {canEdit && (
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
              )}
              <div className="flex-1 min-w-0">
                <div className={cn('text-xs font-medium uppercase tracking-wide', slotColor)}>
                  {slotLabel}
                </div>
                <div className="font-medium truncate">{getTeamDisplayName(team, showDebaterNames)}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {team.institution.name}
                </div>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveTeam(slot)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </DraggableItem>
      </DroppableSlot>
    );
  }

  // BYE card (simpler display)
  if (debate.isBye) {
    const byeTeam = propTeam || oppTeam;
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-semibold text-sm">
                {debate.order + 1}
              </div>
              <div>
                <Badge variant="outline" className="mb-1">BYE</Badge>
                <div className="font-medium">{getTeamDisplayName(byeTeam, showDebaterNames)}</div>
                {byeTeam && (
                  <div className="text-xs text-muted-foreground">
                    {byeTeam.institution.name}
                  </div>
                )}
              </div>
            </div>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={handleToggleBye}>
                <Minus className="h-4 w-4 mr-1" />
                Remove BYE
              </Button>
            )}
          </div>
          {/* Venue — hidden for ONLINE tournaments */}
          {eventMode !== 'ONLINE' && (
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {canEdit ? (
                <Select
                  value={debate.venueId ?? '__none__'}
                  onValueChange={(val) =>
                    onDebateChange({ venueId: val === '__none__' ? null : val })
                  }
                >
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue placeholder="No venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No venue</SelectItem>
                    {allVenues.map((v) => {
                      const taken = usedVenueIds.has(v.id) && v.id !== debate.venueId;
                      return (
                        <SelectItem key={v.id} value={v.id} disabled={taken}>
                          {v.name} (P{v.priority}){taken ? ' — in use' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {venue ? venue.name : 'No venue'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(warnings.length > 0 && 'border-amber-500/50')}>
      <CardContent className="py-4">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                {warnings.map((w, i) => (
                  <div key={i}>{w.message}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Debate number */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {debate.order + 1}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Venue dropdown — hidden for ONLINE tournaments */}
            {eventMode !== 'ONLINE' && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-cyan-500" />
                {canEdit ? (
                  <Select
                    value={debate.venueId ?? '__none__'}
                    onValueChange={(val) =>
                      onDebateChange({ venueId: val === '__none__' ? null : val })
                    }
                  >
                    <SelectTrigger className="h-7 w-52 text-xs">
                      <SelectValue placeholder="Select venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No venue</SelectItem>
                      {allVenues.map((v) => {
                        const taken = usedVenueIds.has(v.id) && v.id !== debate.venueId;
                        return (
                          <SelectItem key={v.id} value={v.id} disabled={taken}>
                            {v.name} (P{v.priority}){taken ? ' — in use' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : venue ? (
                  <>
                    <span className="text-sm text-muted-foreground">{venue.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      P{venue.priority}
                    </Badge>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No venue</span>
                )}
              </div>
            )}

            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proposition */}
            {renderTeamSlot('prop', propTeam ?? null, debate.propTeamId)}

            {/* Opposition */}
            {renderTeamSlot('opp', oppTeam ?? null, debate.oppTeamId)}
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleSwapTeams}
                title="Swap teams"
                disabled={!propTeam && !oppTeam}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              {(propTeam && !oppTeam) || (!propTeam && oppTeam) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleToggleBye}
                  title="Mark as BYE"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* Judges — split into Chair (1/4) and Panelists (3/4) */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Judges ({(debate.chairJudgeParticipantId ? 1 : 0) + debate.panelistJudgeParticipantIds.length})
            </span>
          </div>

          <div className="space-y-3">
            {/* Chair */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Chair
                </span>
              </div>

              <DroppableSlot
                id={`debate-${debate.id}-chair`}
                type="judge"
                debateId={debate.id}
                slot="chair"
                isEmpty={!debate.chairJudgeParticipantId}
                className={cn(
                  'min-h-10',
                  !debate.chairJudgeParticipantId && 'p-2'
                )}
              >
                {!debate.chairJudgeParticipantId ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    Drop chair here
                  </div>
                ) : (
                  <DraggableItem
                    id={debate.chairJudgeParticipantId}
                    type="judge"
                    data={{ type: 'judge', debateId: debate.id, slot: 'chair' }}
                    disabled={!canEdit}
                  >
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-sm group">
                      {canEdit && (
                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab shrink-0" />
                      )}
                      <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-medium text-black dark:text-white whitespace-nowrap">{getJudgeName(chairJudge)}</span>
                      {canEdit && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive shrink-0"
                          onClick={handleRemoveChair}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </DraggableItem>
                )}
              </DroppableSlot>
            </div>

            {/* Panelists */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Panelists ({debate.panelistJudgeParticipantIds.length})
                </span>
              </div>

              <DroppableSlot
                id={`debate-${debate.id}-panelists`}
                type="judge"
                debateId={debate.id}
                slot="panelists"
                isEmpty={debate.panelistJudgeParticipantIds.length === 0}
                className={cn(
                  'min-h-10',
                  debate.panelistJudgeParticipantIds.length === 0 && 'p-2'
                )}
              >
                {debate.panelistJudgeParticipantIds.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    Drop panelists here
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {debate.panelistJudgeParticipantIds.map((judgeId) => {
                      const judge = judgeMap.get(judgeId);
                      return (
                        <DraggableItem
                          key={judgeId}
                          id={judgeId}
                          type="judge"
                          data={{ type: 'judge', debateId: debate.id, slot: 'panelists' }}
                          disabled={!canEdit}
                        >
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm group whitespace-nowrap">
                            {canEdit && (
                              <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                            )}
                            <span>{getJudgeName(judge)}</span>
                            {canEdit && (
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                                onClick={() => handleRemovePanelist(judgeId)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </DraggableItem>
                      );
                    })}
                  </div>
                )}
              </DroppableSlot>
            </div>
          </div>
        </div>

        {/* Join Call button — ONLINE tournaments, PUBLISHED+ rounds, eligible users */}
        {eventMode === 'ONLINE' &&
          callRole &&
          roundStatus !== 'DRAFT' &&
          tournamentId &&
          roundId && (
            <div className="mt-4 pt-3 border-t flex justify-end">
              <Link
                href={`/tournaments/${tournamentId}/rounds/${roundId}/debates/${debate.id}/call`}
              >
                <Button size="sm" className="gap-2">
                  <Video className="h-4 w-4" />
                  Join Call
                </Button>
              </Link>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
