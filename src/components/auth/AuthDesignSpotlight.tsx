'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Mic2 } from 'lucide-react';

export function AuthDesignSpotlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[oklch(0.08_0.01_250)]">
      {/* Main spotlight cone — wide, bright, visible */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: '200%',
          height: '110%',
          background: `conic-gradient(
            from 180deg at 50% 0%,
            transparent 40%,
            oklch(0.85 0.15 195 / 0.04) 44%,
            oklch(0.85 0.15 195 / 0.12) 47%,
            oklch(0.90 0.12 195 / 0.22) 49.5%,
            oklch(1 0 0 / 0.25) 50%,
            oklch(0.90 0.12 195 / 0.22) 50.5%,
            oklch(0.85 0.15 195 / 0.12) 53%,
            oklch(0.85 0.15 195 / 0.04) 56%,
            transparent 60%
          )`,
          animation: 'spotlight-pulse 4s ease-in-out infinite',
        }}
      />

      {/* Secondary warm spotlight — offset slightly */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: '200%',
          height: '100%',
          background: `conic-gradient(
            from 180deg at 50% 0%,
            transparent 43%,
            oklch(0.80 0.14 75 / 0.03) 46%,
            oklch(0.80 0.14 75 / 0.08) 49%,
            oklch(0.80 0.14 75 / 0.10) 50%,
            oklch(0.80 0.14 75 / 0.08) 51%,
            oklch(0.80 0.14 75 / 0.03) 54%,
            transparent 57%
          )`,
          animation: 'spotlight-pulse 4s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />

      {/* Pool of light on the "stage floor" under the form */}
      <div
        className="pointer-events-none absolute bottom-[10%] left-1/2 -translate-x-1/2 h-[200px] w-[500px] rounded-full blur-[80px]"
        style={{ background: 'oklch(0.80 0.12 195 / 0.10)' }}
      />

      {/* Floor reflection */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-brand/[0.04] to-transparent" />

      {/* Stage floor line */}
      <div className="pointer-events-none absolute bottom-[15%] left-1/2 -translate-x-1/2 h-px w-[50%] bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      {/* Light source dot at the very top */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white/60 blur-sm" />

      {/* Microphone icon above the form */}
      <div
        className="relative z-10 mb-6 flex flex-col items-center"
        style={{ animation: 'slide-up 0.4s ease-out' }}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-brand/15 bg-brand/5 shadow-[0_0_40px_oklch(0.72_0.19_195/0.1)]">
          <Mic2 className="h-7 w-7 text-brand" />
        </div>
        <div className="flex items-center gap-2.5">
          <Image src="/icons/debatera.svg" alt="Debatera" width={22} height={22} />
          <span className="font-heading text-lg font-bold tracking-tight">Debatera</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Step into the spotlight</p>
      </div>

      {/* Clerk form */}
      <div
        className="relative z-10 w-full max-w-md px-4"
        style={{ animation: 'slide-up 0.6s ease-out', animationDelay: '0.15s', animationFillMode: 'both' }}
      >
        <div className="rounded-2xl border border-border/20 bg-card/40 p-1 shadow-[0_0_60px_oklch(0.72_0.19_195/0.05)] backdrop-blur-sm">
          {children}
        </div>
      </div>

      {/* "Audience" dots at the bottom */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-foreground/[0.06]"
            style={{
              animation: 'float 4s ease-in-out infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Back to home
        </Link>
      </p>
    </div>
  );
}
