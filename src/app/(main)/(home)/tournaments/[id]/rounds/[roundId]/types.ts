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
  /** Members with user info — used when showDebaterNames is enabled */
  members?: {
    participant: {
      user: {
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        displayName?: string | null;
      } | null;
    };
  }[];
}

export interface JudgeData {
  id: string; // participantId
  institutionId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;
  institution: {
    id: string;
    name: string;
  } | null;
}

export type JudgeRole = 'CHAIR' | 'PANELIST';

export interface DebateJudge {
  id: string;
  participantId: string;
  role: JudgeRole;
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
  motion: string | null;
  infoSlide: string | null;
  status: RoundStatus;
  tournament: {
    id: string;
    name: string;
    createdByUserId: string;
  };
  debates: DebateData[];
}

export interface BallotModificationQueueItem {
  id: string;
  ballotId: string;
  debateId: string;
  debateOrder: number;
  judgeName: string;
  judgeRole: JudgeRole;
  propTeamName: string | null;
  oppTeamName: string | null;
  reason: string | null;
  createdAt: string;
}

// Editor state types (for the local state that gets saved)
export interface EditorDebate {
  id: string; // Can be a temp ID for new debates
  order: number;
  propTeamId: string | null;
  oppTeamId: string | null;
  isBye: boolean;
  venueId: string | null; // Assigned venue (read from server; not editable via DnD)
  chairJudgeParticipantId: string | null;
  panelistJudgeParticipantIds: string[];
}

// DnD item types
export type DragItemType = 'team' | 'judge';

export interface DragItem {
  type: DragItemType;
  id: string;
  sourceDebateId?: string; // If dragged from a debate
  sourceSlot?: 'prop' | 'opp' | 'chair' | 'panelists'; // Which slot it came from
}

// Validation
export interface DebateWarning {
  type: 'same-institution' | 'judge-conflict' | 'even-panel' | 'no-chair';
  message: string;
}
