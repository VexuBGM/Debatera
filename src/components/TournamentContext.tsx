'use client';

import { createContext, useContext } from 'react';

export type TournamentRole = 'ORGANIZER' | 'DEBATER' | 'JUDGE' | 'SPECTATOR';

interface TournamentContextValue {
  tournamentId: string;
  tournamentName: string;
  userRole: TournamentRole;
  eventMode: 'IRL' | 'ONLINE';
}

const TournamentCtx = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TournamentContextValue;
}) {
  return <TournamentCtx.Provider value={value}>{children}</TournamentCtx.Provider>;
}

export function useTournament() {
  const ctx = useContext(TournamentCtx);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
