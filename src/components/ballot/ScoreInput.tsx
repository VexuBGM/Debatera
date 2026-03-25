'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ScoreInputProps {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  disabled?: boolean;
  label?: string;
}

export function ScoreInput({ value, onChange, min, max, disabled, label }: ScoreInputProps) {
  const numVal = parseFloat(value);
  const isOutOfRange = value !== '' && !isNaN(numVal) && (numVal < min || numVal > max);

  return (
    <div>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div className="relative">
        <Input
          type="number"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'mt-1 h-9 text-sm pr-16',
            isOutOfRange && 'border-destructive focus-visible:ring-destructive/40'
          )}
          placeholder={`${min}-${max}`}
          title={`Allowed range: ${min}-${max}. Half-point increments are allowed.`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground mt-0.5">
          {min}-{max}
        </span>
      </div>
    </div>
  );
}
