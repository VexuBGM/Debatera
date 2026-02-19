'use client';

/**
 * GuestBallotForm – Client component for guest ballot entry.
 *
 * Allows a guest judge to fill in speech scores, select a winner,
 * save drafts, and submit via the guest ballot API.
 */

import { useState, useCallback } from 'react';

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
  side: string;
  speakerId: string | null;
  speakerName: string | null;
  score: number | null;
  comment: string | null;
}

interface BallotData {
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
    motion: string | null;
    infoSlide: string | null;
  };
  debate: {
    id: string;
    propTeam: Team | null;
    oppTeam: Team | null;
    venue: { id: string; name: string } | null;
  };
  speeches: Speech[];
}

interface GuestBallotFormProps {
  ballot: BallotData;
  tournamentId: string;
  token: string;
  isEditable: boolean;
  isSubmitted: boolean;
}

// ============================================================================
// Score ranges
// ============================================================================

const CONSTRUCTIVE_ROLES = ['PROP_1', 'OPP_1', 'PROP_2', 'OPP_2', 'PROP_3', 'OPP_3'];
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

// ============================================================================
// Component
// ============================================================================

export default function GuestBallotForm({
  ballot,
  tournamentId,
  token,
  isEditable,
  isSubmitted,
}: GuestBallotFormProps) {
  const [speeches, setSpeeches] = useState<Speech[]>(ballot.speeches);
  const [vote, setVote] = useState<string | null>(ballot.vote);
  const [privateNotes, setPrivateNotes] = useState(ballot.privateNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const baseUrl = `/api/tournaments/${tournamentId}/guest-ballots/${ballot.id}`;
  const tokenParam = `?token=${encodeURIComponent(token)}`;

  // Update a speech field
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

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${baseUrl}${tokenParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote,
          privateNotes,
          speeches: speeches.map((s) => ({
            role: s.role,
            speakerId: s.speakerId,
            speakerName: s.speakerName,
            score: s.score,
            comment: s.comment,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Draft saved successfully.' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save draft.',
      });
    } finally {
      setSaving(false);
    }
  }, [baseUrl, tokenParam, vote, privateNotes, speeches]);

  // Submit ballot
  const handleSubmit = useCallback(async () => {
    if (!vote) {
      setMessage({ type: 'error', text: 'Please select a winning side before submitting.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${baseUrl}/submit${tokenParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote,
          privateNotes,
          speeches: speeches.map((s) => ({
            role: s.role,
            speakerId: s.speakerId,
            speakerName: s.speakerName,
            score: s.score ?? 0,
            comment: s.comment,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.validationErrors) {
          const msgs = data.validationErrors
            .map((e: { message: string }) => e.message)
            .join(', ');
          throw new Error(`Validation: ${msgs}`);
        }
        throw new Error(data.error ?? 'Failed to submit');
      }

      setMessage({ type: 'success', text: 'Ballot submitted successfully!' });
      // Force a page refresh to show read-only state
      window.location.reload();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit ballot.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [baseUrl, tokenParam, vote, privateNotes, speeches]);

  // Compute running totals
  const propTotal = speeches
    .filter((s) => s.side === 'PROPOSITION' && s.score != null)
    .reduce((sum, s) => sum + (s.score ?? 0), 0);
  const oppTotal = speeches
    .filter((s) => s.side === 'OPPOSITION' && s.score != null)
    .reduce((sum, s) => sum + (s.score ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Teams display */}
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

      {/* Speeches */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Speeches</h2>
        {speeches.map((speech, index) => {
          const range = getScoreRange(speech.role);
          const isProp = speech.side === 'PROPOSITION';
          const team = isProp
            ? ballot.debate.propTeam
            : ballot.debate.oppTeam;

          return (
            <div
              key={speech.id}
              className={`rounded-lg border p-4 ${
                isProp
                  ? 'border-l-4 border-l-blue-500'
                  : 'border-l-4 border-l-red-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{getSpeechLabel(speech.role)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({range.min}–{range.max})
                  </span>
                </div>
                {speech.speakerName && (
                  <span className="text-sm text-muted-foreground">
                    {speech.speakerName}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4">
                {/* Speaker selector */}
                {team && isEditable && (
                  <select
                    value={speech.speakerId ?? ''}
                    onChange={(e) =>
                      updateSpeech(
                        index,
                        'speakerId',
                        e.target.value || null
                      )
                    }
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Select speaker</option>
                    {team.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Score input */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Score:</label>
                  {isEditable ? (
                    <input
                      type="number"
                      min={range.min}
                      max={range.max}
                      step={0.5}
                      value={speech.score ?? ''}
                      onChange={(e) =>
                        updateSpeech(
                          index,
                          'score',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                    />
                  ) : (
                    <span className="font-mono text-sm">
                      {speech.score ?? '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
        <div className="text-center">
          <span className="block text-sm text-muted-foreground">Proposition Total</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {propTotal || '—'}
          </span>
        </div>
        <div className="text-center">
          <span className="block text-sm text-muted-foreground">Opposition Total</span>
          <span className="text-xl font-bold text-red-600 dark:text-red-400">
            {oppTotal || '—'}
          </span>
        </div>
      </div>

      {/* Vote */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Winner</h2>
        {isEditable ? (
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="vote"
                checked={vote === 'PROPOSITION'}
                onChange={() => setVote('PROPOSITION')}
                className="text-primary"
              />
              <span>Proposition</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="vote"
                checked={vote === 'OPPOSITION'}
                onChange={() => setVote('OPPOSITION')}
                className="text-primary"
              />
              <span>Opposition</span>
            </label>
          </div>
        ) : (
          <p className="font-medium">{vote ?? 'Not selected'}</p>
        )}
      </div>

      {/* Private notes */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Private Notes</h2>
        {isEditable ? (
          <textarea
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes (only visible to you and organizers)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {privateNotes || 'No notes'}
          </p>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Action buttons */}
      {isEditable && (
        <div className="flex gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Ballot'}
          </button>
        </div>
      )}

      {isSubmitted && (
        <div className="rounded-md bg-green-100 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
          This ballot has been submitted and cannot be edited.
        </div>
      )}
    </div>
  );
}
