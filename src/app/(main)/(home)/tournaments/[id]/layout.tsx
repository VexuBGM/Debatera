import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { TournamentProvider, type TournamentRole } from '@/components/TournamentContext';
import TournamentNav from '@/components/TournamentNav';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { BreadcrumbOverridesProvider } from '@/components/BreadcrumbOverrides';

/** Map a request pathname to the public tab slug it belongs to. */
function getTabSlugFromPath(pathname: string, tournamentId: string): string | null {
  const base = `/tournaments/${tournamentId}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';

  if (rest === '' || rest === '/') return 'overview';
  if (rest.startsWith('/rounds')) return 'rounds';
  if (rest.startsWith('/register/teams')) return 'teams'; // teams list is public-accessible
  if (rest.startsWith('/register')) return null; // other register paths are auth-only
  if (rest.startsWith('/standings')) return 'standings';
  if (rest.startsWith('/teams')) return 'teams';
  if (rest.startsWith('/participants')) return 'participants';
  // All other paths (settings, venues, my-debates, my-ballots) are auth-only
  return null;
}

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const { userId } = await auth();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      createdByUserId: true,
      isPublic: true,
      settings: { select: { eventMode: true, publicTabs: true } },
    },
  });

  if (!tournament) notFound();

  // Determine user role and view permission
  let userRole: TournamentRole = 'SPECTATOR';
  let canView = !!tournament.isPublic;

  if (userId) {
    if (tournament.createdByUserId === userId) {
      userRole = 'ORGANIZER';
      canView = true;
    } else {
      const participation = await prisma.tournamentParticipant.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } },
        select: { role: true },
      });
      if (participation) {
        userRole = participation.role as TournamentRole;
        canView = true;
      }
    }
  }

  if (!canView) notFound();

  const eventMode = tournament.settings?.eventMode ?? 'ONLINE';
  const publicTabs: string[] = tournament.settings?.publicTabs ?? ['overview', 'rounds', 'teams', 'standings'];

  // For unauthenticated spectators, enforce tab-level access
  if (!userId && userRole === 'SPECTATOR') {
    const headerList = await headers();
    const pathname = headerList.get('x-pathname') ?? '';
    // Also try referer-based path extraction as fallback
    const tabSlug = getTabSlugFromPath(pathname, tournamentId);
    if (tabSlug !== null && !publicTabs.includes(tabSlug)) {
      notFound();
    }
    // null tabSlug means auth-only path → block unauthenticated
    if (tabSlug === null && pathname.includes(`/tournaments/${tournamentId}/`)) {
      notFound();
    }
  }

  const statusVariant = 'published' as const; // TODO: derive from tournament status when field exists

  return (
    <BreadcrumbOverridesProvider>
    <TournamentProvider
      value={{
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        userRole,
        eventMode,
        publicTabs,
        isAuthenticated: !!userId,
      }}
    >
      <div className="space-y-0">
        {/* Breadcrumbs */}
        <div className="px-4 sm:px-6 pt-2">
          <Breadcrumbs />
        </div>

        {/* Tournament Header */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-brand shrink-0" />
            <h1 className="text-2xl font-semibold tracking-tight truncate">{tournament.name}</h1>
            <Badge variant={statusVariant} className="shrink-0">Active</Badge>
            {userRole !== 'SPECTATOR' && (
              <Badge
                variant={userRole === 'ORGANIZER' ? 'organizer' : userRole === 'JUDGE' ? 'judge' : 'debater'}
                className="shrink-0"
              >
                {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <TournamentNav />

        {/* Page Content */}
        <div className="py-4">
          {children}
        </div>
      </div>
    </TournamentProvider>
    </BreadcrumbOverridesProvider>
  );
}
