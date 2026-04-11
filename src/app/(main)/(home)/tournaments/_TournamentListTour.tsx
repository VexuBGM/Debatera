'use client';

import { useTour, useTourTrigger } from '@/hooks/useTour';

export function TournamentListTour() {
  const { resetTour, startTour } = useTour();
  useTourTrigger('tournaments-list');

  return (
    <button
      onClick={() => { resetTour('tournaments-list'); startTour('tournaments-list'); }}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Replay tour
    </button>
  );
}
