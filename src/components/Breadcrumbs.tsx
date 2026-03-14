'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useTournament } from '@/components/TournamentContext';
import { useBreadcrumbOverrides } from '@/components/BreadcrumbOverrides';

const SEGMENT_LABELS: Record<string, string> = {
  tournaments: 'Tournaments',
  rounds: 'Rounds',
  register: 'Register',
  members: 'Members',
  teams: 'Teams',
  standings: 'Standings',
  'my-debates': 'My Debates',
  'my-ballots': 'My Ballots',
  participants: 'Participants',
  venues: 'Venues',
  settings: 'Settings',
  institutions: 'Institutions',
  new: 'New',
  me: 'Profile',
  edit: 'Edit',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const overrides = useBreadcrumbOverrides();
  let tournament: { tournamentId: string; tournamentName: string } | null = null;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useTournament();
    tournament = { tournamentId: ctx.tournamentId, tournamentName: ctx.tournamentName };
  } catch {
    // Not inside TournamentProvider, which is fine
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip tournament ID segment — replace with tournament name
    if (tournament && segment === tournament.tournamentId) {
      crumbs.push({
        label: tournament.tournamentName,
        href: currentPath,
      });
      continue;
    }

    // For ID-like segments, use override label or skip
    if (/^[0-9a-z-]{20,}$/i.test(segment)) {
      if (overrides[segment]) {
        crumbs.push({ label: overrides[segment], href: currentPath });
      }
      continue;
    }

    const label = SEGMENT_LABELS[segment] || segment;
    crumbs.push({ label, href: currentPath });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" />
          {i === crumbs.length - 1 ? (
            <span className="text-foreground font-medium truncate max-w-[200px]">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors truncate max-w-[200px]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
