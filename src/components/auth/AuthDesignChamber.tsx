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
    <div className="flex min-h-screen">
      {/* Left — Clerk form on dark surface */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-[55%]">
        {/* Background subtle pattern */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.015]"
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

        <div className="relative z-10 w-full max-w-md" style={{ animation: 'slide-up 0.5s ease-out' }}>
          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center gap-3">
              <Image src="/icons/debatera.svg" alt="Debatera" width={26} height={26} />
              <span className="font-heading text-lg font-bold tracking-tight">Debatera</span>
            </div>
            <div className="mx-auto mb-2 h-px w-16 bg-gradient-to-r from-transparent via-role-judge/40 to-transparent" />
            <p className="text-sm text-muted-foreground italic">
              Where great arguments are forged
            </p>
          </div>

          {children}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Back to home
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Gold-accented timeline panel */}
      <div className="relative hidden w-[45%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{
          background: 'linear-gradient(135deg, oklch(0.16 0.02 250), oklch(0.12 0.015 60))',
        }}
      >
        {/* Subtle gold radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,oklch(0.75_0.16_75/0.06),transparent)]" />

        {/* Decorative corner ornaments */}
        <div className="absolute left-6 top-6 h-16 w-16 border-l-2 border-t-2 border-role-judge/20 rounded-tl-lg" />
        <div className="absolute right-6 top-6 h-16 w-16 border-r-2 border-t-2 border-role-judge/20 rounded-tr-lg" />
        <div className="absolute bottom-6 left-6 h-16 w-16 border-b-2 border-l-2 border-role-judge/20 rounded-bl-lg" />
        <div className="absolute bottom-6 right-6 h-16 w-16 border-b-2 border-r-2 border-role-judge/20 rounded-br-lg" />

        {/* Content */}
        <div className="relative z-10 max-w-xs px-8">
          <h2 className="mb-2 font-heading text-2xl font-bold tracking-tight">
            Your Journey
          </h2>
          <p className="mb-10 text-sm text-muted-foreground">
            From registration to championship
          </p>

          {/* Timeline */}
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gradient-to-b from-brand/40 via-role-judge/30 to-yellow-500/40" />

            {milestones.map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="relative flex items-center gap-4 py-4"
                  style={{ animation: 'slide-up 0.5s ease-out', animationDelay: `${0.1 + i * 0.1}s`, animationFillMode: 'both' }}
                >
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/40 bg-surface-2 ${m.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom decorative element */}
          <div className="mt-10 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-role-judge/30 to-transparent" />
            <Gavel className="h-4 w-4 text-role-judge/40" />
            <div className="h-px flex-1 bg-gradient-to-l from-role-judge/30 to-transparent" />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground/60 italic">
            &ldquo;The first duty of a wise advocate is to convince his opponents that he understands their arguments.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
