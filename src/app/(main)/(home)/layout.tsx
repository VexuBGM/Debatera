import '../../globals.css';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import AppShell, { type UserContext } from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // Unauthenticated users get children without the AppShell (for landing page)
  if (!userId) {
    return <>{children}</>;
  }

  const [institutionCount, participations, ownedTournaments] = await Promise.all([
    prisma.institutionMember.count({ where: { userId } }),
    prisma.tournamentParticipant.findMany({
      where: { userId },
      select: {
        role: true,
        tournament: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.tournament.findMany({
      where: { createdByUserId: userId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Build active tournaments list: owned ones as ORGANIZER + participations
  const tournamentMap = new Map<string, UserContext['activeTournaments'][number]>();

  for (const t of ownedTournaments) {
    tournamentMap.set(t.id, { id: t.id, name: t.name, role: 'ORGANIZER' });
  }

  for (const p of participations) {
    if (!tournamentMap.has(p.tournament.id)) {
      tournamentMap.set(p.tournament.id, {
        id: p.tournament.id,
        name: p.tournament.name,
        role: p.role as 'DEBATER' | 'JUDGE',
      });
    }
  }

  const userContext: UserContext = {
    isAdmin: false,
    isAuthenticated: true,
    institutionCount,
    activeTournaments: Array.from(tournamentMap.values()).slice(0, 5),
  };

  return (
    <AppShell userContext={userContext}>
      {children}
    </AppShell>
  );
}
