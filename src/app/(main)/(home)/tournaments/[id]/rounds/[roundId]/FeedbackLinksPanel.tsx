'use client';

/**
 * FeedbackLinksPanel
 *
 * Displayed below the RoundEditor. Shows one shareable feedback URL for the round
 * and per-judge submission counts so the organizer can track participation.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface JudgeStat {
  debateJudgeId: string;
  judgeName: string;
  judgeRole: string;
  feedbackCount: number;
}

interface DebateStat {
  debateId: string;
  propTeamName: string | null;
  oppTeamName: string | null;
  judges: JudgeStat[];
}

interface RoundFeedbackLink {
  roundId: string;
  roundName: string;
  roundNumber: number;
  roundStatus: string;
  url: string;
  debates: DebateStat[];
}

interface FeedbackLinksPanelProps {
  tournamentId: string;
  roundId: string;
}

export function FeedbackLinksPanel({ tournamentId, roundId }: FeedbackLinksPanelProps) {
  const [data, setData] = useState<RoundFeedbackLink | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/feedback/links`);
      if (!res.ok) return;
      const json = await res.json();
      const round = (json.rounds as RoundFeedbackLink[]).find((r) => r.roundId === roundId);
      setData(round ?? null);
    } catch {
      // Non-critical; silent fail
    }
  }, [tournamentId, roundId]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  if (!data) return null;

  const totalFeedback = data.debates
    .flatMap((d) => d.judges)
    .reduce((sum, j) => sum + j.feedbackCount, 0);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(data!.url);
      setCopied(true);
      toast.success('Feedback link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Judge Feedback
          {totalFeedback > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalFeedback} {totalFeedback === 1 ? 'submission' : 'submissions'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            {data.url}
          </code>
          <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-1.5">{copied ? 'Copied' : 'Copy link'}</span>
          </Button>
        </div>

        {data.debates.length > 0 && (
          <div className="space-y-2">
            {data.debates.map((debate) => (
              <div
                key={debate.debateId}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <p className="text-sm font-medium">
                  {debate.propTeamName ?? '—'} vs {debate.oppTeamName ?? '—'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {debate.judges.map((judge) => (
                    <span
                      key={judge.debateJudgeId}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      {judge.judgeName}
                      {judge.judgeRole === 'CHAIR' && (
                        <Badge variant="secondary" className="text-xs py-0">
                          Chair
                        </Badge>
                      )}
                      <span className="rounded-full bg-muted px-1.5 py-0.5">
                        {judge.feedbackCount}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Share this link with debaters so they can rate the judges for this round.
          Feedback is anonymous.
        </p>
      </CardContent>
    </Card>
  );
}
