'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, LayoutList, Building2, Check, X, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import { useTournament } from '@/components/TournamentContext';
import { PageContainer } from '@/components/PageContainer';
import { useTour, useTourTrigger } from '@/hooks/useTour';

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
  const { resetTour, startTour } = useTour();

  const tourId =
    userRole === 'ORGANIZER'
      ? 'tournament-overview-organizer'
      : 'tournament-overview-participant';
  useTourTrigger(tourId);

  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizerRegistrations, setOrganizerRegistrations] = useState<OrganizerRegistrationListItem[]>([]);
  const [organizerRegistrationsLoading, setOrganizerRegistrationsLoading] = useState(false);
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<string | null>(null);
  const [showSetupShortcut, setShowSetupShortcut] = useState(false);

  const isOwner = userRole === 'ORGANIZER';
  const setupShortcutStorageKey = `tournament-setup-shortcut-dismissed:${tournamentId}`;

  useEffect(() => {
    void fetchStats();
  }, [tournamentId]);

  useEffect(() => {
    if (isOwner) void fetchOrganizerRegistrations();
  }, [tournamentId, isOwner]);

  useEffect(() => {
    if (!isOwner) {
      setShowSetupShortcut(false);
      return;
    }

    try {
      setShowSetupShortcut(window.localStorage.getItem(setupShortcutStorageKey) !== 'true');
    } catch {
      setShowSetupShortcut(true);
    }
  }, [isOwner, setupShortcutStorageKey]);

  function dismissSetupShortcut() {
    setShowSetupShortcut(false);

    try {
      window.localStorage.setItem(setupShortcutStorageKey, 'true');
    } catch {
      // Ignore storage issues and just hide it for the current session.
    }
  }

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
      <div className="flex justify-end">
        <button
          onClick={() => { resetTour(tourId); startTour(tourId); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Replay tour
        </button>
      </div>

      {isOwner && showSetupShortcut && (
        <Card className="border-border/70 bg-muted/20">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Rocket className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Need to revisit setup?</p>
                <p className="text-sm text-muted-foreground">
                  The guided setup flow is still available whenever you want a quicker organizer checklist.
                </p>
              </div>
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <Button variant="ghost" size="sm" onClick={dismissSetupShortcut}>
                Close
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/tournaments/${tournamentId}/setup`}>Open setup</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="tournament-overview-stats">
          <StatCard icon={<Users className="h-5 w-5 text-brand" />} label="Teams" value={stats.teamsCount} />
          <StatCard icon={<LayoutList className="h-5 w-5 text-brand" />} label="Rounds" value={stats.roundsCount} />
          <StatCard icon={<Building2 className="h-5 w-5 text-brand" />} label="Institutions" value={stats.institutionsCount} />
          <StatCard icon={<Trophy className="h-5 w-5 text-brand" />} label="Participants" value={stats.participantsCount} />
        </div>
      )}

      {/* Pending Registrations (Organizer only) */}
      {isOwner && (
        <Card data-tour="tournament-overview-registrations">
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
      <Card data-tour="tournament-overview-my-debates">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Tournament Details
            </CardTitle>
            {isOwner && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tournaments/${tournamentId}/setup`}>Open setup</Link>
              </Button>
            )}
          </div>
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
