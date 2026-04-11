'use client';

import { useTourTrigger } from '@/hooks/useTour';

export function TournamentListTour() {
  useTourTrigger('tournaments-list');

  return null;
}
