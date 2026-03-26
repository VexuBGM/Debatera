# Contributing

## Coding Expectations

The full conventions are in [`.claude/docs/conventions.md`](../../.claude/docs/conventions.md) and [`.claude/docs/architectural_patterns.md`](../../.claude/docs/architectural_patterns.md). Key rules:

- **Readability over cleverness.** Write code like someone else will debug it at 3 AM.
- **One file = one responsibility.** File names describe what the file does, not how.
- **No `any` in TypeScript.** Use domain-specific types.
- **Business rules live server-side.** UI reflects rules; it never defines them.
- **Guards and validation are not optional.** Always validate at system boundaries.

---

## Adding a New Feature

### Step 1 — Choose where the logic lives

| Concern | Where |
|---|---|
| New query or read endpoint | `src/app/api/.../route.ts` |
| New mutation | `src/app/api/.../route.ts` (prefer API routes over server actions for new code) |
| Pure business logic | `src/lib/domains/<domain>/` or `src/lib/<module>/` |
| Pre-condition check | `src/lib/guards/` |
| Input validation schema | `src/lib/validations/` |
| UI page | `src/app/(main)/(home)/...` |
| Reusable UI component | `src/components/` |

### Step 2 — Schema changes

1. Edit `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name <migration-name>`.
3. Run `npx prisma generate` (handled by `postinstall` after `npm install`).
4. Commit both the schema and the generated migration file.

Do not alter existing migration files after they've been applied to any environment.

### Step 3 — API route pattern

```typescript
// src/app/api/example/route.ts
export const runtime = 'nodejs'; // required

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = schema.parse(await req.json()); // throws on invalid input

  const result = await prisma.something.create({ data: { ...body, userId } });
  return NextResponse.json({ data: result }, { status: 201 });
}
```

### Step 4 — Authorization

Check ownership or membership before every mutation. Fetch the relevant record and verify the acting user's relationship to it. Do not trust query parameters alone.

### Step 5 — Tests

Write a test for any new pure function in `src/lib/`. Tests live alongside the source file (`foo.test.ts` next to `foo.ts`).

---

## Modifying Existing Logic

### Before touching the pairing algorithm

`src/lib/pairings/` has test coverage. Run `npx vitest run src/lib/pairings/` before and after your change to verify correctness.

### Before touching standings computation

`src/lib/domains/reporting/computeStandings.ts` has test coverage. The tie-break order (wins → points → name) is deterministic and intentional. Do not change it without updating the tests and the `ballots-and-results.md` doc.

### Before touching ballot submission

Read `src/lib/ballots/computeResult.ts` fully. The chair-only fallback for 2-judge rounds is intentional and non-obvious. Test any changes against:
- 1-judge panel
- 3-judge panel with unanimous vote
- 3-judge panel with 2-1 vote
- Tie (even-number panel)
- 2-judge panel, round completed, only chair submitted

### Before touching the portal auth

Read `src/lib/portal/auth.ts` and `src/lib/portal/tokens.ts`. The token security model (SHA-256 hash for lookup, AES-256-GCM for storage) must not be weakened.

---

## Database Safety

- Use `prisma.$transaction()` for multi-step mutations that must be atomic.
- Do not bypass unique constraints with `upsert` unless you've verified the upsert semantics are correct for the operation.
- Cascade deletes are configured broadly (deleting a tournament deletes all children). Be careful when implementing delete operations.
- For destructive schema changes, follow the additive migration pattern: add first, migrate data, drop old in a later migration.

---

## Keeping Documentation Accurate

When you change behavior, update the relevant doc:

| Change | Update |
|---|---|
| New or removed Prisma model/field | `docs/domain-model.md` |
| New or changed permission | `docs/roles-and-permissions.md` |
| Changed tournament lifecycle step | `docs/tournament-lifecycle.md` |
| Changed ballot or result logic | `docs/ballots-and-results.md` |
| New external service | `docs/integrations.md` |
| New env variable | `docs/setup.md` + `README.md` + `.env.example` |
| New or changed security control | `docs/security.md` |
| New test coverage | `docs/testing.md` |
| Production deployment change | `docs/deployment.md` |

**Source of truth rules:**
- `prisma/schema.prisma` is the source of truth for the data model — not `docs/domain-model.md`. The doc explains the model; the schema defines it.
- `.env.example` is the authoritative list of environment variables.
- `src/app/api/` is the authoritative list of API endpoints — no separate API reference doc exists.

---

## PR Checklist

Before opening a pull request:

- [ ] `npm run lint` passes
- [ ] `npx vitest run` passes (no regressions)
- [ ] New pure functions have unit tests
- [ ] Schema changes have a migration file committed
- [ ] Relevant docs are updated
- [ ] No new `any` types without justification
- [ ] Business rules validated server-side (not UI-only)
- [ ] No `PrismaClient` instantiated outside `src/lib/prisma.ts`
- [ ] New API routes set `export const runtime = 'nodejs'`
