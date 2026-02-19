'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import BallotForm, { type BallotFormData, type BallotPayload } from '@/components/ballots/BallotForm';

interface BallotApiData extends BallotFormData {
  adjudicator: { id: string; name: string };
  tournament: { id: string; name: string; eventMode?: string };
  submittedAt: string | null;
}

export default function BallotEntryPage() {
  const params = useParams<{ ballotId: string }>();
  const ballotId = params?.ballotId;
  const router = useRouter();

  const [ballot, setBallot] = useState<BallotApiData | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load ballot');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft(payload: BallotPayload) {
    const res = await fetch(`/api/ballots/${ballotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(err.error ?? 'Failed to save ballot');
    }
  }

  async function handleSubmit(payload: BallotPayload) {
    const res = await fetch(`/api/ballots/${ballotId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(data.error ?? 'Failed to submit ballot');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!ballot) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Ballot not found.</p>
      </div>
    );
  }

  const isSubmitted = ballot.status === 'SUBMITTED';
  const isEditable = !isSubmitted;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/tournaments/${ballot.tournament.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{ballot.tournament.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ballot.round.name} · {ballot.adjudicatorRole}
          </p>
        </div>
      </div>

      {ballot.round.motion && (
        <div className="rounded-lg border bg-card p-4">
          {ballot.round.infoSlide && (
            <div className="mb-2 text-sm text-muted-foreground">
              {ballot.round.infoSlide}
            </div>
          )}
          <p className="font-medium italic">{ballot.round.motion}</p>
        </div>
      )}

      <BallotForm
        ballot={ballot}
        isEditable={isEditable}
        isSubmitted={isSubmitted}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
