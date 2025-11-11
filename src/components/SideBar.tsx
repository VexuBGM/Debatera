'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, MessagesSquare, Users, CalendarDays, Inbox,
  MessageCircle, Compass, Trophy, PlusCircle, ClipboardList,
  Send, ShieldCheck, BarChart2, ShieldAlert, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
};

type Section = { title: string; items: Item[] };

const sections: Section[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Home', href: '/', icon: Home }, 
      { label: 'Institutions', href: '/institutions', icon: Building2 }, // Institutions (schools/organizations) that manage teams and members
      { label: 'Debates', href: '/debates', icon: MessagesSquare, count: 7 }, // List (& calendar) of debates you can see (by role/visibility). // Filters: today, upcoming, past; my team; practice vs tournament; status (live/starting/scheduled). // Row actions: Join (if live/starting), View details (speakers, judges, rules), Copy invite.
      { label: 'Teams', href: '/teams', icon: Users }, // Your teams + directory. // Team page: roster, coach, rating/Elo (future), past & upcoming debates, private team notes and files. // Actions (team lead/admin): invite members, set lineup, manage roles.
      { label: 'Schedule', href: '/schedule', icon: CalendarDays }, // Personal calendar (aggregates tournaments, debates, judge slots). // Week/Month switch; export to Google/ICS; availability toggles.
      { label: 'Messages', href: '/messages', icon: Inbox }, // In-app messaging: DMs, team channels, tournament announcements. // Mentions, attachments, message search.
      { label: 'Feedback', href: '/feedback', icon: MessageCircle }, // Feedback you received as a debater and feedback you wrote as a judge. // Per-debate sheets, scores, comments, trends; export PDF/CSV.
    ],
  },
  {
    title: 'Tournaments',
    items: [
      { label: 'Browse', href: '/tournaments', icon: Compass }, // Public directory with filters (country, dates, format, status: Verified/Pending/Unverified). // Cards show rounds count, dates, verification badge.
      { label: 'My Tournaments', href: '/tournaments/me', icon: Trophy }, // You as organizer/judge/participant: management shortcuts, drafts, registrations.
      { label: 'Create Tournament', href: '/tournaments/new', icon: PlusCircle }, // Same as top-nav CTA (wizard). Only visible/enabled for users with creation rights.
    ],
  },
  {
    title: 'Judging',
    items: [
      { label: 'Assignments', href: '/judging/assignments', icon: ClipboardList, count: 2 }, // Your assigned debates (status: to brief, call open, to submit feedback). // One-click Join as judge; briefing docs; conflict checks.
      { label: 'Submit Feedback', href: '/judging/submit', icon: Send, count: 4 }, // Inbox of debates awaiting your ballot/sheet. // Structured rubric (speeches/categories), comments, ranks, speaker points; submit/undo; time limits if configured.
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Verify Tournaments', href: '/admin/verify', icon: ShieldCheck, count: 3 }, // Queue of submitted tournaments awaiting verification. // Checklist: organizer identity, ruleset, schedule, anti-abuse. Approve/Reject with notes.
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 }, // Platform metrics: active users, debate minutes, region usage, average judges per round, reliability. // Tournament-level analytics for organizers.
      { label: 'Moderation', href: '/admin/moderation', icon: ShieldAlert }, //  Reports, bans/timeouts, room audit logs, permission overrides. // Reported content: debates, messages, users. // Actions: warn, suspend, ban; note history; filter by type, date, status.
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block lg:w-[260px] bg-[#050E22]">
      <div className="sticky top-14 h-[calc(100dvh-56px)] overflow-y-auto px-3 py-4">
        <nav className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center justify-between rounded-xl px-2 py-2 text-sm transition',
                          active
                            ? 'bg-white/10 text-white'
                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className={cn('h-4 w-4', active ? 'text-cyan-400' : 'text-white/60 group-hover:text-white/80')} />
                          <span>{item.label}</span>
                        </span>
                        {typeof item.count === 'number' && (
                          <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-white/10 px-1.5 text-xs font-semibold text-white/80">
                            {item.count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
