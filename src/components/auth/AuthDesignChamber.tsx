'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Gavel, Users, FileText, BarChart3, Shield } from 'lucide-react';

const milestones = [
  { icon: Users, label: 'Register your team', color: 'text-brand' },
  { icon: FileText, label: 'Enter the tournament', color: 'text-role-organizer' },
  { icon: Gavel, label: 'Debate & get judged', color: 'text-role-judge' },
  { icon: BarChart3, label: 'Climb the standings', color: 'text-role-debater' },
  { icon: Shield, label: 'Win the championship', color: 'text-yellow-500' },
];

export function AuthDesignChamber({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-1">
      {/* Left — form panel */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-[55%]">
        {/* Background subtle vertical lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 60px,
              oklch(0.75 0.16 75) 60px,
              oklch(0.75 0.16 75) 61px
            )`,
          }}
        />

        <div
          className="relative z-10 flex w-full max-w-[420px] flex-col items-center"
          style={{ animation: 'slide-up 0.5s ease-out' }}
        >
          {/* Logo + tagline */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2.5">
              <Image src="/icons/debatera.svg" alt="Debatera" width={26} height={26} />
              <span className="font-heading text-lg font-bold tracking-tight">Debatera</span>
            </div>
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-role-judge/40 to-transparent" />
          </div>

          {/* Clerk form — now transparent, blends with the dark surface */}
          <div className="w-full rounded-xl border border-white/[0.06] bg-surface-2/50 px-2 py-1 backdrop-blur-sm">
            {children}
          </div>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            <Link href="/" className="underline underline-offset-4 transition-colors hover:text-foreground">
              Back to home
            </Link>
          </p>
        </div>
      </div>

      {/* Right — gold-accented timeline panel */}
      <div
        className="relative hidden w-[45%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{
          background: 'linear-gradient(145deg, oklch(0.14 0.015 250), oklch(0.11 0.012 60))',
        }}
      >
        {/* Subtle gold radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,oklch(0.75_0.16_75/0.05),transparent)]" />

        {/* Corner ornaments */}
        <div className="absolute left-6 top-6 h-14 w-14 rounded-tl-lg border-l-2 border-t-2 border-role-judge/15" />
        <div className="absolute right-6 top-6 h-14 w-14 rounded-tr-lg border-r-2 border-t-2 border-role-judge/15" />
        <div className="absolute bottom-6 left-6 h-14 w-14 rounded-bl-lg border-b-2 border-l-2 border-role-judge/15" />
        <div className="absolute bottom-6 right-6 h-14 w-14 rounded-br-lg border-b-2 border-r-2 border-role-judge/15" />

        {/* Divider between panels */}
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-xs px-8">
          <h2 className="mb-1 font-heading text-2xl font-bold tracking-tight">Your Journey</h2>
          <p className="mb-10 text-sm text-muted-foreground">From registration to championship</p>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute bottom-2 left-[17px] top-2 w-px bg-gradient-to-b from-brand/30 via-role-judge/25 to-yellow-500/30" />

            {milestones.map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="relative flex items-center gap-4 py-3.5"
                  style={{
                    animation: 'slide-up 0.5s ease-out',
                    animationDelay: `${0.15 + i * 0.1}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-surface-2 ${m.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground/75">{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom quote */}
          <div className="mt-10 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-role-judge/25 to-transparent" />
            <Gavel className="h-3.5 w-3.5 text-role-judge/30" />
            <div className="h-px flex-1 bg-gradient-to-l from-role-judge/25 to-transparent" />
          </div>
          <p className="mt-4 text-center text-xs italic text-muted-foreground/50">
            &ldquo;The first duty of a wise advocate is to convince his opponents that he
            understands their arguments.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
