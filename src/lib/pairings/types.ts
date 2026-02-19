/**
 * Swiss Pairing Types
 *
 * Domain types for the Swiss-system pairing algorithm.
 * These are pure data types with no side effects.
 */

// =============================================================================
// Input types (fed to the algorithm)
// =============================================================================

/** Per-team data needed by the Swiss algorithm. */
export interface SwissTeamRecord {
  teamId: string;
  teamName: string;
  institutionId: string;
  /** Total match-point wins across all completed rounds. */
  matchPoints: number;
  /** Total speaker points across all completed rounds (tie-break). */
  speakerPoints: number;
  /** IDs of teams this team has already faced. */
  pastOpponents: Set<string>;
  /** Number of times this team has been Proposition. */
  propCount: number;
  /** Number of times this team has been Opposition. */
  oppCount: number;
  /** Whether this team already received a BYE in a prior round. */
  hadBye: boolean;
}

/** Parameters for the Swiss pairing algorithm. */
export interface SwissPairingInput {
  /** All active teams with their accumulated stats. */
  teams: SwissTeamRecord[];
  /** Seed string for deterministic RNG (e.g. "tourn_abc:round_2"). */
  rngSeed: string;
  /** Whether this is a Round 1 scenario (no prior results). */
  isFirstRound: boolean;
}

// =============================================================================
// Output types (produced by the algorithm)
// =============================================================================

/** A single pairing produced by the algorithm. */
export interface SwissPairing {
  /** Team assigned to Proposition (or the BYE team). */
  propTeamId: string;
  /** Team assigned to Opposition (null for BYE). */
  oppTeamId: string | null;
  /** The match-points bracket this pairing came from. */
  bracketPoints: number;
  /** True if this is a BYE (only propTeamId is set). */
  isBye: boolean;
}

/** Full result of the Swiss pairing algorithm. */
export interface SwissPairingResult {
  /** Ordered list of pairings. */
  pairings: SwissPairing[];
  /** Warnings about constraints that could not be satisfied. */
  warnings: string[];
}

// =============================================================================
// Orchestrator types (DB integration layer)
// =============================================================================

/** Parameters for the generate-and-persist orchestrator. */
export interface GenerateSwissPairingsParams {
  tournamentId: string;
  roundId: string;
  /** If true, compute pairings but do NOT write to the database. */
  dryRun?: boolean;
}

/** Result returned by the orchestrator. */
export interface GenerateSwissPairingsResult {
  pairings: SwissPairing[];
  warnings: string[];
  debatesCreated: number;
}
