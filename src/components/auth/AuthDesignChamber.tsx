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
      {/* Left — form panel (1/3) */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/3">
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
          className="relative z-10 flex w-full max-w-sm flex-col items-center"
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

      {/* Right — image + timeline panel (2/3) */}
      <div className="relative hidden w-2/3 flex-col items-center justify-center overflow-hidden lg:flex">
        {/* Background image — shifted right so the speaker isn't dead-center behind text */}
        <Image
          src="/images/debater-auth.png"
          alt=""
          fill
          className="object-cover object-[65%_30%] scale-110"
          priority
        />

        {/* Layered darkening: uniform base + vignette edges + top/bottom fade */}
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_20%,rgba(0,0,0,0.6))]" />
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/50" />

        {/* Warm gold ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_45%,oklch(0.75_0.16_75/0.06),transparent)]" />

        {/* Divider between panels */}
        <div className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-white/8 to-transparent" />

        {/* Content card — frosted glass */}
        <div
          className="relative z-10 mx-8 w-full max-w-md rounded-2xl border border-white/8 bg-black/40 px-10 py-12 backdrop-blur-md"
          style={{ boxShadow: '0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
          <h2 className="mb-2 font-heading text-3xl font-bold tracking-tight text-white">
            Your Journey
          </h2>
          <p className="mb-10 text-sm text-white/50">From registration to championship</p>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute bottom-3 left-5 top-3 w-px bg-linear-to-b from-brand/40 via-role-judge/30 to-yellow-500/40" />

            {milestones.map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="relative flex items-center gap-5 py-4.5"
                  style={{
                    animation: 'slide-up 0.5s ease-out',
                    animationDelay: `${0.15 + i * 0.1}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 ${m.color}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[15px] font-medium text-white/85">{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom quote */}
          <div className="mt-10 flex items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-role-judge/25 to-transparent" />
            <Gavel className="h-3.5 w-3.5 text-role-judge/35" />
            <div className="h-px flex-1 bg-linear-to-l from-role-judge/25 to-transparent" />
          </div>
          <p className="mt-4 text-center text-[13px] leading-relaxed italic text-white/40">
            &ldquo;The first duty of a wise advocate is to convince his opponents that he
            understands their arguments.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
