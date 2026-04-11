'use client';

import * as React from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TooltipPosition {
  top: number;
  left: number;
  arrowSide: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

interface TourTooltipProps {
  title: string;
  description: string;
  stepIndex: number;
  totalSteps: number;
  position: TooltipPosition;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}

const ARROW_SIZE = 8; // px

function Arrow({ side }: { side: TooltipPosition['arrowSide'] }) {
  if (side === 'none') return null;

  const base =
    'absolute w-0 h-0 pointer-events-none';

  const styles: Record<TooltipPosition['arrowSide'], string> = {
    top: `${base} -top-[${ARROW_SIZE}px] left-1/2 -translate-x-1/2 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-neutral-800`,
    bottom: `${base} -bottom-[${ARROW_SIZE}px] left-1/2 -translate-x-1/2 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-neutral-800`,
    left: `${base} -left-[${ARROW_SIZE}px] top-1/2 -translate-y-1/2 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-neutral-800`,
    right: `${base} -right-[${ARROW_SIZE}px] top-1/2 -translate-y-1/2 border-t-[8px] border-b-[8px] border-l-[8px] border-t-transparent border-b-transparent border-l-neutral-800`,
    none: '',
  };

  return <div className={styles[side]} />;
}

export function TourTooltip({
  title,
  description,
  stepIndex,
  totalSteps,
  position,
  onBack,
  onNext,
  onSkip,
  isLastStep,
}: TourTooltipProps) {
  const content = (
    <>
      {/* Subtle backdrop */}
      <div
        className="fixed inset-0 bg-black/30 pointer-events-none"
        style={{ zIndex: 9998 }}
      />

      {/* Tooltip card */}
      <div
        className={cn(
          'fixed w-[340px] rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl',
          'flex flex-col gap-0 overflow-hidden',
        )}
        style={{ top: position.top, left: position.left, zIndex: 9999 }}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${title}`}
      >
        <Arrow side={position.arrowSide} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <button
            onClick={onSkip}
            className="text-[10px] font-medium text-neutral-500 hover:text-neutral-200 transition-colors flex items-center gap-1"
            aria-label="Skip tour"
          >
            <X className="size-3" />
            Skip Tour
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-800 mx-4" />

        {/* Body */}
        <div className="px-4 py-4 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-neutral-100 leading-snug">
            {title}
          </p>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === stepIndex
                    ? 'w-4 h-1.5 bg-brand'
                    : i < stepIndex
                      ? 'w-1.5 h-1.5 bg-neutral-600'
                      : 'w-1.5 h-1.5 bg-neutral-700',
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button
                variant="ghost-muted"
                size="sm"
                onClick={onBack}
                className="h-7 px-2.5 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Back
              </Button>
            )}
            <Button
              variant="brand"
              size="sm"
              onClick={onNext}
              className="h-7 px-3 text-xs"
            >
              {isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}
