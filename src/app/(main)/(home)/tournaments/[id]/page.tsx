'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Tournament {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: string;
  createdBy: {
    id: string;
    username: string | null;
    email: string | null;
  };
}

type TournamentInstitutionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type OrganizerRegistrationListItem = {
  id: string;
  tournamentId: string;
  status: TournamentInstitutionStatus;
  createdAt: string;
  institution: {
    id: string;
    name: string;
  };
  requestedBy: {
    id: string;
    email: string | null;
    username: string | null;
    imageUrl: string | null;
  };
};

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  const [organizerRegistrations, setOrganizerRegistrations] = useState<OrganizerRegistrationListItem[]>([]);
  const [organizerRegistrationsLoading, setOrganizerRegistrationsLoading] = useState(false);
  const [organizerRegistrationsError, setOrganizerRegistrationsError] = useState<string | null>(null);
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<string | null>(null);

  const isOwner = tournament?.createdByUserId === userId;

  useEffect(() => {
    if (!tournamentId) return;
    void fetchTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    if (!isOwner) return;
    void fetchOrganizerRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, isOwner]);

  async function fetchTournament() {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch');
      setTournament(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrganizerRegistrations() {
    setOrganizerRegistrationsLoading(true);
    setOrganizerRegistrationsError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/institution-registrations/admin?status=PENDING`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load registrations');
      setOrganizerRegistrations(Array.isArray(data?.items) ? data.items : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load registrations';
      setOrganizerRegistrationsError(msg);
      setOrganizerRegistrations([]);
    } finally {
      setOrganizerRegistrationsLoading(false);
    }
  }

  async function updateRegistrationStatus(registrationId: string, status: 'APPROVED' | 'REJECTED') {
    setUpdatingRegistrationId(registrationId);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/institution-registrations/${registrationId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update registration');
      toast.success(status === 'APPROVED' ? 'Institution approved' : 'Institution rejected');
      await fetchOrganizerRegistrations();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update registration');
    } finally {
      setUpdatingRegistrationId(null);
    }
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="max-w-4xl mx-auto p-4">
        <p>Tournament not found</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tournaments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-cyan-500" />
            <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created by {tournament.createdBy?.username || tournament.createdBy?.email || 'Unknown'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/tournaments/${tournament.id}/register/members`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Register institution / members</Button>
        </Link>
      </div>

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{new Date(tournament.createdAt).toLocaleDateString()}</p>
            </div>

            {isOwner && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">Organizer tools</p>

                {organizerRegistrationsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading pending institution registrations…</div>
                ) : organizerRegistrationsError ? (
                  <div className="text-sm text-muted-foreground">{organizerRegistrationsError}</div>
                ) : organizerRegistrations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No pending institution registrations.</div>
                ) : (
                  <div className="space-y-3">
                    {organizerRegistrations.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border rounded-md p-3"
                      >
                        <div>
                          <div className="font-medium">{r.institution.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Requested by {r.requestedBy.username || r.requestedBy.email || r.requestedBy.id} •{' '}
                            {new Date(r.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateRegistrationStatus(r.id, 'APPROVED')}
                            disabled={updatingRegistrationId === r.id}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateRegistrationStatus(r.id, 'REJECTED')}
                            disabled={updatingRegistrationId === r.id}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
