/**
 * BP Pairings Module
 *
 * Re-exports all BP pairing functionality.
 */

export { generateBpPairings } from './generateBpPairings';
export { computeBpPairings } from './bpPairing';
export { computeBpTeamRecords } from './computeBpData';
export type {
  BpTeamRecord,
  BpRoom,
  BpBye,
  BpPairingInput,
  BpPairingResult,
  GenerateBpPairingsParams,
  GenerateBpPairingsResult,
} from './types';
