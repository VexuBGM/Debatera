'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  Save,
  Send,
  Lock,
  AlertTriangle,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string; // TournamentTeamMember ID
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
  tournament: { id: string; name: string };
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
  'PROP_1',
  'OPP_1',
  'PROP_2',
  'OPP_2',
  'PROP_3',
  'OPP_3',
  'OPP_REPLY',
  'PROP_REPLY',
] as const;

// Speeches grouped by side for two-column layout
const PROP_SPEECH_ORDER = ['PROP_1', 'PROP_2', 'PROP_3', 'PROP_REPLY'] as const;
const OPP_SPEECH_ORDER = ['OPP_1', 'OPP_2', 'OPP_3', 'OPP_REPLY'] as const;

const SPEECH_ROLE_LABELS: Record<string, string> = {
  PROP_1: '1st Speaker',
  OPP_1: '1st Speaker',
  PROP_2: '2nd Speaker',
  OPP_2: '2nd Speaker',
  PROP_3: '3rd Speaker',
  OPP_3: '3rd Speaker',
  OPP_REPLY: 'Reply',
  PROP_REPLY: 'Reply',
};

const CONSTRUCTIVE_ROLES = [
  'PROP_1',
  'OPP_1',
  'PROP_2',
  'OPP_2',
  'PROP_3',
  'OPP_3',
];
const REPLY_ROLES = ['OPP_REPLY', 'PROP_REPLY'];

function getScoreRange(role: string) {
  return REPLY_ROLES.includes(role)
    ? { min: 30, max: 40 }
    : { min: 60, max: 80 };
}

function getSpeechSide(role: string): 'PROPOSITION' | 'OPPOSITION' {
  return role.startsWith('PROP') ? 'PROPOSITION' : 'OPPOSITION';
}

// ============================================================================
// Page Component
// ============================================================================

