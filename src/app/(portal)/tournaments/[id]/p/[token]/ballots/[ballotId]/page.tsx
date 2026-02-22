'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
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

type DebateFormat = 'WSDC' | 'BP';

type BpPosition = 'BP_OG' | 'BP_OO' | 'BP_CG' | 'BP_CO';

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

interface TeamRanking {
  position: BpPosition;
  rank: number;
  teamPoints: number;
}

interface BpTeamSlot {
  position: BpPosition;
  teamId: string;
  team: Team;
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
  // BP fields (optional — present when debateFormat is BP)
  debateFormat?: DebateFormat;
  teamSlots?: BpTeamSlot[];
  teamRankings?: TeamRanking[];
  speakerScaleMin?: number;
  speakerScaleMax?: number;
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

const REPLY_ROLES = ['OPP_REPLY', 'PROP_REPLY'];

function getScoreRange(role: string) {
  return REPLY_ROLES.includes(role)
    ? { min: 30, max: 40 }
    : { min: 60, max: 80 };
}

// BP Constants
const BP_SPEECH_ORDER = [
  'BP_PM', 'BP_LO', 'BP_DPM', 'BP_DLO',
  'BP_MG', 'BP_MO', 'BP_GW', 'BP_OW',
] as const;

const BP_POSITIONS_ORDERED: BpPosition[] = ['BP_OG', 'BP_OO', 'BP_CG', 'BP_CO'];

const BP_POSITION_LABELS: Record<BpPosition, string> = {
  BP_OG: 'Opening Government',
  BP_OO: 'Opening Opposition',
  BP_CG: 'Closing Government',
  BP_CO: 'Closing Opposition',
};

const BP_POSITION_SHORT: Record<BpPosition, string> = {
  BP_OG: 'OG',
  BP_OO: 'OO',
  BP_CG: 'CG',
  BP_CO: 'CO',
};

const BP_POSITION_COLORS: Record<BpPosition, string> = {
  BP_OG: 'text-blue-400',
  BP_OO: 'text-red-400',
  BP_CG: 'text-cyan-400',
  BP_CO: 'text-orange-400',
};

const BP_SPEECH_ROLE_LABELS: Record<string, string> = {
  BP_PM: 'Prime Minister',
  BP_LO: 'Leader of Opposition',
  BP_DPM: 'Deputy Prime Minister',
  BP_DLO: 'Deputy Leader of Opp.',
  BP_MG: 'Member of Government',
  BP_MO: 'Member of Opposition',
  BP_GW: 'Government Whip',
  BP_OW: 'Opposition Whip',
};

/** Maps a speech role to its BP position */
const BP_SPEECH_ROLE_POSITION: Record<string, BpPosition> = {
  BP_PM: 'BP_OG',
  BP_DPM: 'BP_OG',
  BP_LO: 'BP_OO',
  BP_DLO: 'BP_OO',
  BP_MG: 'BP_CG',
  BP_GW: 'BP_CG',
  BP_MO: 'BP_CO',
  BP_OW: 'BP_CO',
};

/** Speeches grouped by position for display */
const BP_POSITION_SPEECH_ROLES: Record<BpPosition, string[]> = {
  BP_OG: ['BP_PM', 'BP_DPM'],
  BP_OO: ['BP_LO', 'BP_DLO'],
  BP_CG: ['BP_MG', 'BP_GW'],
  BP_CO: ['BP_MO', 'BP_OW'],
};

// ============================================================================
// Page Component
// ============================================================================

export default function PortalBallotPage() {
  const params = useParams<{ id: string; token: string; ballotId: string }>();
  const tournamentId = params?.id;
  const token = params?.token;
  const ballotId = params?.ballotId;

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

  // BP form state
  const [teamRankings, setTeamRankings] = useState<Record<BpPosition, string>>({
    BP_OG: '', BP_OO: '', BP_CG: '', BP_CO: '',
  });

  // ============================================================================
  // Data Fetching (token-based)
  // ============================================================================

  const fetchBallot = useCallback(async () => {
    if (!tournamentId || !token || !ballotId) return;
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/portal/ballots/${ballotId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch ballot');
      setBallot(data);

      // Initialize form state
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

      // BP: Initialize team rankings
      if (data.teamRankings?.length) {
        const rankState: Record<BpPosition, string> = { BP_OG: '', BP_OO: '', BP_CG: '', BP_CO: '' };
        for (const r of data.teamRankings) {
          rankState[r.position as BpPosition] = r.rank > 0 ? String(r.rank) : '';
        }
        setTeamRankings(rankState);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load ballot'
      );
    } finally {
      setLoading(false);
    }
  }, [tournamentId, token, ballotId]);

  useEffect(() => {
    void fetchBallot();
  }, [fetchBallot]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isSubmitted = ballot?.status === 'SUBMITTED';
  const isBp = ballot?.debateFormat === 'BP';

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

  /** Get team members for a BP position (from teamSlots) */
  function getBpTeamMembers(position: BpPosition): TeamMember[] {
    if (!ballot?.teamSlots) return [];
    const slot = ballot.teamSlots.find((s) => s.position === position);
    return slot?.team?.members ?? [];
  }

  /** Get team name for a BP position */
  function getBpTeamName(position: BpPosition): string {
    if (!ballot?.teamSlots) return 'TBD';
    const slot = ballot.teamSlots.find((s) => s.position === position);
    return slot?.team?.name ?? 'TBD';
  }

  // ============================================================================
  // Save / Submit (portal token APIs)
  // ============================================================================

  function buildPayload() {
    if (isBp) {
      return {
        vote: null,
        privateNotes: privateNotes || null,
        speeches: BP_SPEECH_ORDER.map((role) => {
          const s = speeches[role] || {};
          return {
            role,
            speakerId: s.speakerId || null,
            speakerName: s.speakerName || null,
            score: s.score ? parseFloat(s.score) : null,
            comment: s.comment || null,
          };
        }),
        teamRankings: BP_POSITIONS_ORDERED.map((pos) => ({
          position: pos,
          rank: teamRankings[pos] ? parseInt(teamRankings[pos]) : 0,
        })),
      };
    }
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
    if (!ballotId || !token || !tournamentId || isSubmitted) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/portal/ballots/${ballotId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildPayload()),
        }
      );
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
    if (!ballotId || !token || !tournamentId || isSubmitted) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();

      // WSDC requires a vote; BP uses rankings instead
      if (!isBp && !payload.vote) {
        toast.error('You must select a winning side before submitting');
        setSubmitting(false);
        setShowSubmitDialog(false);
        return;
      }

      // BP: quick client-side check that all 4 rankings are filled
      if (isBp) {
        const ranks = BP_POSITIONS_ORDERED.map((p) => parseInt(teamRankings[p]));
        if (ranks.some((r) => isNaN(r) || r < 1 || r > 4)) {
          toast.error('Please rank all 4 teams (1st through 4th) before submitting');
          setSubmitting(false);
          setShowSubmitDialog(false);
          return;
        }
        const uniqueRanks = new Set(ranks);
        if (uniqueRanks.size !== 4) {
          toast.error('Each team must have a unique rank (1 through 4)');
          setSubmitting(false);
          setShowSubmitDialog(false);
          return;
        }
      }

      const res = await fetch(
        `/api/tournaments/${tournamentId}/portal/ballots/${ballotId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
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
        if (isBp) {
          toast.info('Debate results have been computed.');
        } else {
          toast.info(
            `Debate result: ${data.winningSide} wins${
              data.decidedByChair ? ' (decided by chair)' : ''
            }`
          );
        }
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!ballot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-muted-foreground">
          Ballot not found or access denied.
        </p>
        <Link href={`/tournaments/${tournamentId}/p/${token}`}>
          <Button variant="outline">Back to Portal</Button>
        </Link>
      </div>
    );
  }

  // ============================================================================
  // Render speech card
  // ============================================================================

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
              onChange={(e) =>
                updateSpeech(role, 'speakerName', e.target.value)
              }
              disabled={isSubmitted}
              className="mt-1 h-8 text-sm"
            />
          )}
        </div>

        {/* Score + Comment */}
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

  /** Render a BP speech card with position-colored styling */
  function renderBpSpeechCard(role: string, position: BpPosition) {
    const scaleMin = ballot?.speakerScaleMin ?? 65;
    const scaleMax = ballot?.speakerScaleMax ?? 85;
    const members = getBpTeamMembers(position);
    const s = speeches[role] || {
      speakerId: null,
      speakerName: null,
      score: '',
      comment: '',
    };

    const posColor = BP_POSITION_COLORS[position];

    return (
      <div
        key={role}
        className="p-3 rounded-lg border border-border/40 bg-muted/30 space-y-2"
      >
        <div className="flex items-center justify-between">
          <span className={`font-semibold text-sm ${posColor}`}>
            {BP_SPEECH_ROLE_LABELS[role] ?? role}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {scaleMin}–{scaleMax}
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
              onChange={(e) =>
                updateSpeech(role, 'speakerName', e.target.value)
              }
              disabled={isSubmitted}
              className="mt-1 h-8 text-sm"
            />
          )}
        </div>

        {/* Score + Comment */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Score</Label>
            <Input
              type="number"
              min={scaleMin}
              max={scaleMax}
              step={0.5}
              value={s.score}
              onChange={(e) => updateSpeech(role, 'score', e.target.value)}
              disabled={isSubmitted}
              className="mt-1 h-8 text-sm"
              placeholder={`${scaleMin}–${scaleMax}`}
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

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link href={`/tournaments/${tournamentId}/p/${token}`}>
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portal
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
                {ballot.round.name}
                {ballot.tournament.eventMode !== 'ONLINE' && (
                  <> &bull; {ballot.debate.venue?.name ?? 'No venue'}</>
                )}
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
          {isBp && ballot.teamSlots ? (
            /* BP: 4-team grid */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {BP_POSITIONS_ORDERED.map((pos) => {
                const slot = ballot.teamSlots!.find((s) => s.position === pos);
                return (
                  <div key={pos}>
                    <span className={`font-semibold ${BP_POSITION_COLORS[pos]}`}>
                      {BP_POSITION_SHORT[pos]}
                    </span>
                    <p className="truncate">{slot?.team?.name ?? 'TBD'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {slot?.team?.institution ?? ''}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            /* WSDC: Prop vs Opp */
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
          )}
        </CardContent>
      </Card>

      {/* BP: Team Rankings */}
      {isBp && (
        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Team Rankings</CardTitle>
            <CardDescription>
              Rank the four teams from 1st (best) to 4th. Each rank must be
              unique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {BP_POSITIONS_ORDERED.map((pos) => (
                <div key={pos} className="space-y-2">
                  <div className={`font-semibold text-sm ${BP_POSITION_COLORS[pos]}`}>
                    {BP_POSITION_SHORT[pos]} — {getBpTeamName(pos)}
                  </div>
                  <Select
                    value={teamRankings[pos]}
                    onValueChange={(v) =>
                      setTeamRankings((prev) => ({ ...prev, [pos]: v }))
                    }
                    disabled={isSubmitted}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Rank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st</SelectItem>
                      <SelectItem value="2">2nd</SelectItem>
                      <SelectItem value="3">3rd</SelectItem>
                      <SelectItem value="4">4th</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WSDC: Winner Vote */}
      {!isBp && (
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
                      vote === 'PROPOSITION'
                        ? 'text-blue-400'
                        : 'text-muted-foreground'
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
                      vote === 'OPPOSITION'
                        ? 'text-red-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Opposition
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Speaker Scores */}
      <Card className="mb-6 border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Speaker Scores</CardTitle>
          <CardDescription>
            {isBp
              ? `Score each speech on a scale of ${ballot.speakerScaleMin ?? 65}–${ballot.speakerScaleMax ?? 85}. Half points allowed.`
              : 'Assign speakers and score each speech. Constructives: 60–80, Replies: 30–40. Half points allowed.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBp ? (
            /* BP: 4-position layout */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BP_POSITIONS_ORDERED.map((pos) => (
                <div key={pos} className="space-y-3">
                  <div className={`flex items-center gap-2 pb-2 border-b border-border/40`}>
                    <div className={`w-2 h-2 rounded-full ${
                      pos === 'BP_OG' ? 'bg-blue-400' :
                      pos === 'BP_OO' ? 'bg-red-400' :
                      pos === 'BP_CG' ? 'bg-cyan-400' : 'bg-orange-400'
                    }`} />
                    <h3 className={`font-semibold text-sm ${BP_POSITION_COLORS[pos]}`}>
                      {BP_POSITION_SHORT[pos]} — {getBpTeamName(pos)}
                    </h3>
                  </div>
                  {BP_POSITION_SPEECH_ROLES[pos].map((role) =>
                    renderBpSpeechCard(role, pos)
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* WSDC: Two-column layout */
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
          )}
        </CardContent>
      </Card>

      {/* Private Notes */}
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
              {isBp
                ? ' Make sure all scores and team rankings are correct.'
                : ' Make sure all scores and your winner vote are correct.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm py-2">
            {isBp ? (
              <>
                <p className="font-semibold">Team Rankings:</p>
                {BP_POSITIONS_ORDERED.map((pos) => (
                  <p key={pos}>
                    <span className={BP_POSITION_COLORS[pos]}>
                      {BP_POSITION_SHORT[pos]}
                    </span>{' '}
                    — Rank {teamRankings[pos] || '?'}
                  </p>
                ))}
              </>
            ) : (
              <>
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
              </>
            )}
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
