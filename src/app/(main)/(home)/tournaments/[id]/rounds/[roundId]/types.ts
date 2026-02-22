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
  /** BP team slots — only present when debateFormat === 'BP' */
  teamSlots?: BpTeamSlot[];
}

/** BP position labels */
export type BpPosition = 'BP_OG' | 'BP_OO' | 'BP_CG' | 'BP_CO';

export const BP_POSITION_LABELS: Record<BpPosition, string> = {
  BP_OG: 'Opening Government',
  BP_OO: 'Opening Opposition',
  BP_CG: 'Closing Government',
  BP_CO: 'Closing Opposition',
};

export const BP_POSITION_SHORT: Record<BpPosition, string> = {
  BP_OG: 'OG',
  BP_OO: 'OO',
  BP_CG: 'CG',
  BP_CO: 'CO',
};

export const BP_POSITION_COLORS: Record<BpPosition, string> = {
  BP_OG: 'text-blue-600 dark:text-blue-400',
  BP_OO: 'text-red-600 dark:text-red-400',
  BP_CG: 'text-cyan-600 dark:text-cyan-400',
  BP_CO: 'text-orange-600 dark:text-orange-400',
};

export const BP_POSITIONS_ORDERED: BpPosition[] = ['BP_OG', 'BP_OO', 'BP_CG', 'BP_CO'];

export interface BpTeamSlot {
  position: BpPosition;
  teamId: string;
  team: TeamData;
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

export type DebateFormat = 'WSDC' | 'BP';

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
  /** BP: team slots keyed by position */
  bpSlots?: Record<BpPosition, string | null>;
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
