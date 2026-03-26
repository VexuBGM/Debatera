# Debatera

Debatera is a full-stack platform for running debate tournaments from one place. It combines tournament administration, institution and team management, pairings, ballots, standings, judge portals, and online debate rooms so organizers do not need to stitch together separate tools for tabbing, calls, and coordination.

> Status: active development. The core tournament loop is implemented and usable, with follow-up improvements tracked in [`docs/`](./docs).

## Why Debatera

Most debate tournaments still rely on a fragmented workflow:

- tab software for rounds and pairings
- chat tools for coordination
- video tools for online debates
- separate timers and ballot collection

Debatera aims to make the tournament itself the product, not the integration work around it.

## What the app supports today

- institution-based registration and membership management
- tournament creation with configurable event mode, registration windows, and pairing system
- participant registration for debaters and judges
- team creation and team-member assignment
- round creation, publishing, and pairings management
- Swiss and random auto-generation, plus manual pairings editing
- conflict-aware judge assignment
- venue management and automatic room allocation for IRL events
- Stream-powered online debate rooms
- synced debate stopwatch controls inside the call room
- per-judge ballots with automatic result computation
- public team and speaker standings
- token-based judge portal links
- Clerk authentication, profiles, and protected routes
- rate limiting and baseline security headers

## Tournament workflow

1. Create institutions and invite members.
2. Create a tournament and configure settings.
3. Approve institution registrations.
4. Register debaters and judges, then build teams.
5. Create rounds and generate or edit pairings.
6. Publish rounds, assign judges and venues, and open calls for online debates.
7. Submit ballots, compute results, and review standings.

## Tech stack

| Layer | Tools |
| --- | --- |
| App framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Radix UI |
| Auth | Clerk |
| Database | PostgreSQL, Prisma 7 |
| Video | Stream Video |
| Validation | Zod |
| Tests | Vitest |

## Getting started

### Prerequisites

- Node.js `>=20.9.0`
- npm `>=10`
- PostgreSQL
- A Clerk application
- A Stream application if you want to use online debate rooms

### Installation

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create your local environment file from [`.env.example`](./.env.example).

   ```bash
   cp .env.example .env
   # PowerShell: Copy-Item .env.example .env
   ```

3. Fill in the required environment variables.

4. Run the database migrations.

   ```bash
   npx prisma migrate dev
   ```

5. Start the development server.

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk client-side key |
| `CLERK_SECRET_KEY` | Yes | Clerk server-side key |
| `NEXT_PUBLIC_STREAM_API_KEY` | For online events | Stream client key |
| `STREAM_API_SECRET` | For online events | Stream server secret |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Absolute base URL used for stable portal links |
| `CLERK_WEBHOOK_SECRET` | Optional | Verifies the Clerk webhook endpoint |
| `PORTAL_TOKEN_TTL_DAYS` | Optional | Judge portal token lifetime, defaults to `14` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Optional | Overrides the sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Optional | Overrides the sign-up route |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Optional | Post sign-in redirect |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Optional | Post sign-up redirect |

### Local development notes

- `npm run build` runs `prisma migrate deploy` before the Next.js production build.
- The Clerk webhook route at `/api/webhooks/clerk` currently verifies and logs webhook events; it does not yet perform full user sync.
- Judge portal links are generated as absolute URLs, so `NEXT_PUBLIC_BASE_URL` should be set in shared or production environments.
- Stream-based calls are only created for tournaments configured with `eventMode = ONLINE`.

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with Turbopack |
| `npm run build` | Apply production migrations and build the app |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run backfill:user-names` | Backfill local user display names from Clerk |
| `npx vitest run` | Run the test suite |
| `npx prisma studio` | Open Prisma Studio |

## Repository map

```text
src/
  app/          Next.js App Router pages and API routes
  components/   UI components and feature-specific interfaces
  lib/          Domain logic, services, security, pairings, portals, and stream integration
prisma/
  schema.prisma Database schema
  migrations/   Prisma migrations
scripts/
  backfill-user-names.ts
docs/
  dev/          Developer documentation (architecture, setup, domain model, etc.)
  product/      Product planning notes and audits
```

## Product areas worth exploring

- `src/app/tournaments/[id]/standings/page.tsx` for the public standings experience
- `src/lib/pairings/generateSwissPairings.ts` for Swiss pairings orchestration
- `src/lib/venues/autoAllocate.ts` for venue assignment logic
- `src/app/api/tournaments/[id]/portal/generate-all-links/route.ts` for judge portal link generation
- `src/components/debate/SyncedStopwatch.tsx` for the in-call synchronized timer

## Developer documentation

Located in [`docs/dev/`](./docs/dev/).

| Document | Purpose |
| --- | --- |
| [architecture.md](./docs/dev/architecture.md) | System overview, modules, request/data flow, external services |
| [setup.md](./docs/dev/setup.md) | Local setup, env vars, migrations, running tests |
| [domain-model.md](./docs/dev/domain-model.md) | All Prisma entities, fields, and relationships |
| [roles-and-permissions.md](./docs/dev/roles-and-permissions.md) | Who can do what and where authorization is enforced |
| [tournament-lifecycle.md](./docs/dev/tournament-lifecycle.md) | End-to-end tournament flow from creation to standings |
| [ballots-and-results.md](./docs/dev/ballots-and-results.md) | Judging flow, ballot states, result computation, tie-break logic |
| [integrations.md](./docs/dev/integrations.md) | Clerk, Stream, Prisma, and all external dependencies |
| [security.md](./docs/dev/security.md) | Auth, permissions, validation, known gaps |
| [testing.md](./docs/dev/testing.md) | Current tests, coverage gaps, what to test before changing |
| [deployment.md](./docs/dev/deployment.md) | Production requirements, migrations, hosting notes |
| [contributing.md](./docs/dev/contributing.md) | Coding expectations, how to add features safely |

## Further reading

Located in [`docs/product/`](./docs/product/).

- [Online tournament readiness audit](./docs/product/online_tournament_readiness.md)
- [Rounds notes](./docs/product/rounds.md)
- [Tournament settings notes](./docs/product/tournament-settings.md)
- [Original product vision](./docs/product/the_whole_idea.md)

## License

This project is proprietary. All rights reserved.