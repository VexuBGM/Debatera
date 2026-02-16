/**
 * Tournament Standings Page
 *
 * Server component that fetches standings from the reporting domain service
 * and renders them in a table. No direct Prisma calls.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTournamentStandings, StandingsForbiddenError } from '@/lib/domains/reporting';
import { StandingsTableView } from './StandingsTableView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentStandingsPage({ params }: PageProps) {
  const { id: tournamentId } = await params;
  const { userId } = await auth();

  if (!userId) redirect('/sign-in');

  try {
    const standings = await getTournamentStandings(userId, tournamentId);

    return (
      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Standings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated {standings.generatedAt.toLocaleString()}
          </p>
        </div>

        {standings.rows.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            No results locked yet. Standings will appear once debate results are recorded.
          </div>
        ) : (
          <StandingsTableView rows={standings.rows} />
        )}
      </main>
    );
  } catch (error) {
    if (error instanceof StandingsForbiddenError) {
      return (
        <main className="max-w-4xl mx-auto p-4">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="font-medium text-destructive">Access denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You do not have permission to view standings for this tournament.
            </p>
          </div>
        </main>
      );
    }

    return (
      <main className="max-w-4xl mx-auto p-4">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="font-medium text-destructive">Something went wrong</p>
          <p className="text-sm text-muted-foreground mt-1">
            Could not load standings. Please try again later.
          </p>
        </div>
      </main>
    );
  }
}
