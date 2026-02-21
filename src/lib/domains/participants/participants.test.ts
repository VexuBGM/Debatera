import { describe, it, expect } from 'vitest';
import { addGuestParticipantSchema, bulkAddGuestParticipantsSchema } from '@/lib/validations/participants';

describe('addGuestParticipantSchema', () => {
  it('accepts valid input with required fields', () => {
    const result = addGuestParticipantSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'DEBATER',
      displayName: 'Ivan Ivanov',
    });
    expect(result.success).toBe(true);
  });

  it('accepts JUDGE role', () => {
    const result = addGuestParticipantSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'JUDGE',
      displayName: 'Maria Petrova',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty displayName', () => {
    const result = addGuestParticipantSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'DEBATER',
      displayName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = addGuestParticipantSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'SPECTATOR',
      displayName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing tournamentId', () => {
    const result = addGuestParticipantSchema.safeParse({
      role: 'DEBATER',
      displayName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional institutionId', () => {
    const result = addGuestParticipantSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'DEBATER',
      displayName: 'Test User',
      institutionId: 'inst_abc',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.institutionId).toBe('inst_abc');
    }
  });
});

describe('bulkAddGuestParticipantsSchema', () => {
  it('accepts valid multiline names', () => {
    const result = bulkAddGuestParticipantsSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'DEBATER',
      names: 'Ivan Ivanov\nMaria Petrova\nGeorgi Dimitrov',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty names string', () => {
    const result = bulkAddGuestParticipantsSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'JUDGE',
      names: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts single name', () => {
    const result = bulkAddGuestParticipantsSchema.safeParse({
      tournamentId: 'tourn_123',
      role: 'JUDGE',
      names: 'Single Judge',
    });
    expect(result.success).toBe(true);
  });
});
