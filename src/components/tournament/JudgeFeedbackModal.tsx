'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, CheckCircle, Loader2 } from 'lucide-react';

interface JudgeFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debateId: string;
  propTeamName: string;
  oppTeamName: string;
  onSubmit: (feedback: {
    winnerSide: 'PROP' | 'OPP' | null;
    whatWorked: string;
    whatToImprove: string;
    decisionRationale: string;
  }) => Promise<void>;
  existingFeedback?: {
    winnerSide: 'PROP' | 'OPP' | null;
    notes: string;
  };
  canEdit?: boolean;
}

export function JudgeFeedbackModal({
  open,
  onOpenChange,
  debateId,
  propTeamName,
  oppTeamName,
  onSubmit,
  existingFeedback,
  canEdit = true,
}: JudgeFeedbackModalProps) {
  const [winnerSide, setWinnerSide] = useState<'PROP' | 'OPP' | null>(
    existingFeedback?.winnerSide || null
  );
  const [whatWorked, setWhatWorked] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [decisionRationale, setDecisionRationale] = useState(
    existingFeedback?.notes || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async () => {
    if (!winnerSide) {
      setError('Please select a winning team');
      return;
    }

    if (!decisionRationale.trim()) {
      setError('Please provide a decision rationale');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        winnerSide,
        whatWorked,
        whatToImprove,
        decisionRationale,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Results & Feedback</DialogTitle>
          <DialogDescription>
            Provide your decision and feedback for this debate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Winner Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Select Winner <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-all ${
                  winnerSide === 'PROP'
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                onClick={() => canEdit && setWinnerSide('PROP')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        winnerSide === 'PROP'
                          ? 'bg-cyan-500/20'
                          : 'bg-white/10'
                      }`}
                    >
                      <Trophy
                        className={`h-5 w-5 ${
                          winnerSide === 'PROP'
                            ? 'text-cyan-400'
                            : 'text-white/70'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">
                        Proposition
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          winnerSide === 'PROP'
                            ? 'text-cyan-400'
                            : 'text-white'
                        }`}
                      >
                        {propTeamName}
                      </p>
                    </div>
                    {winnerSide === 'PROP' && (
                      <CheckCircle className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  winnerSide === 'OPP'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                onClick={() => canEdit && setWinnerSide('OPP')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        winnerSide === 'OPP'
                          ? 'bg-red-500/20'
                          : 'bg-white/10'
                      }`}
                    >
                      <Trophy
                        className={`h-5 w-5 ${
                          winnerSide === 'OPP'
                            ? 'text-red-400'
                            : 'text-white/70'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-red-400">
                        Opposition
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          winnerSide === 'OPP'
                            ? 'text-red-400'
                            : 'text-white'
                        }`}
                      >
                        {oppTeamName}
                      </p>
                    </div>
                    {winnerSide === 'OPP' && (
                      <CheckCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feedback Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                What Worked Well
              </label>
              <Textarea
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                placeholder="Highlight strong arguments, effective rebuttals, good team dynamics..."
                rows={3}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                What to Improve
              </label>
              <Textarea
                value={whatToImprove}
                onChange={(e) => setWhatToImprove(e.target.value)}
                placeholder="Suggest areas for development, missed opportunities, weaknesses..."
                rows={3}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Decision Rationale <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Explain your decision: Why did the winning team prevail? What were the key factors?"
                rows={4}
                disabled={!canEdit}
              />
              <p className="text-xs text-white/50">
                This will be shared with all participants after the round
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              onClick={handleSubmit}
              disabled={loading || !winnerSide}
              className="bg-cyan-500 text-black hover:bg-cyan-400"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
