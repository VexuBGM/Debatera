'use client';

import * as React from 'react';
import { TOURS } from '@/lib/tours/config';
import type { TourId } from '@/lib/tours/config';
import type { TourStep } from '@/lib/tours/types';
import { TourTooltip } from './TourTooltip';
import type { TooltipPosition } from './TourTooltip';

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY = 'debatera:seen-tours';
const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT = 220; // approximate, used for centering fallback
const VIEWPORT_MARGIN = 16;
const HIGHLIGHT_CLASS = 'tour-ring';

// ─── Context ─────────────────────────────────────────────────────────────────

export interface TourContextValue {
  /** Start a tour by ID. No-op if the user has already seen it. */
  startTour: (id: TourId) => void;
  /** Whether the user has completed or skipped this tour. */
  hasSeen: (id: TourId) => boolean;
  /** Remove from seen list so the tour can show again. */
  resetTour: (id: TourId) => void;
  /** Clear every seen tour so page-level triggers can run again. */
  resetAllTours: () => void;
  /** Incremented whenever all tours are reset. */
  resetVersion: number;
  /** True when a tour is currently active. */
  isActive: boolean;
}

export const TourContext = React.createContext<TourContextValue>({
  startTour: () => {},
  hasSeen: () => false,
  resetTour: () => {},
  resetAllTours: () => {},
  resetVersion: 0,
  isActive: false,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSeenFromStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function addSeenToStorage(id: string) {
  try {
    const current = getSeenFromStorage();
    if (!current.includes(id)) {
      localStorage.setItem(LS_KEY, JSON.stringify([...current, id]));
    }
  } catch {}
}

function removeSeenFromStorage(id: string) {
  try {
    const current = getSeenFromStorage();
    localStorage.setItem(LS_KEY, JSON.stringify(current.filter((t) => t !== id)));
  } catch {}
}

function clearSeenFromStorage() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([]));
  } catch {}
}

function markSeenInDB(tourId: string) {
  fetch('/api/me/tutorials', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tourId }),
  }).catch(() => {});
}

