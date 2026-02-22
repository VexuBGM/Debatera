/**
 * BP Pairing Types
 *
 * Domain types for the BP (British Parliamentary) pairing algorithm.
 * Pure data types with no side effects.
 */

import { DebateTeamPosition } from '@prisma/client';

// =============================================================================
// Input types
// =============================================================================

/** Per-team data needed by the BP pairing algorithm. */
export interface BpTeamRecord {
  teamId: string;
  teamName: string;
  institutionId: string;
  /** Accumulated team points across prior rounds. */
  teamPoints: number;
  /** Total speaker points across prior rounds (tie-break). */
  speakerPoints: number;
  /** IDs of teams this team has shared a room with. */
  pastRoommates: Set<string>;
  /** Position history: count per BP position. */
  positionCounts: Record<string, number>;
  /** Whether this team already received a BYE. */
  hadBye: boolean;
}

/** Parameters for the BP pairing algorithm. */
export interface BpPairingInput {
  teams: BpTeamRecord[];
  rngSeed: string;
  isFirstRound: boolean;
}

// =============================================================================
// Output types
// =============================================================================

/** A single room (4 teams) produced by the algorithm. */
export interface BpRoom {
  /** Map of position → teamId */
  slots: Record<string, string>;
  /** Which bracket this room belongs to. */
  bracketPoints: number;
}

/** A bye entry (team sitting out). */
export interface BpBye {
  teamId: string;
}

/** Full result of the BP pairing algorithm. */
export interface BpPairingResult {
  rooms: BpRoom[];
  byes: BpBye[];
  warnings: string[];
}

// =============================================================================
// Orchestrator types (DB integration layer)
// =============================================================================

/** Parameters for the generate-and-persist orchestrator. */
export interface GenerateBpPairingsParams {
  tournamentId: string;
  roundId: string;
  dryRun?: boolean;
}

/** Result returned by the orchestrator. */
export interface GenerateBpPairingsResult {
  rooms: BpRoom[];
  byes: BpBye[];
  warnings: string[];
  debatesCreated: number;
}
