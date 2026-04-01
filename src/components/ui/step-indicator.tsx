'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

export function StepIndicator({ steps, currentStep, className, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = typeof onStepClick === 'function';

          return (
            <li key={step.label} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  disabled={!isClickable}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isCompleted && 'bg-brand text-brand-foreground',
                    isCurrent && 'bg-brand/20 text-brand ring-2 ring-brand',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                    isClickable && 'cursor-pointer hover:bg-brand/15 hover:text-foreground',
                    !isClickable && 'cursor-default'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                </button>
                <div className="hidden sm:block">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'mx-3 h-0.5 flex-1',
                  isCompleted ? 'bg-brand' : 'bg-muted'
                )} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
