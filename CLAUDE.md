# Debatera

A full-stack debate tournament management platform. Handles tournament creation, team registration, real-time video debates (via Stream SDK), judging/ballots, and standings.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript 5) |
| Styling | Tailwind CSS 4, ShadCN components, Radix UI primitives |
| Database | PostgreSQL + Prisma 7 (native `pg` adapter) |
| Auth | Clerk v6 (user sync + webhooks via Svix) |
| Video | Stream SDK (`@stream-io/video-react-sdk`) |
| Validation | Zod 4 |
| Testing | Vitest |

## Key Directories

```
src/
  app/
    (auth)/          # Sign-in / sign-up pages
    (main)/          # Authenticated app shell
      (home)/        # Dashboard, tournaments, institutions, ballots
      api/           # REST API routes (ballots, debates, stream, tournaments, etc.)
    (portal)/        # Token-gated judge portal
  actions/           # Next.js Server Actions (mutations only)
  lib/
    prisma.ts        # Singleton Prisma client with pg connection pool
    ensureUser.ts    # Clerk → DB user sync (called in root layout)
    ballots/         # Ballot creation, auth, result computation
    debates/         # Debate queries and operations
    domains/         # Cross-cutting domain logic (standings, reporting)
    guards/          # Pre-condition assertions (registration open, team size)
    services/        # Business logic services (e.g., MVP)
    validations/     # Shared Zod schemas
  components/        # React components (UI primitives + domain components)
prisma/
  schema.prisma      # Single source of truth for DB schema
  migrations/        # Prisma migration history
scripts/             # One-off data backfill scripts (run with tsx)
```

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # prisma migrate deploy + next build
npm run start        # Start production server
npm run lint         # ESLint
npm run seed         # Seed DB: tsx prisma/seed.ts
npm run backfill:user-names  # One-off backfill script
```

> `postinstall` auto-runs `prisma generate` after `npm install`.

## Environment Variables

Requires `DATABASE_URL`, Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`), Stream keys, and Svix webhook secret. Check `.env.example` or deployment config for full list.

## Database

Schema: `prisma/schema.prisma`

Core model groups:
- **Users/Auth**: `User` (Clerk-synced), `InstitutionMember`, `InstitutionInvitation`
- **Tournaments**: `Tournament`, `TournamentSettings`, `TournamentRound`, `TournamentDebate`
- **Participants**: `TournamentParticipant`, `TournamentTeam`, `TournamentTeamMember`
- **Judging**: `TournamentDebateJudge`, `Ballot`, `BallotSpeech`, `DebateResult`
- **Real-time**: `VideoCall`, `DebateStopwatch`
- **Other**: `Venue`, `VenueCategory`, `Notification`

## Additional Documentation

| File | When to check |
|---|---|
| `.claude/docs/architectural_patterns.md` | Server actions, API routes, auth guards, data fetching conventions |
