/**
 * Pairings Module
 *
 * Re-exports all pairing functionality for clean imports.
 */

export { generateSwissPairings } from './generateSwissPairings';
export { computeSwissPairings } from './swissPairing';
export { computeSwissTeamRecords } from './computeSwissData';
export { createSeededRng } from './seededRng';
export type {
  SwissTeamRecord,
  SwissPairing,
  SwissPairingInput,
  SwissPairingResult,
  GenerateSwissPairingsParams,
  GenerateSwissPairingsResult,
} from './types';