function resetSeenInDB(tourId: string) {
  fetch(`/api/me/tutorials?tourId=${encodeURIComponent(tourId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

function resetAllSeenInDB() {
  fetch('/api/me/tutorials?all=true', {
    method: 'DELETE',
  }).catch(() => {});
}

function computePosition(el: Element | null, step: TourStep): TooltipPosition {
  if (!el || !step.target) {
    // Centered fallback
    return {
      top: Math.max(VIEWPORT_MARGIN, (window.innerHeight - TOOLTIP_HEIGHT) / 2),
      left: Math.max(VIEWPORT_MARGIN, (window.innerWidth - TOOLTIP_WIDTH) / 2),
      arrowSide: 'none',
    };
  }

  const rect = el.getBoundingClientRect();
  const pos = step.position ?? 'bottom';

  let top = 0;
  let left = 0;
  let arrowSide: TooltipPosition['arrowSide'] = 'none';

  const GAP = 12; // px gap between element and tooltip

  switch (pos) {
    case 'bottom':
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      arrowSide = 'top';
      break;
    case 'top':
      top = rect.top - TOOLTIP_HEIGHT - GAP;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      arrowSide = 'bottom';
      break;
    case 'right':
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = rect.right + GAP;
      arrowSide = 'left';
      break;
    case 'left':
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = rect.left - TOOLTIP_WIDTH - GAP;
      arrowSide = 'right';
      break;
    case 'center':
    default:
      return {
        top: Math.max(VIEWPORT_MARGIN, (window.innerHeight - TOOLTIP_HEIGHT) / 2),
        left: Math.max(VIEWPORT_MARGIN, (window.innerWidth - TOOLTIP_WIDTH) / 2),
        arrowSide: 'none',
      };
  }

  // Clamp to viewport
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN));
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - TOOLTIP_HEIGHT - VIEWPORT_MARGIN));

  return { top, left, arrowSide };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface TourProviderProps {
  children: React.ReactNode;
  /** Tour IDs already seen, fetched server-side from the User record. */
  initialSeenTutorials: string[];
}

export function TourProvider({ children, initialSeenTutorials }: TourProviderProps) {
  const [activeTourId, setActiveTourId] = React.useState<TourId | null>(null);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [tooltipPosition, setTooltipPosition] = React.useState<TooltipPosition>({
    top: 0,
    left: 0,
    arrowSide: 'none',
  });
  const [resetVersion, setResetVersion] = React.useState(0);
  const [seenInDB] = React.useState<Set<string>>(new Set(initialSeenTutorials));
  const highlightedElRef = React.useRef<Element | null>(null);

  const hasSeen = React.useCallback(
    (id: TourId): boolean => {
      if (seenInDB.has(id)) return true;
      return getSeenFromStorage().includes(id);
    },
    [seenInDB],
  );

  // ── Highlight helpers ──────────────────────────────────────────────────────

  const clearHighlight = React.useCallback(() => {
    highlightedElRef.current?.classList.remove(HIGHLIGHT_CLASS);
    highlightedElRef.current = null;
  }, []);

  const applyHighlight = React.useCallback((el: Element | null) => {
    clearHighlight();
    if (el) {
      el.classList.add(HIGHLIGHT_CLASS);
      highlightedElRef.current = el;
    }
  }, [clearHighlight]);

  // ── Position computation ───────────────────────────────────────────────────

  const updatePosition = React.useCallback(() => {
    if (!activeTourId) return;
    const tour = TOURS[activeTourId];
    const step = tour.steps[currentStep];
    const target = step.target
      ? document.querySelector(`[data-tour="${step.target}"]`)
      : null;
    applyHighlight(target);
    setTooltipPosition(computePosition(target, step));
  }, [activeTourId, currentStep, applyHighlight]);

  React.useEffect(() => {
    if (!activeTourId) return;
    updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTourId, currentStep, updatePosition]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const completeTour = React.useCallback(
    (id: TourId) => {
      clearHighlight();
      setActiveTourId(null);
      setCurrentStep(0);
      addSeenToStorage(id);
      markSeenInDB(id);
    },
    [clearHighlight],
  );

  const startTour = React.useCallback(
    (id: TourId) => {
      if (hasSeen(id)) return;
      setCurrentStep(0);
      setActiveTourId(id);
    },
    [hasSeen],
  );

  const nextStep = React.useCallback(() => {
    if (!activeTourId) return;
    const tour = TOURS[activeTourId];
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour(activeTourId);
    }
  }, [activeTourId, currentStep, completeTour]);

  const prevStep = React.useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const skipTour = React.useCallback(() => {
    if (!activeTourId) return;
    completeTour(activeTourId);
  }, [activeTourId, completeTour]);

  const resetTour = React.useCallback((id: TourId) => {
    removeSeenFromStorage(id);
    resetSeenInDB(id);
    seenInDB.delete(id);
  }, [seenInDB]);

  const resetAllTours = React.useCallback(() => {
    clearHighlight();
    clearSeenFromStorage();
    resetAllSeenInDB();
    seenInDB.clear();
    setActiveTourId(null);
    setCurrentStep(0);
    setResetVersion((version) => version + 1);
  }, [clearHighlight, seenInDB]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeTour = activeTourId ? TOURS[activeTourId] : null;
  const activeStep: TourStep | undefined = activeTour?.steps[currentStep];

  return (
    <TourContext.Provider
      value={{
        startTour,
        hasSeen,
        resetTour,
        resetAllTours,
        resetVersion,
        isActive: activeTourId !== null,
      }}
    >
      {children}
      {activeTour && activeStep && (
        <TourTooltip
          title={activeStep.title}
          description={activeStep.description}
          stepIndex={currentStep}
          totalSteps={activeTour.steps.length}
          position={tooltipPosition}
          onBack={prevStep}
          onNext={nextStep}
          onSkip={skipTour}
          isLastStep={currentStep === activeTour.steps.length - 1}
        />
      )}
    </TourContext.Provider>
  );
}
