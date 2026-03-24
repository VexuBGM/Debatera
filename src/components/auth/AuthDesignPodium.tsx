'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Gavel, Mic2, Scale, Quote } from 'lucide-react';

const quotes = [
  { text: 'The aim of argument should not be victory, but progress.', author: 'Joseph Joubert' },
  { text: 'In a democracy, dissent is an act of faith.', author: 'J. William Fulbright' },
  { text: 'He who knows only his own side of the case knows little of that.', author: 'John Stuart Mill' },
];

function FloatingIcon({
  icon: Icon,
  className,
  delay,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  delay: string;
  color: string;
}) {
  return (
    <div
      className={`absolute rounded-xl border border-border/30 bg-surface-2/80 p-3 shadow-lg backdrop-blur-sm ${className}`}
      style={{ animation: 'float 6s ease-in-out infinite', animationDelay: delay }}
    >
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
  );
}

export function AuthDesignPodium({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding & quotes */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-1 p-10 lg:flex">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_80%,oklch(0.72_0.19_195/0.08),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_20%,oklch(0.65_0.19_250/0.06),transparent)]" />

        {/* Top — Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <Image src="/icons/debatera.svg" alt="Debatera" width={28} height={28} />
          <span className="font-heading text-lg font-bold tracking-tight">Debatera</span>
        </div>

        {/* Center — Quote rotator */}
        <div className="relative z-10 max-w-md">
          <Quote className="mb-4 h-10 w-10 text-brand/30" />
          <div className="space-y-8">
            {quotes.map((q, i) => (
              <div
                key={q.author}
                className="opacity-0"
                style={{
                  animation: `quote-fade 9s ease-in-out infinite`,
                  animationDelay: `${i * 3}s`,
                }}
              >
                <p className="text-xl font-light leading-relaxed text-foreground/90 italic">
                  &ldquo;{q.text}&rdquo;
                </p>
                <p className="mt-3 text-sm font-medium text-muted-foreground">&mdash; {q.author}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Floating debate icons */}
        <FloatingIcon icon={Trophy} className="right-16 top-24" delay="0s" color="text-yellow-500" />
        <FloatingIcon icon={Gavel} className="right-32 top-1/2" delay="1.5s" color="text-purple-400" />
        <FloatingIcon icon={Mic2} className="right-12 bottom-32" delay="3s" color="text-green-400" />
        <FloatingIcon icon={Scale} className="left-[60%] bottom-48" delay="4.5s" color="text-brand" />

        {/* Bottom — tagline */}
        <div className="relative z-10">
          <p className="text-sm text-muted-foreground">
            The complete platform for competitive debate.
          </p>
        </div>
      </div>

      {/* Right panel — Clerk form */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Image src="/icons/debatera.svg" alt="Debatera" width={24} height={24} />
          <span className="font-heading text-base font-bold">Debatera</span>
        </div>

        <div style={{ animation: 'slide-up 0.5s ease-out' }}>{children}</div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
