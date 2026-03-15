/**
 * Unit Tests: filterTopSpeakers
 *
 * Tests the Top N speaker filtering and ranking logic in isolation.
 */

import { describe, it, expect } from 'vitest';
import { filterTopSpeakers } from './filterTopSpeakers';

function makeSpeaker(name: string, avg: number, rank = 0) {
  return { speakerName: name, averagePoints: avg, rank };
}

describe('filterTopSpeakers', () => {
  it('returns top N speakers sorted by averagePoints DESC', () => {
    const speakers = [
      makeSpeaker('Alice', 70),
      makeSpeaker('Bob', 75),
      makeSpeaker('Charlie', 72),
    ];
    const result = filterTopSpeakers(speakers, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ speakerName: 'Bob', rank: 1 });
    expect(result[1]).toMatchObject({ speakerName: 'Charlie', rank: 2 });
  });

  it('uses alphabetical tie-breaking on equal averagePoints', () => {
    const speakers = [
      makeSpeaker('Charlie', 70),
      makeSpeaker('Alice', 70),
      makeSpeaker('Bob', 70),
    ];
    const result = filterTopSpeakers(speakers, 3);
    expect(result[0].speakerName).toBe('Alice');
    expect(result[1].speakerName).toBe('Bob');
    expect(result[2].speakerName).toBe('Charlie');
  });

  it('returns all speakers if N exceeds total count', () => {
    const speakers = [
      makeSpeaker('Alice', 70),
      makeSpeaker('Bob', 75),
    ];
    const result = filterTopSpeakers(speakers, 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ speakerName: 'Bob', rank: 1 });
    expect(result[1]).toMatchObject({ speakerName: 'Alice', rank: 2 });
  });

  it('re-assigns 1-based ranks regardless of original ranks', () => {
    const speakers = [
      makeSpeaker('Alice', 70, 5),
      makeSpeaker('Bob', 75, 3),
    ];
    const result = filterTopSpeakers(speakers, 2);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it('returns empty array for empty input', () => {
    const result = filterTopSpeakers([], 5);
    expect(result).toHaveLength(0);
  });

  it('returns exactly 1 speaker when N is 1', () => {
    const speakers = [
      makeSpeaker('Alice', 70),
      makeSpeaker('Bob', 75),
      makeSpeaker('Charlie', 80),
    ];
    const result = filterTopSpeakers(speakers, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ speakerName: 'Charlie', rank: 1 });
  });

  it('does not mutate the input array', () => {
    const speakers = [
      makeSpeaker('Alice', 70),
      makeSpeaker('Bob', 75),
    ];
    const original = [...speakers];
    filterTopSpeakers(speakers, 1);
    expect(speakers).toEqual(original);
  });
});
