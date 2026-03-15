import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TournamentProvider, type TournamentRole } from '@/components/TournamentContext';
import TournamentNav from '@/components/TournamentNav';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { BreadcrumbOverridesProvider } from '@/components/BreadcrumbOverrides';

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
      settings: { select: { eventMode: true } },
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

  const statusVariant = 'published' as const; // TODO: derive from tournament status when field exists

  return (
    <BreadcrumbOverridesProvider>
    <TournamentProvider
      value={{
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        userRole,
        eventMode,
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
