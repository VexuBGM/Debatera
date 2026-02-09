/**
 * Types for the Round Editor
 *
 * Shared types between the editor components.
 */

export type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';

export interface TeamData {
  id: string;
  name: string;
  institutionId: string;
  institution: {
    id: string;
    name: string;
  };
}

export interface JudgeData {
  id: string; // participantId
  institutionId: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;
  institution: {
    id: string;
    name: string;
  } | null;
}

export interface DebateJudge {
  id: string;
  participantId: string;
  participant: JudgeData;
}

export interface VenueData {
  id: string;
  name: string;
  priority: number;
}

export interface DebateData {
  id: string;
  order: number;
  propTeamId: string | null;
  oppTeamId: string | null;
  isBye: boolean;
  propTeam: TeamData | null;
  oppTeam: TeamData | null;
  venue: VenueData | null;
  judges: DebateJudge[];
}

export interface RoundData {
  id: string;
  tournamentId: string;
  number: number;
  name: string;
  status: RoundStatus;
  tournament: {
    id: string;
    name: string;
    createdByUserId: string;
  };
  debates: DebateData[];
}

// Editor state types (for the local state that gets saved)
export interface EditorDebate {
  id: string; // Can be a temp ID for new debates
  order: number;
  propTeamId: string | null;
  oppTeamId: string | null;
  isBye: boolean;
  venueId: string | null; // Assigned venue (read from server; not editable via DnD)
  judgeParticipantIds: string[];
}

// DnD item types
export type DragItemType = 'team' | 'judge';

export interface DragItem {
  type: DragItemType;
  id: string;
  sourceDebateId?: string; // If dragged from a debate
  sourceSlot?: 'prop' | 'opp' | 'judges'; // Which slot it came from
}

// Validation
export interface DebateWarning {
  type: 'same-institution' | 'judge-conflict' | 'even-panel';
  message: string;
}
