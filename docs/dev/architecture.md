# Architecture

## Overview

Debatera is a Next.js 16 monolith using the App Router. There is no separate backend service — all server logic runs either as API routes (`src/app/api/`) or Next.js Server Actions (`src/actions/`), backed by a single PostgreSQL database accessed exclusively through Prisma.

```
Browser / Client
       │
       ▼
Next.js App Router (React 19, Server & Client Components)
       │
       ├── src/app/(auth)/          — Clerk-hosted sign-in / sign-up
       ├── src/app/(main)/(home)/   — Authenticated app pages
       ├── src/app/(portal)/        — Token-gated judge portal
       ├── src/app/api/             — REST API routes (primary backend)
       └── src/actions/             — Server Actions (legacy mutations)
              │
              ▼
         Prisma 7 (pg adapter)
              │
              ▼
         PostgreSQL
```

External services: Clerk (auth), Stream (video), Svix (webhook delivery).

---

## Major Modules

### App Shell — `src/app/(main)/`

Clerk-protected pages. The root layout calls `ensureUser()` on every request to sync the Clerk session with the local `User` table.

Key page trees:
- `(home)/tournaments/[id]/` — tournament dashboard (overview, rounds, teams, standings, settings)
- `(home)/institutions/` — institution management
- `(home)/ballots/[ballotId]/` — ballot detail view
- `tournaments/[id]/rounds/[roundId]/debates/[dId]/call/` — video debate room

### Judge Portal — `src/app/(portal)/`

A separate, token-authenticated app shell for judges who access ballots without a Clerk account. Token validation is handled by `src/lib/portal/auth.ts`. No Clerk session is expected or checked here.

### API Layer — `src/app/api/`

All routes set `export const runtime = 'nodejs'` (required for Prisma's pg adapter). Every route:
1. Calls `await auth()` from Clerk and returns 401 if no session (except portal routes).
2. Validates request body with Zod before touching the database.
3. Returns `NextResponse.json({ data?, error? }, { status })`.

Portal routes authenticate via `src/lib/portal/auth.ts` instead of Clerk.

### Server Actions — `src/actions/`

Five files covering institution invitations, teams, participants, profiles, and venues. All follow the `{ success: true, data? } | { success: false, error: string }` shape and call `revalidatePath()` after mutations. **New code should prefer API routes** — see [`.claude/docs/architectural_patterns.md`](../../.claude/docs/architectural_patterns.md).

### Domain Libraries — `src/lib/`

| Directory | Responsibility |
|---|---|
| `ballots/` | Ballot creation, authorization, result computation, modification requests |
| `debates/` | Debate DB queries |
| `domains/reporting/` | Standings and speaker ranking (pure computation + service layer) |
| `domains/participants/` | Guest participant helpers |
| `domains/teams/` | Team management scope resolution |
| `guards/` | Pre-condition assertions (registration window, team size) |
| `pairings/` | Swiss pairing algorithm + seeded RNG |
| `portal/` | Token generation, AES-256-GCM encryption, token validation |
| `security/` | URL sanitization, rate limiting (currently unwired) |
| `services/` | Higher-level service functions (tournaments, institutions, profiles) |
| `stream/` | Stream SDK server client, eligibility checks, VideoCall record management |
| `tournamentRounds/` | Round and pairing CRUD, authorization, institution conflict detection |
| `validations/` | Shared Zod schemas |
| `venues/` | Venue auto-allocation |

---

## Request / Data Flow

### Authenticated page load

```
Browser → Next.js SSR
  → root layout: ensureUser() → Prisma upsert User
  → Server Component: direct Prisma query
  → renders HTML + hydrates client components
```

### Mutation (API route pattern)

```
Client component → fetch POST /api/...
  → auth()           (Clerk session check)
  → Zod.parse()      (input validation)
  → prisma.$tx()     (atomic DB write)
  → revalidatePath() (optional, inside API route)
  → NextResponse.json({ data })
```

### Ballot submission flow

```
Judge submits ballot form
  → POST /api/ballots/[id]/submit
  → validate Zod schema
  → update Ballot (status DRAFT → SUBMITTED, set vote + totals)
  → computeDebateResult() — checks if all judge ballots submitted
  → if complete: upsert DebateResult
  → return result
```

### Video call entry (ONLINE tournaments)

```
Debater opens /tournaments/[id]/rounds/[roundId]/debates/[dId]/call
  → POST /api/stream/calls/ensure  — creates VideoCall record + Stream call
  → GET  /api/stream/token         — generates short-lived Stream JWT
  → @stream-io/video-react-sdk renders the call room
```

### Notification polling

```
Client component (bell icon)
  → setInterval every 30s → GET /api/notifications
  → renders unread count
```

> There is no WebSocket or SSE for notifications. Polling is the only real-time mechanism outside of Stream SDK.

---

## External Services

| Service | Role | SDK |
|---|---|---|
| **Clerk** | Authentication, user management | `@clerk/nextjs` v6 |
| **Stream** | Video calls for ONLINE debates | `@stream-io/video-react-sdk`, `@stream-io/node-sdk` |
| **Svix** | Webhook signature verification for Clerk events | `svix` |
| **PostgreSQL** | Primary database | `pg` + `@prisma/adapter-pg` |

---

## Key Architectural Constraints

- **No `PrismaClient` instantiation outside `src/lib/prisma.ts`.** Singleton with pg connection pool, cached on `global` in dev to survive HMR.
- **No `fetch()` inside Server Components.** Query Prisma directly.
- **All business rules live server-side.** UI may reflect rules but never defines them. See `src/lib/guards/` and `src/lib/domains/`.
- **`export const runtime = 'nodejs'`** on every API route — required for the pg adapter.
- **Prefer API routes over Server Actions** for new mutations.
