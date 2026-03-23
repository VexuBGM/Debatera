'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LandingNav } from './LandingNav';
import {
  Trophy,
  Users,
  Video,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Scale,
  Mic2,
  Globe,
  Building2,
  Gavel,
  CheckCircle,
  Timer,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Trophy,
    title: 'Run Tournaments',
    description:
      'Set up multi-round tournaments with automated draws, flexible formats, and a real-time organizer dashboard.',
    color: 'bg-yellow-500/20 text-yellow-500',
  },
  {
    icon: Video,
    title: 'Debate Live',
    description:
      'Built-in HD video calls with synchronized speaker timers — no third-party apps required.',
    color: 'bg-blue-500/20 text-blue-500',
  },
  {
    icon: BarChart3,
    title: 'Track Standings',
    description:
      'Automated tabulation, speaker-point rankings, and live leaderboards updated after every round.',
    color: 'bg-brand/20 text-brand',
  },
  {
    icon: Users,
    title: 'Build Teams',
    description:
      'Create institutions, invite members, form teams, and register for tournaments as a group.',
    color: 'bg-green-500/20 text-green-500',
  },
];

const highlights = [
  { icon: Gavel, label: 'Digital Ballots' },
  { icon: Timer, label: 'Debate Timers' },
  { icon: Building2, label: 'Institution Management' },
  { icon: Globe, label: 'Remote Debates' },
];

const testimonials = [
  {
    quote:
      'Debatera transformed how we run our annual inter-university debate. What used to take weeks of spreadsheet work now happens in a few clicks.',
    author: 'Sarah K.',
    role: 'Tournament Director',
  },
  {
    quote:
      'The live video integration is a game-changer. Our international members can finally compete without expensive travel.',
    author: 'Marcus T.',
    role: 'Debate Society President',
  },
  {
    quote:
      'As a judge, I love the digital ballot system. Clean, fast, and my feedback reaches debaters instantly.',
    author: 'Dr. Liu W.',
    role: 'Senior Judge',
  },
];

const stats = [
  { value: '50+', label: 'Tournaments hosted' },
  { value: '500+', label: 'Active debaters' },
  { value: '1 000+', label: 'Debates completed' },
  { value: '5 000+', label: 'Ballots submitted' },
];

/* ------------------------------------------------------------------ */
/*  Floating card used in the hero illustration                        */
/* ------------------------------------------------------------------ */

function FloatingCard({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  className,
  delay = '0s',
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  subtitle: string;
  className: string;
  delay?: string;
}) {
  return (
    <div
      className={`absolute bg-card border border-border/80 rounded-xl p-4 shadow-lg ${className}`}
      style={{ animation: `float 6s ease-in-out infinite`, animationDelay: delay }}
    >
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Subtle radial glow behind the hero */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,oklch(0.72_0.19_195/0.06),transparent)]" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-medium text-brand mb-8">
                <Globe className="h-3.5 w-3.5" />
                Built for debate communities worldwide
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading tracking-tight leading-[1.08]">
                Organize.
                <br />
                <span className="text-brand">Debate.</span>
                <br />
                Succeed.
              </h1>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                The complete platform for competitive debate&nbsp;&mdash; from tournament
                setup to final ballots, all in a single, seamless experience.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/sign-up">
                  <Button variant="brand" size="lg" className="px-7">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/tournaments">
                  <Button variant="outline" size="lg" className="px-7">
                    Explore Tournaments
                  </Button>
                </Link>
              </div>

              {/* Highlight chips */}
              <div className="mt-10 flex flex-wrap gap-2">
                {highlights.map(({ icon: HIcon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-1 text-xs text-muted-foreground"
                  >
                    <HIcon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — floating-card illustration */}
            <div className="relative hidden lg:block" aria-hidden="true">
              <div className="relative mx-auto w-full max-w-lg aspect-square">
                {/* Background ring */}
                <div className="absolute inset-8 rounded-full bg-linear-to-br from-brand/8 via-transparent to-purple-500/6 border border-brand/10" />

                <FloatingCard
                  icon={Trophy}
                  iconBg="bg-yellow-500/20 text-yellow-500"
                  title="National Championship"
                  subtitle="Round 3 in progress"
                  className="top-4 left-1/2 -translate-x-1/2 w-64"
                  delay="0s"
                />
                <FloatingCard
                  icon={Mic2}
                  iconBg="bg-green-500/20 text-green-500"
                  title="Live Debate"
                  subtitle="4 speakers connected"
                  className="top-[33%] right-0 w-56"
                  delay="1s"
                />
                <FloatingCard
                  icon={Scale}
                  iconBg="bg-purple-500/20 text-purple-500"
                  title="Ballot Submitted"
                  subtitle="Score: 78 / 100"
                  className="bottom-[25%] left-0 w-60"
                  delay="2s"
                />
                <FloatingCard
                  icon={MessageSquare}
                  iconBg="bg-brand/20 text-brand"
                  title="Judge Feedback"
                  subtitle={'"Excellent rebuttal!"'}
                  className="bottom-4 left-1/2 -translate-x-[25%] w-52"
                  delay="3s"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features — alternating rows ── */}
      <section className="py-24 sm:py-32 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-heading">
              Everything you need to compete
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              From creating a bracket to submitting the final ballot, Debatera covers every step.
            </p>
          </div>

          <div className="space-y-24">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const reversed = index % 2 === 1;
              return (
                <div
                  key={feature.title}
                  className={`flex flex-col gap-10 items-center ${
                    reversed ? 'md:flex-row-reverse' : 'md:flex-row'
                  }`}
                >
                  <div className="flex-1 max-w-md">
                    <div className={`inline-flex rounded-xl p-3 mb-4 ${feature.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading">{feature.title}</h3>
                    <p className="mt-3 text-muted-foreground text-lg leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="aspect-video rounded-2xl border border-border/40 bg-surface-2/60 flex items-center justify-center">
                      <Icon className="h-14 w-14 text-muted-foreground/15" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      {/* TODO: Uncomment when real data is available
      <section className="border-y border-border/40 py-16 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl sm:text-4xl font-bold font-heading text-brand">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
      */}

      {/* ── Testimonials ── */}
      {/* TODO: Uncomment when real testimonials are available
      <section className="py-24 sm:py-32 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-center mb-14">
            Trusted by Debate Communities
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.author}
                className="rounded-2xl border border-border/40 bg-card p-6 flex flex-col"
              >
                <blockquote className="flex-1 text-muted-foreground leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 pt-4 border-t border-border/40">
                  <p className="font-semibold text-sm">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* ── CTA ── */}
      <section className="py-24 sm:py-32 px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-heading">
            Ready to elevate your debate?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Free to start, powerful enough for any tournament.
          </p>

          <Link href="/sign-up">
            <Button variant="brand" size="lg" className="mt-8 px-10 text-base">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <div className="mt-6 flex items-center justify-center gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" /> Free to use
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" /> No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" /> Setup in minutes
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/icons/debatera.svg" alt="" width={20} height={20} />
            <span className="font-heading font-semibold text-sm">Debatera</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Debatera. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
