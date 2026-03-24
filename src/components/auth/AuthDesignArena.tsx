'use client';

import Image from 'next/image';
import Link from 'next/link';

const debateTerms = [
  'Rebuttal', 'Cross-Examination', 'Resolution', 'Affirmative',
  'Negative', 'Contention', 'Evidence', 'Rhetoric',
  'Argument', 'Verdict', 'Proposition', 'Opposition',
];

export function AuthDesignArena({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-1">
      {/* Animated gradient orbs — larger, brighter */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-brand/15 blur-[120px]"
        style={{ animation: 'orb-drift 12s ease-in-out infinite' }}
      />
      <div
        className="pointer-events-none absolute -right-32 top-1/4 h-[500px] w-[500px] rounded-full bg-purple-500/12 blur-[120px]"
        style={{ animation: 'orb-drift 15s ease-in-out infinite', animationDelay: '3s' }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 h-[550px] w-[550px] rounded-full bg-role-debater/12 blur-[120px]"
        style={{ animation: 'orb-drift 18s ease-in-out infinite', animationDelay: '6s' }}
      />

      {/* Scattered debate terms */}
      {debateTerms.map((term, i) => {
        const positions = [
          'top-[8%] left-[5%]', 'top-[12%] right-[8%]', 'top-[25%] left-[12%]',
          'top-[20%] right-[15%]', 'top-[45%] left-[3%]', 'top-[40%] right-[5%]',
          'top-[60%] left-[8%]', 'top-[65%] right-[10%]', 'bottom-[25%] left-[15%]',
          'bottom-[20%] right-[12%]', 'bottom-[8%] left-[10%]', 'bottom-[10%] right-[8%]',
        ];
        return (
          <span
            key={term}
            className={`pointer-events-none absolute text-xs font-medium tracking-widest uppercase text-foreground/[0.04] select-none ${positions[i]}`}
            style={{
              animation: 'float 8s ease-in-out infinite',
              animationDelay: `${i * 0.7}s`,
            }}
          >
            {term}
          </span>
        );
      })}

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md px-4" style={{ animation: 'slide-up 0.6s ease-out' }}>
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 shadow-lg shadow-brand/5">
            <Image src="/icons/debatera.svg" alt="Debatera" width={28} height={28} />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight">Debatera</span>
          <p className="text-sm text-muted-foreground">Your arena for competitive debate</p>
        </div>

        {/* Clerk form with glass effect + outer glow */}
        <div className="rounded-2xl border border-brand/20 bg-card/80 p-1 shadow-[0_0_80px_oklch(0.72_0.19_195/0.12),0_0_30px_oklch(0.65_0.19_250/0.08)] backdrop-blur-xl ring-1 ring-white/5">
          {children}
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
