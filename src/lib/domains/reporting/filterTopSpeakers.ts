/**
 * Filter and rank the top N speakers by average points.
 *
 * Used by the standings API when the `speakerTopN` query param is provided.
 * Sorts by averagePoints DESC, then speakerName ASC (alphabetical tie-break).
 * Returns a new array with re-assigned 1-based ranks.
 */
export function filterTopSpeakers<
  T extends { averagePoints: number; speakerName: string; rank: number },
>(speakers: T[], topN: number): T[] {
  const sorted = [...speakers].sort((a, b) => {
    if (b.averagePoints !== a.averagePoints)
      return b.averagePoints - a.averagePoints;
    return a.speakerName.localeCompare(b.speakerName);
  });
  return sorted.slice(0, topN).map((s, idx) => ({ ...s, rank: idx + 1 }));
}
