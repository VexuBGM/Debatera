'use client';

/**
 * FeedbackForm
 *
 * Three-step anonymous feedback flow:
 *   Step 1 — Select which debate you were in
 *   Step 2 — Select which judge to rate (shows "already submitted" badge if rated)
 *   Step 3 — Fill in ratings (1–5) and optional comment, then submit
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, Star } from 'lucide-react';

interface Judge {
  debateJudgeId: string;
  name: string;
  role: 'CHAIR' | 'PANELIST';
}

interface Debate {
  id: string;
  propTeamName: string | null;
  oppTeamName: string | null;
  judges: Judge[];
}

interface FeedbackFormProps {
  tournamentId: string;
  roundId: string;
  debates: Debate[];
}

type Step = 'debate' | 'judge' | 'form' | 'success';

function localStorageKey(debateJudgeId: string) {
  return `debatera:feedback:${debateJudgeId}`;
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                'h-7 w-7 transition-colors',
                n <= display
                  ? 'fill-amber-400 stroke-amber-400'
                  : 'fill-transparent stroke-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackForm({ tournamentId, roundId, debates }: FeedbackFormProps) {
  const [step, setStep] = useState<Step>('debate');
  const [selectedDebate, setSelectedDebate] = useState<Debate | null>(null);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const [clarityRating, setClarityRating] = useState(0);
  const [fairnessRating, setFairnessRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load already-submitted judge IDs from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const allJudgeIds = debates.flatMap((d) => d.judges.map((j) => j.debateJudgeId));
    const done = new Set(
      allJudgeIds.filter((id) => localStorage.getItem(localStorageKey(id)) === 'submitted')
    );
    setSubmittedIds(done);
  }, [debates]);

  function handleSelectDebate(debate: Debate) {
    setSelectedDebate(debate);
    setStep('judge');
  }

  function handleSelectJudge(judge: Judge) {
    setSelectedJudge(judge);
    setClarityRating(0);
    setFairnessRating(0);
    setComment('');
    setError(null);
    setStep('form');
  }

  function handleBackToDebate() {
    setSelectedDebate(null);
    setSelectedJudge(null);
    setStep('debate');
  }

  function handleBackToJudge() {
    setSelectedJudge(null);
    setStep('judge');
  }

  function handleRateAnother() {
    setSelectedJudge(null);
    setStep('judge');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJudge) return;
    if (clarityRating === 0 || fairnessRating === 0) {
      setError('Please provide both ratings before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/feedback/${roundId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debateJudgeId: selectedJudge.debateJudgeId,
            clarityRating,
            fairnessRating,
            comment: comment.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      // Mark as submitted in localStorage
      localStorage.setItem(localStorageKey(selectedJudge.debateJudgeId), 'submitted');
      setSubmittedIds((prev) => new Set([...prev, selectedJudge.debateJudgeId]));
      setStep('success');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 1: Debate selector ──────────────────────────────────────────────
  if (step === 'debate') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Select your debate</p>
        {debates.map((debate) => (
          <button
            key={debate.id}
            type="button"
            onClick={() => handleSelectDebate(debate)}
            className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium">
              {debate.propTeamName ?? '—'}{' '}
              <span className="text-muted-foreground font-normal">vs</span>{' '}
              {debate.oppTeamName ?? '—'}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // ── Step 2: Judge selector ───────────────────────────────────────────────
  if (step === 'judge' && selectedDebate) {
    const allRated = selectedDebate.judges.every((j) =>
      submittedIds.has(j.debateJudgeId)
    );

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleBackToDebate}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Change debate
        </button>

        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {selectedDebate.propTeamName ?? '—'} vs {selectedDebate.oppTeamName ?? '—'}
          </span>
          {' '}— select a judge to rate
        </p>

        {selectedDebate.judges.map((judge) => {
          const done = submittedIds.has(judge.debateJudgeId);
          return (
            <button
              key={judge.debateJudgeId}
              type="button"
              onClick={() => !done && handleSelectJudge(judge)}
              disabled={done}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                done
                  ? 'cursor-default opacity-60'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <div>
                <span className="font-medium">{judge.name}</span>
                {judge.role === 'CHAIR' && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Chair
                  </Badge>
                )}
              </div>
              {done && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5" />
                  Submitted
                </span>
              )}
            </button>
          );
        })}

        {allRated && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            You&apos;ve rated all judges for this debate.
          </p>
        )}
      </div>
    );
  }

  // ── Step 3: Rating form ──────────────────────────────────────────────────
  if (step === 'form' && selectedDebate && selectedJudge) {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <button
          type="button"
          onClick={handleBackToJudge}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Change judge
        </button>

        <div>
          <p className="font-medium">{selectedJudge.name}</p>
          <p className="text-sm text-muted-foreground">
            {selectedDebate.propTeamName ?? '—'} vs {selectedDebate.oppTeamName ?? '—'}
          </p>
        </div>

        <StarRating
          label="Clarity of decision"
          value={clarityRating}
          onChange={setClarityRating}
        />

        <StarRating
          label="Fairness"
          value={fairnessRating}
          onChange={setFairnessRating}
        />

        <div className="space-y-1.5">
          <label htmlFor="comment" className="text-sm font-medium">
            Comments <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional feedback for the judge…"
            maxLength={1000}
            rows={3}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </Button>
      </form>
    );
  }

  // ── Step 4: Success ──────────────────────────────────────────────────────
  if (step === 'success' && selectedJudge) {
    const allRated = selectedDebate?.judges.every((j) =>
      submittedIds.has(j.debateJudgeId)
    );

    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-medium">Feedback submitted</p>
          <p className="text-sm text-muted-foreground">
            Thank you for rating {selectedJudge.name}.
          </p>
        </div>
        {!allRated && selectedDebate && (
          <Button variant="outline" onClick={handleRateAnother}>
            Rate another judge
          </Button>
        )}
      </div>
    );
  }

  return null;
}
