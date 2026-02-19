'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Send } from 'lucide-react';
import { SPEECH_ROLE_SIDE } from '@/lib/ballots';

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
  side: string;
  speakerId: string | null;
  speakerName: string | null;
  score: number | null;
  comment: string | null;
}

export interface BallotFormData {
  id: string;
  status: string;
  vote: string | null;
  propTotal: number | null;
  oppTotal: number | null;
  privateNotes: string | null;
  adjudicatorRole: string;
  round: {
    id: string;
    number: number;
    name: string;
    status: string;
    motion?: string | null;
    infoSlide?: string | null;
  };
  debate: {
    id: string;
    propTeam: Team | null;
    oppTeam: Team | null;
    venue: { id: string; name: string } | null;
  };
  speeches: Speech[];
}

interface BallotFormProps {
  ballot: BallotFormData;
  isEditable: boolean;
  isSubmitted: boolean;
  onSaveDraft: (payload: BallotPayload) => Promise<void>;
  onSubmit: (payload: BallotPayload) => Promise<void>;
}

export interface BallotPayload {
  vote: string | null;
  privateNotes: string | null;
  speeches: {
    role: string;
    side: string;
    speakerId: string | null;
    speakerName: string | null;
    score: number | null;
    comment: string | null;
  }[];
}

const REPLY_ROLES = ['OPP_REPLY', 'PROP_REPLY'];

function getScoreRange(role: string) {
  return REPLY_ROLES.includes(role)
    ? { min: 30, max: 40 }
    : { min: 60, max: 80 };
}

function getSpeechLabel(role: string): string {
  const labels: Record<string, string> = {
    PROP_1: '1st Proposition',
    OPP_1: '1st Opposition',
    PROP_2: '2nd Proposition',
    OPP_2: '2nd Opposition',
    PROP_3: '3rd Proposition',
    OPP_3: '3rd Opposition',
    OPP_REPLY: 'Opposition Reply',
    PROP_REPLY: 'Proposition Reply',
  };
  return labels[role] ?? role;
}

export default function BallotForm({
  ballot,
  isEditable,
  isSubmitted,
  onSaveDraft,
  onSubmit,
}: BallotFormProps) {
  const [speeches, setSpeeches] = useState<Speech[]>(ballot.speeches);
  const [vote, setVote] = useState<string | null>(ballot.vote);
  const [privateNotes, setPrivateNotes] = useState(ballot.privateNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const updateSpeech = useCallback(
    (index: number, field: keyof Speech, value: string | number | null) => {
      setSpeeches((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const payload: BallotPayload = {
    vote,
    privateNotes,
    speeches: speeches.map((s) => ({
      role: s.role,
      side: s.side,
      speakerId: s.speakerId,
      speakerName: s.speakerName,
      score: s.score,
      comment: s.comment,
    })),
  };

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSaveDraft(payload);
      setMessage({ type: 'success', text: 'Draft saved successfully.' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save draft.',
      });
    } finally {
      setSaving(false);
    }
  }, [onSaveDraft, payload]);

  const handleSubmit = useCallback(async () => {
    if (!vote) {
      setMessage({ type: 'error', text: 'Please select a winning side before submitting.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit(payload);
      setMessage({ type: 'success', text: 'Ballot submitted successfully!' });
      window.location.reload();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit ballot.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, payload, vote]);

  const propTotal = speeches
    .filter((s) => s.side === 'PROPOSITION' && s.score != null)
    .reduce((sum, s) => sum + (s.score ?? 0), 0);
  const oppTotal = speeches
    .filter((s) => s.side === 'OPPOSITION' && s.score != null)
    .reduce((sum, s) => sum + (s.score ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ballot.debate.propTeam && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-blue-600 dark:text-blue-400">
              Proposition
            </h3>
            <p className="text-sm font-medium">{ballot.debate.propTeam.name}</p>
            <p className="text-xs text-muted-foreground">
              {ballot.debate.propTeam.institution}
            </p>
          </div>
        )}
        {ballot.debate.oppTeam && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-red-600 dark:text-red-400">
              Opposition
            </h3>
            <p className="text-sm font-medium">{ballot.debate.oppTeam.name}</p>
            <p className="text-xs text-muted-foreground">
              {ballot.debate.oppTeam.institution}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Speeches</h2>
        {speeches.map((speech, index) => {
          const range = getScoreRange(speech.role);
          const team = speech.side === 'PROPOSITION' ? ballot.debate.propTeam : ballot.debate.oppTeam;
          const roleLabel = getSpeechLabel(speech.role);
          const roleSide = SPEECH_ROLE_SIDE[speech.role as keyof typeof SPEECH_ROLE_SIDE];

          return (
            <div key={speech.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{roleLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    {roleSide} · Score {range.min}-{range.max}
                  </div>
                </div>
                {speech.score != null && (
                  <Badge variant="secondary">{speech.score}</Badge>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Speaker</Label>
                  <Select
                    value={speech.speakerId ?? 'manual'}
                    onValueChange={(value) => {
                      if (value === 'manual') {
                        updateSpeech(index, 'speakerId', null);
                        return;
                      }
                      updateSpeech(index, 'speakerId', value);
                      const selected = team?.members.find((m) => m.participantId === value);
                      updateSpeech(index, 'speakerName', selected?.name ?? null);
                    }}
                    disabled={!isEditable}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select speaker" />
                    </SelectTrigger>
                    <SelectContent>
                      {team?.members.map((member) => (
                        <SelectItem key={member.participantId} value={member.participantId}>
                          {member.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="manual">Manual entry</SelectItem>
                    </SelectContent>
                  </Select>
                  {speech.speakerId === null && (
                    <Input
                      value={speech.speakerName ?? ''}
                      onChange={(e) => updateSpeech(index, 'speakerName', e.target.value)}
                      placeholder="Speaker name"
                      disabled={!isEditable}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Score</Label>
                  <Input
                    type="number"
                    min={range.min}
                    max={range.max}
                    value={speech.score ?? ''}
                    onChange={(e) =>
                      updateSpeech(index, 'score', e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Comment</Label>
                  <Textarea
                    value={speech.comment ?? ''}
                    onChange={(e) => updateSpeech(index, 'comment', e.target.value)}
                    placeholder="Feedback for this speech"
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decision</h2>
          <div className="text-sm text-muted-foreground">
            Totals: {propTotal} - {oppTotal}
          </div>
        </div>

        <RadioGroup
          value={vote ?? ''}
          onValueChange={(value) => setVote(value)}
          disabled={!isEditable}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="PROPOSITION" id="vote-prop" />
            <Label htmlFor="vote-prop">Proposition wins</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="OPPOSITION" id="vote-opp" />
            <Label htmlFor="vote-opp">Opposition wins</Label>
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label>Private Notes</Label>
          <Textarea
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            placeholder="Private notes for adjudicators"
            disabled={!isEditable}
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={handleSaveDraft} disabled={!isEditable || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button onClick={handleSubmit} disabled={!isEditable || isSubmitted || submitting}>
          <Send className="mr-2 h-4 w-4" />
          {submitting ? 'Submitting...' : isSubmitted ? 'Submitted' : 'Submit Ballot'}
        </Button>
      </div>
    </div>
  );
}
