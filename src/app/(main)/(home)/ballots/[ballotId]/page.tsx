'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Save,
  Send,
  Lock,
  AlertTriangle,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/PageContainer';
import { BallotStepper } from '@/components/ballot/BallotStepper';
import { SpeechCard } from '@/components/ballot/SpeechCard';

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string;
  participantId: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  institution: string;
  members: TeamMember[];
}

interface Speech {
  id: string;
  role: string;
  side: 'PROPOSITION' | 'OPPOSITION';
  speakerId: string | null;
  speakerName: string | null;
  score: number | null;
  comment: string | null;
}

interface BallotData {
  id: string;
  status: 'DRAFT' | 'SUBMITTED';
  vote: 'PROPOSITION' | 'OPPOSITION' | null;
  propTotal: number | null;
  oppTotal: number | null;
  privateNotes: string | null;
  submittedAt: string | null;
  adjudicatorRole: 'CHAIR' | 'PANELIST';
  adjudicator: { id: string; name: string };
  tournament: { id: string; name: string; eventMode?: string };
  round: { id: string; number: number; name: string; status: string };
  debate: {
    id: string;
    propTeam: Team | null;
    oppTeam: Team | null;
    venue: { id: string; name: string } | null;
  };
  speeches: Speech[];
}

// ============================================================================
// Constants
// ============================================================================

const WSDC_SPEECH_ORDER = [
  'PROP_1', 'OPP_1', 'PROP_2', 'OPP_2', 'PROP_3', 'OPP_3', 'OPP_REPLY', 'PROP_REPLY',
] as const;

const PROP_SPEECH_ORDER = ['PROP_1', 'PROP_2', 'PROP_3', 'PROP_REPLY'] as const;
const OPP_SPEECH_ORDER = ['OPP_1', 'OPP_2', 'OPP_3', 'OPP_REPLY'] as const;

const SPEECH_ROLE_LABELS: Record<string, string> = {
  PROP_1: '1st Speaker', OPP_1: '1st Speaker',
  PROP_2: '2nd Speaker', OPP_2: '2nd Speaker',
  PROP_3: '3rd Speaker', OPP_3: '3rd Speaker',
  OPP_REPLY: 'Reply', PROP_REPLY: 'Reply',
};

const REPLY_ROLES = ['OPP_REPLY', 'PROP_REPLY'];

function getScoreRange(role: string) {
  return REPLY_ROLES.includes(role) ? { min: 30, max: 40 } : { min: 60, max: 80 };
}

// ============================================================================
// Page Component
// ============================================================================

