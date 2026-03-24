'use client';

import Image from 'next/image';
import Link from 'next/link';

const propPoints = ['Opening Statement', 'Evidence', 'Rebuttal', 'Closing'];
const oppPoints = ['Cross-Examination', 'Counter-Argument', 'Defense', 'Summary'];

export function AuthDesignVersus({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Left half — Proposition (teal/brand) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/[0.06] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_0%_50%,oklch(0.72_0.19_195/0.08),transparent)]" />

        {/* "PROP" watermark */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 -rotate-90 select-none">
          <span className="font-heading text-[8rem] font-black leading-none tracking-tighter text-brand/[0.04]">
            PROP
          </span>
        </div>

        {/* Proposition talking points */}
        <div className="absolute left-8 top-8 space-y-3 hidden xl:block">
          {propPoints.map((point, i) => (
            <div
              key={point}
              className="flex items-center gap-2 opacity-0"
              style={{
                animation: 'slide-up 0.5s ease-out forwards',
                animationDelay: `${0.3 + i * 0.15}s`,
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-brand/40" />
              <span className="text-xs font-medium text-brand/30">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right half — Opposition (warm/orange) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2">
        <div className="absolute inset-0 bg-gradient-to-l from-orange-500/[0.06] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_100%_50%,oklch(0.70_0.18_45/0.08),transparent)]" />

        {/* "OPP" watermark */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 select-none">
          <span className="font-heading text-[8rem] font-black leading-none tracking-tighter text-orange-500/[0.04]">
            OPP
          </span>
        </div>

        {/* Opposition talking points */}
        <div className="absolute right-8 bottom-8 space-y-3 hidden xl:block">
          {oppPoints.map((point, i) => (
            <div
              key={point}
              className="flex items-center justify-end gap-2 opacity-0"
              style={{
                animation: 'slide-up 0.5s ease-out forwards',
                animationDelay: `${0.3 + i * 0.15}s`,
              }}
            >
              <span className="text-xs font-medium text-orange-400/30">{point}</span>
              <div className="h-1.5 w-1.5 rounded-full bg-orange-400/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Center divider line */}
      <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
        <div className="h-full w-px bg-gradient-to-b from-transparent via-border/40 to-transparent" />
      </div>

      {/* VS badge */}
      <div className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/30 bg-surface-2/80 shadow-lg backdrop-blur-sm">
          <span className="font-heading text-xs font-bold text-muted-foreground">VS</span>
        </div>
      </div>

      {/* Center content — form */}
      <div className="relative z-10 w-full max-w-md px-4" style={{ animation: 'slide-up 0.5s ease-out' }}>
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            <Image src="/icons/debatera.svg" alt="Debatera" width={24} height={24} />
            <span className="font-heading text-lg font-bold tracking-tight">Debatera</span>
          </div>
          <p className="text-sm text-muted-foreground">Pick your side. Make your case.</p>
        </div>

        {/* Clerk form with gradient border effect */}
        <div className="relative rounded-2xl p-px"
          style={{
            background: 'linear-gradient(135deg, oklch(0.72 0.19 195 / 0.3), oklch(0.20 0 0 / 0.5) 50%, oklch(0.70 0.18 45 / 0.3))',
          }}
        >
          <div className="rounded-2xl bg-card/95 p-1 backdrop-blur-sm">
            {children}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
