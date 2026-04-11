# AGENTS.md

Repository guidance for Codex and other coding agents. Keep this file concise and agent-oriented; detailed product and architecture docs should stay in the existing Markdown files linked below.

## Project Overview

Debatera is a full-stack debate tournament management platform for organizers, institutions, judges, and debaters. It handles tournament creation, institution-based registration, participant and team management, rounds and pairings, Stream-powered online debate rooms, WSDC-style ballots, result computation, standings, and token-based judge portal access.

The product is in active development. The current core tournament loop is implemented and usable; older product notes may include future ideas that should not be treated as shipped behavior.

## Instruction Sources

- Treat this file as the Codex-facing project guide.
- Also read `CLAUDE.md` for the existing high-level project guidance, but do not edit it unless the user explicitly asks.
- For code conventions and architecture patterns, check:
  - `.claude/docs/conventions.md`
  - `.claude/docs/architectural_patterns.md`
  - `.claude/docs/tours.md` when working on onboarding tours
- For broader repo documentation, start with `README.md`, then use the focused docs under `docs/dev/` and `docs/product/`.

## Tech Stack

- Framework: Next.js 16 App Router, React 19, TypeScript 5
- Styling: Tailwind CSS 4, shadcn/ui patterns, Radix UI primitives
- Database: PostgreSQL with Prisma 7 and the native `pg` adapter
- Auth: Clerk v6, with Svix verification for Clerk webhooks
- Video: Stream Video SDK
- Validation: Zod 4
- Testing: Vitest

## Repository Map

- `src/app/` - Next.js routes, layouts, pages, and API routes
  - `src/app/(auth)/` - Clerk sign-in/sign-up pages
  - `src/app/(main)/` and `src/app/(main)/(home)/` - authenticated app shell and product pages
  - `src/app/(portal)/` - token-gated judge portal
  - `src/app/api/` - REST API routes and primary backend surface
- `src/actions/` - legacy Next.js Server Actions for selected mutations
- `src/components/` - UI primitives and domain components
- `src/lib/` - domain logic, services, guards, security helpers, Stream/portal integrations, validations
- `src/lib/domains/` - pure or mostly pure domain modules such as reporting, participants, and teams
- `src/lib/ballots/` - ballot authorization, creation, validation, modification requests, and result computation
- `src/lib/pairings/` - Swiss pairing logic and tests
- `src/lib/tournamentRounds/` - round and pairing orchestration
- `src/lib/tours/` - onboarding tour config and types
- `prisma/schema.prisma` - source of truth for the data model
- `prisma/migrations/` - committed Prisma migration history
- `scripts/` - one-off operational scripts
- `docs/dev/` - developer documentation
- `docs/product/` - product planning, audits, and user-facing notes

## Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Start production server after build: `npm run start`
- Lint: `npm run lint`
- Run all tests once: `npx vitest run`
- Run tests in watch mode: `npx vitest`
- Run a focused Vitest file or directory: `npx vitest run <path>`
- Open Prisma Studio: `npx prisma studio`
- Create/apply a local schema migration: `npx prisma migrate dev --name <migration-name>`
- Apply production migrations only: `npx prisma migrate deploy`
- Regenerate Prisma client if needed: `npx prisma generate`
- Backfill local user names from Clerk: `npm run backfill:user-names`

Notes:
- `postinstall` runs `prisma generate`.
- `npm run build` runs `prisma generate`, `prisma migrate deploy`, and `next build --turbopack`.
- `npm run seed` currently points at `prisma/seed.ts`, but the repo docs say no seed file/data exists. Verify before using it.

## Environment

Use `.env.example` as the authoritative env-var template.

Important variables:
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_STREAM_API_KEY`
- `STREAM_API_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `CLERK_WEBHOOK_SECRET`
- `PORTAL_TOKEN_TTL_DAYS`
- Clerk routing variables such as `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL`

Never expose server-only secrets with a `NEXT_PUBLIC_` prefix. In production, set `CLERK_WEBHOOK_SECRET`, configure `NEXT_PUBLIC_BASE_URL` accurately, and use SSL/pooling as appropriate for `DATABASE_URL`.

## Coding Expectations

- Prefer clear, boring, readable code over clever abstractions.
- Keep one responsibility per file; avoid dumping unrelated logic into generic helpers.
- Use descriptive names that explain domain intent.
- Avoid `any`; use domain-specific TypeScript types where useful.
- Business rules must live server-side and, where possible, be backed by database constraints.
- Client-side validation is UX only; validate again on the server.
- Use shadcn/ui and existing Radix/Tailwind patterns before inventing custom UI primitives.
- Use `cn()` from `src/lib/utils.ts` for class composition.
- Toast feedback uses `sonner`.

## Architecture Rules

- This is a Next.js monolith. There is no separate backend service.
- Prefer API routes in `src/app/api/` for new queries and mutations.
- Existing Server Actions in `src/actions/` may be extended for consistency, but new mutation surfaces should generally be API routes.
- Every API route that touches Prisma or Node-only libraries must set `export const runtime = 'nodejs'`.
- Protected API routes must call `auth()` from `@clerk/nextjs/server` and return `401` when unauthenticated.
- Validate request bodies with Zod before database writes.
- Return JSON via `NextResponse.json({ data?, error? }, { status })`.
- In Server Components, query Prisma directly; do not `fetch()` internal API routes.
- Import the Prisma singleton from `@/lib/prisma`; do not instantiate `PrismaClient` in app code.
- Use `prisma.$transaction()` for multi-step mutations that must be atomic.
- Use `revalidatePath()` after mutations when cached pages need refresh.