export default function BallotEntryPage() {
  const params = useParams<{ ballotId: string }>();
  const ballotId = params?.ballotId;
  const { userId } = useAuth();

  const [ballot, setBallot] = useState<BallotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [vote, setVote] = useState<'PROPOSITION' | 'OPPOSITION' | ''>('');
  const [speeches, setSpeeches] = useState<
    Record<string, { speakerId: string | null; speakerName: string | null; score: string; comment: string }>
  >({});
  const [privateNotes, setPrivateNotes] = useState('');

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    if (!ballotId) return;
    void fetchBallot();
  }, [ballotId]);

  async function fetchBallot() {
    try {
      const res = await fetch(`/api/ballots/${ballotId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch ballot');
      setBallot(data);
      setVote(data.vote || '');
      setPrivateNotes(data.privateNotes || '');

      const speechState: typeof speeches = {};
      for (const speech of data.speeches) {
        speechState[speech.role] = {
          speakerId: speech.speakerId,
          speakerName: speech.speakerName,
          score: speech.score !== null ? String(speech.score) : '',
          comment: speech.comment || '',
        };
      }
      setSpeeches(speechState);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load ballot');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isSubmitted = ballot?.status === 'SUBMITTED';

  const propTotal = WSDC_SPEECH_ORDER.filter((r) => r.startsWith('PROP')).reduce((sum, role) => {
    const s = speeches[role];
    return sum + (s?.score ? parseFloat(s.score) || 0 : 0);
  }, 0);

  const oppTotal = WSDC_SPEECH_ORDER.filter((r) => r.startsWith('OPP')).reduce((sum, role) => {
    const s = speeches[role];
    return sum + (s?.score ? parseFloat(s.score) || 0 : 0);
  }, 0);

  // ============================================================================
  // Speech State Helpers
  // ============================================================================

  const updateSpeech = useCallback(
    (role: string, field: string, value: string | null) => {
      setSpeeches((prev) => ({
        ...prev,
        [role]: { ...prev[role], [field]: value },
      }));
    },
    []
  );

  function getTeamMembers(side: 'PROPOSITION' | 'OPPOSITION'): TeamMember[] {
    if (!ballot) return [];
    const team = side === 'PROPOSITION' ? ballot.debate.propTeam : ballot.debate.oppTeam;
    return team?.members ?? [];
  }

  // ============================================================================
  // Auto-save on step change
  // ============================================================================

  function handleStepChange(newStep: number) {
    if (!isSubmitted && ballotId) {
      void autoSave();
    }
    setCurrentStep(newStep);
  }

  async function autoSave() {
    try {
      await fetch(`/api/ballots/${ballotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
    } catch {
      // Silent auto-save failure
    }
  }

  // ============================================================================
  // Save / Submit
  // ============================================================================

  function buildPayload() {
    return {
      vote: vote || null,
      privateNotes: privateNotes || null,
      speeches: WSDC_SPEECH_ORDER.map((role) => {
        const s = speeches[role] || {};
        return {
          role,
          speakerId: s.speakerId || null,
          speakerName: s.speakerName || null,
          score: s.score ? parseFloat(s.score) : null,
          comment: s.comment || null,
        };
      }),
    };
  }

  async function handleSave() {
    if (!ballotId || isSubmitted) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ballots/${ballotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');
      toast.success('Ballot saved as draft');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!ballotId || isSubmitted) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (!payload.vote) {
        toast.error('You must select a winning side before submitting');
        setSubmitting(false);
        setShowSubmitDialog(false);
        return;
      }

      const res = await fetch(`/api/ballots/${ballotId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.validationErrors) {
          const errorMessages = data.validationErrors.map((e: { message: string }) => e.message).join('\n');
          toast.error(`Validation errors:\n${errorMessages}`);
        } else {
          throw new Error(data?.error || 'Failed to submit');
        }
        return;
      }

      toast.success('Ballot submitted successfully!');
      if (data.debateResultComputed) {
        toast.info(`Debate result: ${data.winningSide} wins${data.decidedByChair ? ' (decided by chair)' : ''}`);
      }
      await fetchBallot();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  }

  // ============================================================================
  // Loading State
  // ============================================================================

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </PageContainer>
    );
  }

  if (!ballot) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Ballot not found or access denied.</p>
      </PageContainer>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <PageContainer>
      {/* Sticky Step Navigation */}
      <BallotStepper
        currentStep={currentStep}
        onStepChange={handleStepChange}
        isSubmitted={isSubmitted}
      />

      {/* Step 0: Context */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{ballot.tournament.name}</CardTitle>
                <CardDescription>
                  {ballot.round.name}
                  {ballot.tournament.eventMode !== 'ONLINE' && (
                    <> &bull; {ballot.debate.venue?.name ?? 'No venue'}</>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ballot.adjudicatorRole === 'CHAIR' ? 'judge' : 'secondary'}>
                  {ballot.adjudicatorRole === 'CHAIR' ? 'Chair' : 'Panelist'}
                </Badge>
                <Badge variant={isSubmitted ? 'completed' : 'draft'}>
                  {isSubmitted ? (
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Submitted</span>
                  ) : 'Draft'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-blue-400">Proposition</span>
                <p>{ballot.debate.propTeam?.name ?? 'TBD'}</p>
                <p className="text-xs text-muted-foreground">{ballot.debate.propTeam?.institution}</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-red-400">Opposition</span>
                <p>{ballot.debate.oppTeam?.name ?? 'TBD'}</p>
                <p className="text-xs text-muted-foreground">{ballot.debate.oppTeam?.institution}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Proposition Speeches */}
      {currentStep === 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-blue-500/30">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h3 className="font-semibold text-blue-400 text-sm">Proposition</h3>
          </div>
          {PROP_SPEECH_ORDER.map((role) => {
            const range = getScoreRange(role);
            const s = speeches[role] || { speakerId: null, speakerName: null, score: '', comment: '' };
            return (
              <SpeechCard
                key={role}
                role={role}
                roleLabel={SPEECH_ROLE_LABELS[role]}
                side="PROPOSITION"
                isReply={REPLY_ROLES.includes(role)}
                scoreMin={range.min}
                scoreMax={range.max}
                members={getTeamMembers('PROPOSITION')}
                speakerId={s.speakerId}
                speakerName={s.speakerName}
                score={s.score}
                comment={s.comment}
                disabled={isSubmitted}
                onSpeakerChange={(id, name) => {
                  updateSpeech(role, 'speakerId', id);
                  updateSpeech(role, 'speakerName', name);
                }}
                onScoreChange={(v) => updateSpeech(role, 'score', v)}
                onCommentChange={(v) => updateSpeech(role, 'comment', v)}
              />
            );
          })}
          <div className="text-center pt-2 border-t border-blue-500/20">
            <span className="text-xs text-muted-foreground">Total</span>
            <p className="text-xl font-bold text-blue-400">{propTotal.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Step 2: Opposition Speeches */}
      {currentStep === 2 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <h3 className="font-semibold text-red-400 text-sm">Opposition</h3>
          </div>
          {OPP_SPEECH_ORDER.map((role) => {
            const range = getScoreRange(role);
            const s = speeches[role] || { speakerId: null, speakerName: null, score: '', comment: '' };
            return (
              <SpeechCard
                key={role}
                role={role}
                roleLabel={SPEECH_ROLE_LABELS[role]}
                side="OPPOSITION"
                isReply={REPLY_ROLES.includes(role)}
                scoreMin={range.min}
                scoreMax={range.max}
                members={getTeamMembers('OPPOSITION')}
                speakerId={s.speakerId}
                speakerName={s.speakerName}
                score={s.score}
                comment={s.comment}
                disabled={isSubmitted}
                onSpeakerChange={(id, name) => {
                  updateSpeech(role, 'speakerId', id);
                  updateSpeech(role, 'speakerName', name);
                }}
                onScoreChange={(v) => updateSpeech(role, 'score', v)}
                onCommentChange={(v) => updateSpeech(role, 'comment', v)}
              />
            );
          })}
          <div className="text-center pt-2 border-t border-red-500/20">
            <span className="text-xs text-muted-foreground">Total</span>
            <p className="text-xl font-bold text-red-400">{oppTotal.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Step 3: Decision */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Totals Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Proposition</p>
                  <p className="text-2xl font-bold text-blue-400">{propTotal.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opposition</p>
                  <p className="text-2xl font-bold text-red-400">{oppTotal.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Winner Vote */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Winner Vote</CardTitle>
              <CardDescription>Who won this debate? No draws allowed.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={vote}
                onValueChange={(v) => setVote(v as 'PROPOSITION' | 'OPPOSITION')}
                disabled={isSubmitted}
              >
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PROPOSITION" id="vote-prop" />
                    <Label htmlFor="vote-prop" className={`font-semibold cursor-pointer ${vote === 'PROPOSITION' ? 'text-blue-400' : 'text-muted-foreground'}`}>
                      Proposition
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="OPPOSITION" id="vote-opp" />
                    <Label htmlFor="vote-opp" className={`font-semibold cursor-pointer ${vote === 'OPPOSITION' ? 'text-red-400' : 'text-muted-foreground'}`}>
                      Opposition
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Private Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Private Notes</CardTitle>
              <CardDescription>Optional feedback. Only visible to you and organizers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                disabled={isSubmitted}
                placeholder="Any additional notes about this debate..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!isSubmitted && (
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleSave} disabled={saving || submitting}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button variant="brand" onClick={() => setShowSubmitDialog(true)} disabled={saving || submitting}>
                <Send className="mr-2 h-4 w-4" />
                Submit Ballot
              </Button>
            </div>
          )}

          {isSubmitted && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2 text-status-completed">
                <Check className="h-5 w-5" />
                <span className="font-medium">
                  Ballot submitted on{' '}
                  {ballot.submittedAt ? new Date(ballot.submittedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-in-progress" />
              Confirm Submission
            </DialogTitle>
            <DialogDescription>
              Once submitted, your ballot <strong>cannot be edited</strong>.
              Make sure all scores and your winner vote are correct.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <p>
              <strong>Winner vote:</strong>{' '}
              {vote === 'PROPOSITION' ? (
                <span className="text-blue-400">Proposition</span>
              ) : vote === 'OPPOSITION' ? (
                <span className="text-red-400">Opposition</span>
              ) : (
                <span className="text-status-in-progress">Not selected!</span>
              )}
            </p>
            <p>
              <strong>Prop total:</strong> {propTotal.toFixed(1)} |{' '}
              <strong>Opp total:</strong> {oppTotal.toFixed(1)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
