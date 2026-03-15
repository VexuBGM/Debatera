import { describe, expect, it } from 'vitest';
import {
  normalizeGuestDisplayName,
  parseGuestParticipantNames,
  splitGuestDisplayName,
} from '@/lib/domains/participants/guestParticipants';

describe('normalizeGuestDisplayName', () => {
  it('trims outer whitespace and collapses internal spacing', () => {
    expect(normalizeGuestDisplayName('  Ivan   Ivanov  ')).toBe('Ivan Ivanov');
  });
});

describe('parseGuestParticipantNames', () => {
  it('keeps duplicate names while removing blank lines', () => {
    expect(
      parseGuestParticipantNames('Ivan Ivanov\n\nIvan   Ivanov\r\n Maria Petrova  '),
    ).toEqual([
      { line: 1, name: 'Ivan Ivanov' },
      { line: 3, name: 'Ivan Ivanov' },
      { line: 4, name: 'Maria Petrova' },
    ]);
  });
});

describe('splitGuestDisplayName', () => {
  it('returns a null last name for single-word names', () => {
    expect(splitGuestDisplayName('Cher')).toEqual({
      firstName: 'Cher',
      lastName: null,
    });
  });

  it('keeps everything after the first token as the last name', () => {
    expect(splitGuestDisplayName('Maria del Carmen')).toEqual({
      firstName: 'Maria',
      lastName: 'del Carmen',
    });
  });
});