Existing exception:
- `scripts/backfill-user-names.ts` is an operational script and instantiates its own Prisma client. Do not copy that pattern into app code.

## Domain Rules

- `prisma/schema.prisma` is the data-model source of truth.
- `TournamentSettings` owns current tournament configuration such as team size, event mode, pairing system, public tabs, speaker settings, and registration dates.
- Deprecated tournament fields such as old team-size fields may exist for compatibility; prefer settings fields for current behavior.
- A tournament creator is the tournament organizer; there is no current co-organizer model.
- Institution `ADMIN` and `MEMBER` roles are separate from tournament ownership.
- Tournament participants have one role per tournament: `DEBATER` or `JUDGE`.
- A debater can be on at most one team per tournament.
- Round lifecycle is `DRAFT` -> `PUBLISHED` -> `IN_PROGRESS` -> `COMPLETED`.
- Ballots are created when a round is published.
- Ballot lifecycle is `DRAFT` -> `SUBMITTED`, with reopening through modification requests.
- Standings are computed from debate results. Team tie-break order is wins descending, total points descending, then team name ascending.
- Portal judge access is token-based and outside Clerk. Preserve the SHA-256 lookup hash and AES-256-GCM encrypted token model.

## High-Risk Areas

Read the relevant docs and tests before changing these:
- Pairings: `src/lib/pairings/` and `docs/dev/tournament-lifecycle.md`
- Standings: `src/lib/domains/reporting/computeStandings.ts` and `docs/dev/ballots-and-results.md`
- Ballot result computation: `src/lib/ballots/computeResult.ts`
- Portal auth and tokens: `src/lib/portal/auth.ts`, `src/lib/portal/tokens.ts`, `docs/dev/security.md`
- Team management scope: `src/lib/domains/teams/teamManagementScope.ts`
- Tournament setting guards: `src/lib/guards/tournamentSettingsGuards.ts`
- Stream call access: `src/lib/stream/eligibility.ts`, `src/lib/stream/ensure.ts`
- Onboarding tours: `src/lib/tours/config.ts`, `src/components/tour/`, and `docs/dev/tours.md`

Important ballot edge cases:
- 1-judge panel
- 3-judge unanimous vote
- 3-judge 2-1 vote
- even-panel tie
- 2-judge panel marked completed where only the chair submitted; the chair-only fallback is intentional

Known security/production gaps:
- Rate limiting exists in `src/lib/security/rateLimit.ts` but is not wired into routes.
- Judge-per-round uniqueness is enforced in application logic, not by a database constraint.
- There is no platform-level admin role and no co-organizer model.
- Production needs `CLERK_WEBHOOK_SECRET`; without it, Clerk webhook verification is skipped.

## Testing Guidance

- Existing tests focus on pure business logic; API routes, DB queries, Clerk flows, and Stream integration have little or no automated coverage.
- Run `npm run lint` for general changes.
- Run `npx vitest run` when touching logic with existing tests or when behavior could regress.
- Add colocated tests for new pure functions in `src/lib/`.
- Before and after pairing changes, run `npx vitest run src/lib/pairings/`.
- Before changing standings, run the reporting tests, especially `src/lib/domains/reporting/computeStandings.test.ts`.
- For future DB or Clerk-related tests, prefer a real test database over mocking Prisma when practical.

## Documentation Rules

Update docs in the same task when behavior, permissions, setup, schema, integrations, terminology, or user flows change. Do not document planned behavior as implemented.

Useful doc targets:
- Architecture or data flow changes: `docs/dev/architecture.md`
- Schema/entity changes: `docs/dev/domain-model.md` and, when relevant, root `DOMAIN_MODEL.md`
- Permission changes: `docs/dev/roles-and-permissions.md`
- Tournament lifecycle changes: `docs/dev/tournament-lifecycle.md`
- Ballot/result logic changes: `docs/dev/ballots-and-results.md`
- Integration changes: `docs/dev/integrations.md`
- Env/setup changes: `.env.example`, `docs/dev/setup.md`, and `README.md`
- Security changes: `docs/dev/security.md`
- Test coverage changes: `docs/dev/testing.md`
- Deployment changes: `docs/dev/deployment.md`
- User-facing workflow changes: `docs/product/user-guide.md` or root `USER_FLOWS.md`
- Feature status changes: `FEATURES.md`
- Product positioning/current boundary: `PRODUCT_OVERVIEW.md`

Older product notes in `docs/product/` can include future ideas such as AI opponents, league/Elo systems, POI tooling, broader team communication, travel logistics, and import workflows. Treat them as planned unless current code and current docs say otherwise.

## Collaboration

- If a request is ambiguous or has multiple plausible implementations, ask a clarifying question before making a risky assumption.
- Keep edits scoped to the user request.
- Do not rewrite or reorganize unrelated code while solving a focused task.
- Do not modify `CLAUDE.md` unless the user explicitly asks for that file.
- Preserve user changes already present in the working tree.
