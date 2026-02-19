'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Monitor, Trophy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  getTournamentVenues,
  getTournamentVenueCategories,
  type VenueWithCategories,
} from '@/actions/venues.actions';
import { VenueTable } from './_components/VenueTable';
import { CreateVenueDialog } from './_components/CreateVenueDialog';
import { AutoAllocateDialog } from './_components/AutoAllocateDialog';
import { VenueCategoriesCard } from './_components/VenueCategoriesCard';

// =============================================================================
// Types
// =============================================================================

interface Tournament {
  id: string;
  name: string;
  createdByUserId: string;
  settings?: {
    eventMode: 'ONLINE' | 'IRL';
  } | null;
}

interface Round {
  id: string;
  number: number;
  name: string;
  status: string;
}

interface VenueCategoryOption {
  id: string;
  name: string;
  description: string | null;
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function TournamentVenuesPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [venues, setVenues] = useState<VenueWithCategories[]>([]);
  const [categories, setCategories] = useState<VenueCategoryOption[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = tournament?.createdByUserId === userId;

  // Fetch tournament details + rounds (via API, matching existing pattern)
  useEffect(() => {
    if (!tournamentId) return;
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function fetchAll() {
    try {
      // Fetch tournament info
      const tournamentRes = await fetch(`/api/tournaments/${tournamentId}`);
      if (!tournamentRes.ok) throw new Error('Failed to fetch tournament');
      const tournamentData = await tournamentRes.json();
      setTournament(tournamentData);

      // Fetch rounds (for auto-allocate)
      const roundsRes = await fetch(`/api/tournaments/${tournamentId}/rounds`);
      if (roundsRes.ok) {
        const roundsData = await roundsRes.json();
        setRounds(roundsData.rounds || []);
      }

      // Fetch venues and categories via server actions
      await Promise.all([fetchVenues(), fetchCategories()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const fetchVenues = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const result = await getTournamentVenues(tournamentId);
      if (result.success && result.data) {
        setVenues(result.data);
      }
    } catch {
      toast.error('Failed to fetch venues');
    }
  }, [tournamentId]);

  const fetchCategories = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const result = await getTournamentVenueCategories(tournamentId);
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch {
      toast.error('Failed to fetch categories');
    }
  }, [tournamentId]);

  function handleRefresh() {
    void fetchVenues();
    void fetchCategories();
  }

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────
  if (!tournament) {
    return (
      <main className="max-w-4xl mx-auto p-4">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
          <Trophy className="h-16 w-16 text-muted-foreground" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Tournament Not Found</h1>
            <p className="max-w-md text-muted-foreground">
              The tournament you&apos;re looking for doesn&apos;t exist or may have
              been removed.
            </p>
          </div>
          <Link href="/">
            <Button>Browse Tournaments</Button>
          </Link>
        </div>
      </main>
    );
  }

  // ── Active / Inactive counts ────────────────────────────────────────
  const activeCount = venues.filter((v) => v.isActive).length;
  const inactiveCount = venues.length - activeCount;
  const isOnlineMode = tournament.settings?.eventMode === 'ONLINE';

  // ── Online mode: venues disabled ────────────────────────────────────
  if (isOnlineMode) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <MapPin className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Venues</h1>
        </div>

        <Card className="border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-2">
              <Monitor className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Venues Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This tournament is set to <strong>Online</strong> mode. Physical venues are disabled.
              To manage venues, change the event mode to <strong>IRL</strong> in{' '}
              <a
                href={`/tournaments/${tournament.id}/settings`}
                className="text-cyan-500 underline underline-offset-2 hover:text-cyan-400"
              >
                Tournament Settings
              </a>.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MapPin className="h-6 w-6 text-cyan-500" />
          <div>
            <h1 className="text-2xl font-semibold">Venues</h1>
            <p className="text-sm text-muted-foreground">
              {venues.length} venue{venues.length !== 1 ? 's' : ''}
              {venues.length > 0 && (
                <span>
                  {' '}· {activeCount} active
                  {inactiveCount > 0 && `, ${inactiveCount} inactive`}
                </span>
              )}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <AutoAllocateDialog rounds={rounds} />
            <CreateVenueDialog
              tournamentId={tournament.id}
              categories={categories}
              onCreated={handleRefresh}
              onCategoryCreated={fetchCategories}
            />
          </div>
        )}
      </div>

      {/* Venue Table */}
      <VenueTable
        venues={venues}
        categories={categories}
        isAdmin={isAdmin}
        onRefresh={handleRefresh}
      />

      {/* Categories Management */}
      {isAdmin && (
        <VenueCategoriesCard
          tournamentId={tournament.id}
          categories={categories}
          isAdmin={isAdmin}
          onRefresh={handleRefresh}
        />
      )}
    </main>
  );
}
