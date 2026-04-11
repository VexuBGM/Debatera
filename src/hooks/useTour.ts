'use client';

import * as React from 'react';
import { TourContext } from '@/components/tour/TourProvider';
import type { TourId } from '@/lib/tours/config';

/** Access tour context methods from any client component. */
export function useTour() {
  return React.useContext(TourContext);
}

/**
 * Call this in a page component to auto-start a tour on first visit.
 * The tour triggers once after mount (after a short paint delay).
 * Has no effect if the user has already seen the tour.
 */
export function useTourTrigger(tourId: TourId) {
  const { startTour, hasSeen } = useTour();

  React.useEffect(() => {
    if (hasSeen(tourId)) return;
    const t = setTimeout(() => startTour(tourId), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);
}
