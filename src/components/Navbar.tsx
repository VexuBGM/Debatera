'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import CreateMeetingButton from './CreateMeetingButton';

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1530]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-3 md:px-6">
        <div className="flex h-14 items-center gap-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/icons/debatera.svg"
              alt="Logo"
              width={40}
              height={40}
            />
            <span className="text-lg font-semibold text-white">Debatera</span>
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
              Beta
            </span>
          </Link>

          {/* Search - Global search across debates, teams, tournaments, people. --> Results grouped into tabs; keyboard nav; quick “Join”/“Open” actions inline. */}
          <div className="ml-2 hidden flex-1 items-center md:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                className="h-9 w-full rounded-lg border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
                placeholder="Search debates, teams, tournaments…"
              />
            </div>
          </div>

          {/* Right side CTAs - Buttons for creating a tournament or a debate --> the debate is Quick ad-hoc room creation for your team or training */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              className="hidden sm:flex gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Link href="/tournaments/new">
                <Plus className="h-4 w-4" />
                Create Tournament
              </Link>
            </Button>

            <CreateMeetingButton />

            {/* Notifications - Invites, judge assignments, round pairings, schedule changes, feedback received, moderation pings. */}

            <Button
              size="icon"
              variant="ghost"
              className="rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>

            {/* User menu */}

            <SignedIn>
              <div className="ml-1">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonOuterIdentifier: 'hidden md:flex text-white/80',
                    },
                  }}
                />
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button className="rounded-lg bg-white text-black hover:bg-white/90">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      {/* Small-screen search under bar */}
      <div className="block md:hidden border-t border-white/10 px-3 pb-3 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            className="h-9 w-full rounded-lg border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
            placeholder="Search…"
          />
        </div>
      </div>
    </header>
  );
}
