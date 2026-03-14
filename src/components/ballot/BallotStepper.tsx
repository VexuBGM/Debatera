'use client';

import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/ui/step-indicator';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const BALLOT_STEPS = [
  { label: 'Context' },
  { label: 'Proposition' },
  { label: 'Opposition' },
  { label: 'Decision' },
];

interface BallotStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  canProceed?: boolean;
  isSubmitted?: boolean;
}

export function BallotStepper({ currentStep, onStepChange, canProceed = true, isSubmitted }: BallotStepperProps) {
  return (
    <div className="sticky top-12 sm:top-14 z-40 bg-background/95 backdrop-blur-sm border-b border-border pb-3 pt-3 -mx-4 px-4 sm:-mx-6 sm:px-6">
      <StepIndicator steps={BALLOT_STEPS} currentStep={currentStep} />
      {!isSubmitted && (
        <div className="flex justify-between mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
          </Button>
          {currentStep < BALLOT_STEPS.length - 1 && (
            <Button
              variant="brand"
              size="sm"
              onClick={() => onStepChange(currentStep + 1)}
              disabled={!canProceed}
            >
              Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
