# Architectural Patterns

## 1. Server Actions (Mutations)

All files in `src/actions/` use `'use server'` and follow this shape:

```
src/actions/invitation.actions.ts:1   'use server' directive
src/actions/teams.actions.ts:1        'use server' directive
```

**Return shape** (consistent across all actions):
```typescript
{ success: true, data: T } | { success: false, error: string }
```

**Structure pattern** (every action):
1. `const { userId } = await auth()` — bail early if unauthenticated
2. Authorization check (ownership, membership, role)
3. Business logic / DB operation
4. `revalidatePath(...)` to bust Next.js cache
5. Return typed result

## 2. API Routes (Queries & Complex Operations)

Located in `src/app/api/`. Each route file sets:
```typescript
export const runtime = 'nodejs'; // required for Prisma
```

Auth pattern:
```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

Zod validation on request bodies before touching the DB. Responses always go through `NextResponse.json()`.

## 3. Prisma Client — Singleton

`src/lib/prisma.ts` — single exported `prisma` instance using a `pg` connection pool via `PrismaPg` adapter. Cached on `global` in development to survive HMR.

Always import from `@/lib/prisma`, never instantiate `PrismaClient` elsewhere.

## 4. Clerk → DB User Sync

`src/lib/ensureUser.ts` — called in the root layout on every page load. Upserts the Clerk user into the local `User` table. Actions that need a local user record call `ensureLocalUserFromClerk()` (defined in `src/actions/invitation.actions.ts:15`).

## 5. Authorization Guards

`src/lib/guards/` contains assertion functions that throw or return errors for common pre-conditions:
- `assertRegistrationOpen()` — tournament must be in registerable state
- `assertValidTeamSize()` — team member count within allowed range

Pattern: throw a descriptive error string; callers catch and map to `{ success: false, error }`.

## 6. Preferred: API Routes over Server Actions

**Prefer API routes (`src/app/api/`) over Server Actions (`src/actions/`) for new code.**

API routes are easier to test, debug, and consume from multiple clients. Use Server Actions only when there is a clear reason (e.g., progressive enhancement, form submissions that must work without JS).

When in doubt:
- New mutation → API route (`POST /api/...`)
- New query → API route (`GET /api/...`)
- Existing action needs extending → keep it as an action for consistency

## 7. Data Fetching Strategy

| Scenario | Approach |
|---|---|
| Page-level data (server) | Direct Prisma query in Server Component or `generateMetadata` |
| Mutations | API route (`POST /api/...`) — prefer over Server Actions |
| Polling / real-time client data | `useEffect` + `fetch()` (e.g., notifications poll every 30s) |
| Stream SDK tokens | Dedicated API route `/api/stream/token` |

Never use `fetch()` inside Server Components — query Prisma directly.

## 8. Component Conventions

- Client components declare `'use client'` at top.
- Server components fetch data and pass it as props to client children.
- Radix UI provides unstyled primitives; Tailwind + `clsx`/`tailwind-merge` handle styling.
- `cn()` utility (from `src/lib/utils.ts`) is the standard way to compose class names.
- Toast feedback via `sonner` (`toast.success()` / `toast.error()`).

## 9. Validation Pattern

Zod schemas live in `src/lib/validations/`. They are shared between:
- API route body parsing (`schema.parse(await req.json())`)
- Form validation on client components

Always validate on the server; client-side validation is optional UX sugar.

## 10. Database Transactions

Multi-step mutations that must be atomic use:
```typescript
await prisma.$transaction([op1, op2, ...]);
// or
await prisma.$transaction(async (tx) => { ... });
```

Used in: ballot submission, team creation with member assignment, round publication.

## 11. Role Hierarchy

```
Platform: USER < ADMIN
Institution: MEMBER < ADMIN
Debate: SPECTATOR < JUDGE (PANELIST < CHAIR) < DEBATER
```

Checks are manual (no middleware RBAC library) — each action/route does its own `if (role !== 'ADMIN') return error`.

## 12. Onboarding Tour System

First-time tooltips shown per page, role-aware, skippable, replayable, persisted to DB.

**The only file to edit for step content:** `src/lib/tours/config.ts`

Quick checklist to add a tour to a new page:
1. Add entry to `TOURS` in `src/lib/tours/config.ts`
2. Add `data-tour="<value>"` attributes to target DOM elements
3. Call `useTourTrigger('tour-id')` in the page client component
4. Optionally add a replay button via `useTour().resetTour` + `startTour`

Persistence: localStorage (instant) + `User.seenTutorials` in DB (cross-device sync via `PATCH /api/me/tutorials`).

See `.claude/docs/tours.md` for the full reference.
