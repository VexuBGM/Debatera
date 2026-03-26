# Local Setup

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 20.9.0 |
| npm | >= 10 |
| PostgreSQL | >= 14 recommended |

You also need accounts for:
- [Clerk](https://clerk.com) — authentication
- [Stream](https://getstream.io) — video (only needed for ONLINE debate mode)

---

## Installation

```bash
# 1. Install dependencies (also runs prisma generate via postinstall)
npm install

# 2. Copy environment file
cp .env.example .env          # Linux/macOS
# Copy-Item .env.example .env  # PowerShell

# 3. Fill in required values in .env (see below)

# 4. Create and migrate the database
npx prisma migrate dev

# 5. Start the dev server
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/debatera?schema=public` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | From Clerk dashboard → API keys |
| `CLERK_SECRET_KEY` | Yes | From Clerk dashboard → API keys |
| `NEXT_PUBLIC_STREAM_API_KEY` | For ONLINE events | From Stream dashboard |
| `STREAM_API_SECRET` | For ONLINE events | From Stream dashboard |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Absolute URL of the app, e.g. `http://localhost:3000`. Used to build judge portal links. |
| `CLERK_WEBHOOK_SECRET` | Optional | Enables Svix signature verification on `/api/webhooks/clerk` |
| `PORTAL_TOKEN_TTL_DAYS` | Optional | Judge portal link lifetime in days, defaults to `14` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Optional | Defaults to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Optional | Defaults to `/sign-up` |
| `NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL` | Optional | Post-auth redirect |

---

## Database

### Migrations

```bash
# Development — creates a new migration from schema changes
npx prisma migrate dev --name <migration-name>

# Production — applies pending migrations only (no schema changes)
npx prisma migrate deploy

# Inspect the database in a browser UI
npx prisma studio
```

The `npm run build` script automatically runs `prisma migrate deploy` before the Next.js build. Do not run `migrate dev` in production.

### Seeding

There is no `prisma/seed.ts` file in the repository. The `npm run seed` script references it but **no seed data exists**. Create test data manually through the app or via Prisma Studio.

---

## Running Tests

```bash
npx vitest run          # run all tests once
npx vitest              # watch mode
npx vitest run --reporter=verbose  # detailed output
```

Tests live alongside their source files (e.g., `computeStandings.test.ts` next to `computeStandings.ts`). No test database is used — all tests cover pure logic with no DB calls.

---

## Useful Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Turbopack dev server |
| `npm run build` | `prisma migrate deploy` + Next.js production build |
| `npm run start` | Production server (after build) |
| `npm run lint` | ESLint |
| `npm run backfill:user-names` | One-off: fills missing `firstName`/`lastName` from Clerk API |
| `npx vitest run` | Test suite |
| `npx prisma studio` | Database browser |
| `npx prisma migrate dev` | Apply schema changes in development |

---

## Clerk Setup

1. Create a Clerk application at [clerk.com](https://clerk.com).
2. Copy publishable key and secret key to `.env`.
3. In Clerk dashboard, configure the **webhook** to point to `/api/webhooks/clerk` and copy the signing secret to `CLERK_WEBHOOK_SECRET`. The webhook keeps local `User` records in sync when users are updated or deleted in Clerk.
4. Sign-in / sign-up routes are at `/sign-in` and `/sign-up` (configurable via env).

## Stream Setup (ONLINE tournaments only)

1. Create a project at [getstream.io](https://getstream.io).
2. Enable **Video & Audio**.
3. Copy API key and secret to `.env`.
4. Stream calls are created on-demand when a debate room is first accessed. No pre-configuration required in the Stream dashboard.

---

## Common Setup Issues

**Prisma: "Cannot find module '.prisma/client'"**
Run `npx prisma generate`. This is normally handled by `postinstall` but can fail if `node_modules` is in an unexpected state.

**"Unauthorized" after sign-in**
Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correctly set and match the same Clerk application.

**Video calls not working**
Ensure `NEXT_PUBLIC_STREAM_API_KEY` and `STREAM_API_SECRET` are set. Stream-based calls only exist for tournaments with `eventMode = ONLINE`.

**Judge portal links broken**
Set `NEXT_PUBLIC_BASE_URL` to the correct absolute URL. Portal links are built using this value and will be wrong if it is missing or points to the wrong host.
