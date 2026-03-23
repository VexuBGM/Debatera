'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTournament, type TournamentRole } from '@/components/TournamentContext';

interface Tab {
  label: string;
  href: string;
  slug: string;
  visible: (role: TournamentRole, eventMode: string) => boolean;
}

function buildTabs(tournamentId: string): Tab[] {
  const base = `/tournaments/${tournamentId}`;
  return [
    {
      label: 'Overview',
      href: base,
      slug: 'overview',
      visible: () => true,
    },
    {
      label: 'Rounds',
      href: `${base}/rounds`,
      slug: 'rounds',
      visible: () => true,
    },
    {
      label: 'Register',
      href: `${base}/register/members`,
      slug: 'register',
      visible: () => true,
    },
    {
      label: 'Teams',
      href: `${base}/register/teams`,
      slug: 'teams',
      visible: () => true,
    },
    {
      label: 'Standings',
      href: `${base}/standings`,
      slug: 'standings',
      visible: () => true,
    },
    {
      label: 'My Debates',
      href: `${base}/my-debates`,
      slug: 'my-debates',
      visible: (role) => role === 'DEBATER',
    },
    {
      label: 'My Ballots',
      href: `${base}/my-ballots`,
      slug: 'my-ballots',
      visible: (role) => role === 'JUDGE',
    },
    {
      label: 'Participants',
      href: `${base}/participants`,
      slug: 'participants',
      visible: (role) => role === 'ORGANIZER',
    },
    {
      label: 'Venues',
      href: `${base}/venues`,
      slug: 'venues',
      visible: (role, eventMode) => role === 'ORGANIZER' && eventMode !== 'ONLINE',
    },
    {
      label: 'Settings',
      href: `${base}/settings`,
      slug: 'settings',
      visible: (role) => role === 'ORGANIZER',
    },
  ];
}

export default function TournamentNav() {
  const { tournamentId, userRole, eventMode, publicTabs, isAuthenticated } = useTournament();
  const pathname = usePathname();
  const tabs = buildTabs(tournamentId);

  const visibleTabs = tabs.filter((t) => {
    // Unauthenticated spectators only see tabs listed in publicTabs
    if (!isAuthenticated && userRole === 'SPECTATOR') {
      return publicTabs.includes(t.slug);
    }
    return t.visible(userRole, eventMode);
  });

  function isActive(tab: Tab) {
    const base = `/tournaments/${tournamentId}`;
    // Exact match for overview
    if (tab.href === base) {
      return pathname === base || pathname === base + '/';
    }
    // Prefix match for sub-pages
    return pathname.startsWith(tab.href);
  }

  return (
    <nav className="border-b border-border overflow-x-auto scrollbar-none">
      <div className="flex gap-0 min-w-max">
        {visibleTabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
