'use client';

import { useState } from 'react';
import { AuthDesignPodium } from '@/components/auth/AuthDesignPodium';
import { AuthDesignArena } from '@/components/auth/AuthDesignArena';
import { AuthDesignChamber } from '@/components/auth/AuthDesignChamber';
import { AuthDesignSpotlight } from '@/components/auth/AuthDesignSpotlight';
import { AuthDesignVersus } from '@/components/auth/AuthDesignVersus';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const designs = [
  { name: 'The Podium', component: AuthDesignPodium },
  { name: 'The Arena', component: AuthDesignArena },
  { name: 'The Chamber', component: AuthDesignChamber },
  { name: 'The Spotlight', component: AuthDesignSpotlight },
  { name: 'Versus', component: AuthDesignVersus },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [activeDesign, setActiveDesign] = useState(0);
  const Design = designs[activeDesign].component;

  const prev = () => setActiveDesign((i) => (i - 1 + designs.length) % designs.length);
  const next = () => setActiveDesign((i) => (i + 1) % designs.length);

  return (
    <div className="relative min-h-screen">
      <Design>{children}</Design>

      {/* ── Design Switcher Pill ── */}
      <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-border/40 bg-surface-2/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
          {/* Prev arrow */}
          <button
            onClick={prev}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            aria-label="Previous design"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Design buttons */}
          {designs.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setActiveDesign(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                i === activeDesign
                  ? 'bg-brand text-brand-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-surface-3 hover:text-foreground'
              }`}
            >
              <span className="hidden sm:inline">{d.name}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}

          {/* Next arrow */}
          <button
            onClick={next}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            aria-label="Next design"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Current design label on mobile */}
        <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground sm:hidden">
          {designs[activeDesign].name} ({activeDesign + 1}/{designs.length})
        </p>
      </div>
    </div>
  );
}