export default function BallotEntryPage() {
  const params = useParams<{ ballotId: string }>();
  const ballotId = params?.ballotId;
  const router = useRouter();
  const { userId } = useAuth();

  const [ballot, setBallot] = useState<BallotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Form state
  const [vote, setVote] = useState<'PROPOSITION' | 'OPPOSITION' | ''>('');
  const [speeches, setSpeeches] = useState<
    Record<
      string,
      {
        speakerId: string | null;
        speakerName: string | null;
        score: string;
        comment: string;
      }
    >
  >({});
  const [privateNotes, setPrivateNotes] = useState('');

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    if (!ballotId) return;
    void fetchBallot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballotId]);

  async function fetchBallot() {
    try {
      const res = await fetch(`/api/ballots/${ballotId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch ballot');
      setBallot(data);

      // Initialize form state from fetched data
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
      toast.error(
        err instanceof Error ? err.message : 'Failed to load ballot'
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isSubmitted = ballot?.status === 'SUBMITTED';

  const propTotal = WSDC_SPEECH_ORDER.filter((r) =>
    r.startsWith('PROP')
  ).reduce((sum, role) => {
    const s = speeches[role];
    return sum + (s?.score ? parseFloat(s.score) || 0 : 0);
  }, 0);

  const oppTotal = WSDC_SPEECH_ORDER.filter(
    (r) => r.startsWith('OPP')
  ).reduce((sum, role) => {
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
        [role]: {
          ...prev[role],
          [field]: value,
        },
      }));
    },
    []
  );

  function getTeamMembers(side: 'PROPOSITION' | 'OPPOSITION'): TeamMember[] {
    if (!ballot) return [];
    const team =
      side === 'PROPOSITION' ? ballot.debate.propTeam : ballot.debate.oppTeam;
    return team?.members ?? [];
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

      // Client-side quick validation
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
          const errorMessages = data.validationErrors
            .map((e: { message: string }) => e.message)
            .join('\n');
          toast.error(`Validation errors:\n${errorMessages}`);
        } else {
          throw new Error(data?.error || 'Failed to submit');
        }
        return;
      }

      toast.success('Ballot submitted successfully!');
      if (data.debateResultComputed) {
        toast.info(
          `Debate result: ${data.winningSide} wins${
            data.decidedByChair ? ' (decided by chair)' : ''
          }`
        );
      }

      // Re-fetch to reflect submitted state
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
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!ballot) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-muted-foreground">Ballot not found or access denied.</p>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  // Render a single speech row (used in both columns)
  function renderSpeechCard(
    role: string,
    side: 'PROPOSITION' | 'OPPOSITION'
  ) {
    const range = getScoreRange(role);
    const isReply = REPLY_ROLES.includes(role);
    const members = getTeamMembers(side);
    const s = speeches[role] || {
      speakerId: null,
      speakerName: null,
      score: '',
      comment: '',
    };

    return (
      <div
        key={role}
        className={`p-3 rounded-lg border space-y-2 ${
          side === 'PROPOSITION'
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {SPEECH_ROLE_LABELS[role]}
            </span>
            {isReply && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${
                  side === 'PROPOSITION'
                    ? 'border-blue-400/50 text-blue-400'
                    : 'border-red-400/50 text-red-400'
                }`}
              >
                Reply
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {range.min}–{range.max}
          </span>
        </div>

        {/* Speaker */}
        <div>
          <Label className="text-xs text-muted-foreground">Speaker</Label>
          {members.length > 0 ? (
            <Select
              value={s.speakerId || ''}
              onValueChange={(v) => {
                updateSpeech(role, 'speakerId', v || null);
                const member = members.find((m) => m.id === v);
                updateSpeech(role, 'speakerName', member?.name || null);
              }}
              disabled={isSubmitted}
            >
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Speaker name"
              value={s.speakerName || ''}
              onChange={(e) => updateSpeech(role, 'speakerName', e.target.value)}
              disabled={isSubmitted}
              className="mt-1 h-8 text-sm"
            />
          )}
        </div>

        {/* Score + Comment row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Score</Label>
            <Input
              type="number"
              min={range.min}
              max={range.max}
              step={0.5}
              value={s.score}
              onChange={(e) => updateSpeech(role, 'score', e.target.value)}
              disabled={isSubmitted}
              className="mt-1 h-8 text-sm"
              placeholder={`${range.min}–${range.max}`}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Comment</Label>
            <Input
              value={s.comment}
              onChange={(e) => updateSpeech(role, 'comment', e.target.value)}
              disabled={isSubmitted}
              className="mt-1 h-8 text-sm"
              placeholder="Optional"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back link */}
      <div className="mb-4">
        <Link href={`/tournaments/${ballot.tournament.id}/my-ballots`}>
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Ballots
          </Button>
        </Link>
      </div>

      {/* Header Card */}
      <Card className="mb-6 border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{ballot.tournament.name}</CardTitle>
              <CardDescription>
                {ballot.round.name} &bull;{' '}
                {ballot.debate.venue?.name ?? 'No venue'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  ballot.adjudicatorRole === 'CHAIR'
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-zinc-600 text-zinc-100 hover:bg-zinc-700'
                }
              >
                {ballot.adjudicatorRole === 'CHAIR' ? '🪑 Chair' : 'Panelist'}
              </Badge>
              <Badge
                className={
                  isSubmitted
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border-dashed border-muted-foreground text-muted-foreground'
                }
                variant={isSubmitted ? 'default' : 'outline'}
              >
                {isSubmitted ? (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Submitted
                  </span>
                ) : (
                  'Draft'
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-blue-400">Proposition</span>
              <p>{ballot.debate.propTeam?.name ?? 'TBD'}</p>
              <p className="text-xs text-muted-foreground">
                {ballot.debate.propTeam?.institution}
              </p>
            </div>
            <div className="text-right">
              <span className="font-semibold text-red-400">Opposition</span>
              <p>{ballot.debate.oppTeam?.name ?? 'TBD'}</p>
              <p className="text-xs text-muted-foreground">
                {ballot.debate.oppTeam?.institution}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winner Vote */}
      <Card className="mb-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Winner Vote</CardTitle>
          <CardDescription>
            Who won this debate? No draws allowed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={vote}
            onValueChange={(v) =>
              setVote(v as 'PROPOSITION' | 'OPPOSITION')
            }
            disabled={isSubmitted}
          >
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PROPOSITION" id="vote-prop" />
                <Label
                  htmlFor="vote-prop"
                  className={`font-semibold cursor-pointer ${
                    vote === 'PROPOSITION' ? 'text-blue-400' : 'text-muted-foreground'
                  }`}
                >
                  Proposition
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="OPPOSITION" id="vote-opp" />
                <Label
                  htmlFor="vote-opp"
                  className={`font-semibold cursor-pointer ${
                    vote === 'OPPOSITION' ? 'text-red-400' : 'text-muted-foreground'
                  }`}
                >
                  Opposition
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Speaker Scores — Two-Column Layout */}
      <Card className="mb-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Speaker Scores</CardTitle>
          <CardDescription>
            Assign speakers and score each speech. Constructives: 60–80, Replies:
            30–40. Half points allowed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proposition Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-500/30">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h3 className="font-semibold text-blue-400 text-sm">
                  Proposition
                </h3>
              </div>
              {PROP_SPEECH_ORDER.map((role) =>
                renderSpeechCard(role, 'PROPOSITION')
              )}
              <div className="text-center pt-2 border-t border-blue-500/20">
                <span className="text-xs text-muted-foreground">Total</span>
                <p className="text-xl font-bold text-blue-400">
                  {propTotal.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Opposition Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-red-500/30">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h3 className="font-semibold text-red-400 text-sm">
                  Opposition
                </h3>
              </div>
              {OPP_SPEECH_ORDER.map((role) =>
                renderSpeechCard(role, 'OPPOSITION')
              )}
              <div className="text-center pt-2 border-t border-red-500/20">
                <span className="text-xs text-muted-foreground">Total</span>
                <p className="text-xl font-bold text-red-400">
                  {oppTotal.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Private Notes / Feedback */}
      <Card className="mb-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Private Notes</CardTitle>
          <CardDescription>
            Optional feedback or personal notes. Only visible to you and
            organizers.
          </CardDescription>
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
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving || submitting}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            onClick={() => setShowSubmitDialog(true)}
            disabled={saving || submitting}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit Ballot
          </Button>
        </div>
      )}

      {isSubmitted && (
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span className="font-medium">
              Ballot submitted on{' '}
              {ballot.submittedAt
                ? new Date(ballot.submittedAt).toLocaleString()
                : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
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
                <span className="text-amber-400">Not selected!</span>
              )}
            </p>
            <p>
              <strong>Prop total:</strong> {propTotal.toFixed(1)} |{' '}
              <strong>Opp total:</strong> {oppTotal.toFixed(1)}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
