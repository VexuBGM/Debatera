'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, LayoutList, Building2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { useTournament } from '@/components/TournamentContext';
import { PageContainer } from '@/components/PageContainer';

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
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
};

interface TournamentStats {
  teamsCount: number;
  roundsCount: number;
  institutionsCount: number;
  participantsCount: number;
}

export default function TournamentOverviewPage() {
  const { tournamentId, userRole } = useTournament();
  const { userId } = useAuth();

  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizerRegistrations, setOrganizerRegistrations] = useState<OrganizerRegistrationListItem[]>([]);
  const [organizerRegistrationsLoading, setOrganizerRegistrationsLoading] = useState(false);
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<string | null>(null);

  const isOwner = userRole === 'ORGANIZER';

  useEffect(() => {
    void fetchStats();
  }, [tournamentId]);

  useEffect(() => {
    if (isOwner) void fetchOrganizerRegistrations();
  }, [tournamentId, isOwner]);

  async function fetchStats() {
    try {
      const [teamsRes, roundsRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/teams`),
        fetch(`/api/tournaments/${tournamentId}/rounds`),
      ]);

      const teamsData = teamsRes.ok ? await teamsRes.json() : { teams: [] };
      const roundsData = roundsRes.ok ? await roundsRes.json() : { rounds: [] };

      setStats({
        teamsCount: teamsData.teams?.length ?? 0,
        roundsCount: roundsData.rounds?.length ?? 0,
        institutionsCount: 0,
        participantsCount: 0,
      });
    } catch {
      // Stats are best-effort
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrganizerRegistrations() {
    setOrganizerRegistrationsLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/institution-registrations/admin?status=PENDING`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load registrations');
      setOrganizerRegistrations(Array.isArray(data?.items) ? data.items : []);
    } catch {
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
      <PageContainer>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="h-5 w-5 text-brand" />} label="Teams" value={stats.teamsCount} />
          <StatCard icon={<LayoutList className="h-5 w-5 text-brand" />} label="Rounds" value={stats.roundsCount} />
          <StatCard icon={<Building2 className="h-5 w-5 text-brand" />} label="Institutions" value={stats.institutionsCount} />
          <StatCard icon={<Trophy className="h-5 w-5 text-brand" />} label="Participants" value={stats.participantsCount} />
        </div>
      )}

      {/* Pending Registrations (Organizer only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {organizerRegistrationsLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
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
                        Requested by {displayNameFromDbUser(r.requestedBy)} &bull;{' '}
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => updateRegistrationStatus(r.id, 'APPROVED')}
                        disabled={updatingRegistrationId === r.id}
                      >
                        {updatingRegistrationId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Check className="mr-1 h-4 w-4" /> Approve</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateRegistrationStatus(r.id, 'REJECTED')}
                        disabled={updatingRegistrationId === r.id}
                      >
                        {updatingRegistrationId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><X className="mr-1 h-4 w-4" /> Reject</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tournament Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            More tournament details and activity feed coming soon.
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
