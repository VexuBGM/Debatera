'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { BallotWorkspace } from '@/components/ballot/BallotWorkspace';
import {
  BallotData,
  BallotSpeechFormState,
  BallotSpeechRole,
  SpeechFormEntry,
  WSDC_SPEECH_ORDER,
  createEmptySpeechFormEntry,
} from '@/components/ballot/model';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalToken } from '@/lib/portal/clientToken';

export default function PortalBallotPage() {
  const params = useParams<{ id: string; ballotId: string }>();
  const tournamentId = params?.id;
  const ballotId = params?.ballotId;
  const { token, ready, clearToken } = usePortalToken(tournamentId);

  const [ballot, setBallot] = useState<BallotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vote, setVote] = useState<'PROPOSITION' | 'OPPOSITION' | ''>('');
  const [speeches, setSpeeches] = useState<BallotSpeechFormState>({});
  const [privateNotes, setPrivateNotes] = useState('');

  const fetchBallot = useCallback(async () => {
    if (!tournamentId || !token || !ballotId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/portal/ballots/${ballotId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data: BallotData | { error?: string } = await res.json();

      if (!res.ok) {
        if (res.status === 401) clearToken();
        throw new Error(
          'error' in data ? data.error || 'Failed to fetch ballot' : 'Failed to fetch ballot'
        );
      }

      const ballotData = data as BallotData;
      setBallot(ballotData);
      setVote(ballotData.vote || '');
      setPrivateNotes(ballotData.privateNotes || '');

      const speechState: BallotSpeechFormState = {};
      for (const speech of ballotData.speeches) {
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
  }, [ballotId, clearToken, token, tournamentId]);

  useEffect(() => {
    if (!ready) return;

    if (!token) {
      setLoading(false);
      return;
    }

    void fetchBallot();
  }, [fetchBallot, ready, token]);

  const updateSpeech = useCallback(
    (role: BallotSpeechRole, field: keyof SpeechFormEntry, value: string | null) => {
      setSpeeches((prev) => ({
        ...prev,
        [role]: {
          ...(prev[role] ?? createEmptySpeechFormEntry()),
          [field]: value,
        },
      }));
    },
    []
  );

  function buildPayload() {
    return {
      vote: vote || null,
      privateNotes: privateNotes || null,
      speeches: WSDC_SPEECH_ORDER.map((role) => {
        const speech = speeches[role] ?? createEmptySpeechFormEntry();
        return {
          role,
          speakerId: speech.speakerId,
          speakerName: speech.speakerName,
          score: speech.score ? parseFloat(speech.score) : null,
          comment: speech.comment || null,
        };
      }),
    };
  }

  async function handleSave() {
    if (!ballotId || !token || !tournamentId || ballot?.status === 'SUBMITTED') return;

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

      if (!res.ok) {
        if (res.status === 401) clearToken();
        throw new Error(data?.error || 'Failed to save');
      }

      toast.success('Ballot saved as draft');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!ballotId || !token || !tournamentId || ballot?.status === 'SUBMITTED') return;

    setSubmitting(true);
    try {
      const payload = buildPayload();

      if (!payload.vote) {
        toast.error('You must select a winning side before submitting');
        return;
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
        if (res.status === 401) clearToken();
        if (data.validationErrors) {
          const errorMessages = data.validationErrors
            .map((error: { message: string }) => error.message)
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
          `Debate result: ${data.winningSide} wins${data.decidedByChair ? ' (decided by chair)' : ''}`
        );
      }

      await fetchBallot();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !ready) {
    return (
      <PageContainer size="lg">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[720px] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!token || !ballot) {
    return (
      <PageContainer size="lg">
        <div className="flex min-h-[40vh] flex-col items-center justify-center space-y-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-muted-foreground">
            Ballot not found or access denied.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/tournaments/${tournamentId}/p`}>Back to Portal</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <BallotWorkspace
        ballot={ballot}
        vote={vote}
        speeches={speeches}
        privateNotes={privateNotes}
        saving={saving}
        submitting={submitting}
        backHref={`/tournaments/${tournamentId}/p`}
        backLabel="Back to Portal"
        onVoteChange={setVote}
        onPrivateNotesChange={setPrivateNotes}
        onUpdateSpeech={updateSpeech}
        onSave={handleSave}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
