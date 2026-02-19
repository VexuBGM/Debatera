'use client';

import BallotForm, { type BallotFormData, type BallotPayload } from '@/components/ballots/BallotForm';

interface GuestBallotClientProps {
  ballot: BallotFormData;
  tournamentId: string;
  csrfToken: string;
  isEditable: boolean;
  isSubmitted: boolean;
}

export default function GuestBallotClient({
  ballot,
  tournamentId,
  csrfToken,
  isEditable,
  isSubmitted,
}: GuestBallotClientProps) {
  const baseUrl = `/api/tournaments/${tournamentId}/guest-ballots/${ballot.id}`;

  async function handleSaveDraft(payload: BallotPayload) {
    const res = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        vote: payload.vote,
        privateNotes: payload.privateNotes,
        speeches: payload.speeches.map((s) => ({
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
  }

  async function handleSubmit(payload: BallotPayload) {
    const res = await fetch(`${baseUrl}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        vote: payload.vote,
        privateNotes: payload.privateNotes,
        speeches: payload.speeches.map((s) => ({
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
  }

  return (
    <BallotForm
      ballot={ballot}
      isEditable={isEditable}
      isSubmitted={isSubmitted}
      onSaveDraft={handleSaveDraft}
      onSubmit={handleSubmit}
    />
  );
}
