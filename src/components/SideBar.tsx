'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Home, Compass, PlusCircle,
  ClipboardList, Building2, UserCircle, Trophy, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { UserContext } from '@/components/AppShell';

interface UserContextWithAuth extends UserContext {
  isAuthenticated: boolean;
}

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: { label: string; variant: 'organizer' | 'judge' | 'debater' };
};

type Section = { title: string; items: Item[] };

function buildSidebarSections(userContext: UserContextWithAuth): Section[] {
  // Unauthenticated users get a minimal sidebar
  if (!userContext.isAuthenticated) {
    return [
      {
        title: 'Overview',
        items: [
          { label: 'Home', href: '/tournaments', icon: Home },
          { label: 'Help Center', href: '/docs', icon: BookOpen },
        ],
      },
      {
        title: 'Tournaments',
        items: [
          { label: 'Browse', href: '/tournaments', icon: Compass },
        ],
      },
    ];
  }

  const sections: Section[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Home', href: '/', icon: Home },
        { label: 'My Profile', href: '/me', icon: UserCircle },
        { label: 'Institutions', href: '/institutions', icon: Building2 },
        { label: 'Help Center', href: '/docs', icon: BookOpen },
      ],
    },
    {
      title: 'Tournaments',
      items: [
        { label: 'Browse', href: '/tournaments', icon: Compass },
        { label: 'Create Tournament', href: '/tournaments/new', icon: PlusCircle },
      ],
    },
  ];

  // My Tournaments section
  if (userContext.activeTournaments.length > 0) {
    const roleVariantMap = {
      ORGANIZER: 'organizer',
      JUDGE: 'judge',
      DEBATER: 'debater',
    } as const;

    sections.push({
      title: 'My Tournaments',
      items: userContext.activeTournaments.map((t) => ({
        label: t.name,
        href: `/tournaments/${t.id}`,
        icon: Trophy,
        badge: {
          label: t.role.charAt(0) + t.role.slice(1).toLowerCase(),
          variant: roleVariantMap[t.role],
        },
      })),
    });
  }

  // Judging section — show if user has any JUDGE participations
  const hasJudgeRole = userContext.activeTournaments.some((t) => t.role === 'JUDGE');
  if (hasJudgeRole) {
    sections.push({
      title: 'Judging',
      items: [
        { label: 'My Assignments', href: '/judging/assignments', icon: ClipboardList },
      ],
    });
  }

  return sections;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  userContext?: UserContextWithAuth;
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  userContext,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [pathname]);

  const defaultContext: UserContext = {
    isAdmin: false,
    isAuthenticated: false,
    institutionCount: 0,
    activeTournaments: [],
  };
  const sections = buildSidebarSections(userContext ?? defaultContext);

  const flatItems = sections.flatMap((s) => s.items);
  const activeHref = flatItems
    .map((i) => i.href)
    .sort((a, b) => b.length - a.length)
    .find((h) => pathname === h || pathname?.startsWith(h + '/')) || null;

  const sidebarContent = (
    <nav className="flex flex-col gap-4 lg:gap-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-1.5 lg:px-2 pb-1.5 lg:pb-2 text-[10px] lg:text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            {section.title}
          </p>
          <ul className="space-y-0.5 lg:space-y-1">
            {section.items.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between rounded-lg lg:rounded-xl px-1.5 lg:px-2 py-1.5 lg:py-2 text-xs lg:text-sm transition',
                      active
                        ? 'bg-foreground/10 text-foreground'
                        : 'text-foreground/80 hover:bg-foreground/5 hover:text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-1.5 lg:gap-2.5 min-w-0">
                      <Icon className={cn('h-3.5 w-3.5 lg:h-4 lg:w-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground/80')} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && (
                      <Badge variant={item.badge.variant} className="ml-1 text-[9px] px-1 py-0 h-4">
                        {item.badge.label}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  if (!isMounted) {
    return (
      <aside className="hidden md:block md:w-[220px] lg:w-[260px] bg-surface-1">
        <div className="sticky top-12 sm:top-14 h-[calc(100dvh-48px)] sm:h-[calc(100dvh-56px)] overflow-y-auto px-2 lg:px-3 py-3 lg:py-4">
          {sidebarContent}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block md:w-[220px] lg:w-[260px] bg-surface-1">
        <div className="sticky top-12 sm:top-14 h-[calc(100dvh-48px)] sm:h-[calc(100dvh-56px)] overflow-y-auto px-2 lg:px-3 py-3 lg:py-4">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
        <SheetContent side="left" className="w-[280px] p-0 bg-surface-1 border-r border-border">
          <SheetHeader className="px-4 py-4 border-b border-border">
            <SheetTitle className="text-foreground text-lg font-semibold">Menu</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100vh-80px)] px-3 py-4">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
