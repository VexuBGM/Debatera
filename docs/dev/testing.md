# Testing

## Test Runners

Debatera uses Vitest for unit, integration, and security tests, and Playwright for browser smoke and accessibility tests.

```bash
npm test                  # Unit tests only
npm run test:watch        # Unit tests in watch mode
npm run test:integration  # PGlite-backed integration tests
npm run test:security     # Security-focused route/token tests
npm run test:e2e          # Playwright smoke tests
npm run typecheck         # TypeScript no-emit check
npm run lint              # ESLint
```

`vitest.config.ts` intentionally excludes `tests/integration/**`, `tests/security/**`, and `e2e/**` from the fast unit-test command. Integration and security tests use their own configs.

## Test Database

Integration and security tests run against PGlite through `tests/setup/prisma-test-client.ts`.

The setup generates SQL from `prisma/schema.prisma` with `prisma migrate diff --from-empty --to-schema ... --script`, applies it directly to an in-memory PGlite instance, and connects Prisma Client through the `pg` adapter with a single-connection pool. This avoids Docker or a local PostgreSQL service while still exercising Prisma queries and database constraints.

The app Prisma singleton (`@/lib/prisma`) is mocked in `tests/setup/vitest.integration.setup.ts` so API routes and server actions use the test client without changing production code. Clerk auth, `next/cache`, and Stream call creation are also mocked at module boundaries.

## Current Coverage

Unit tests cover pure business logic such as pairings, standings, participant parsing, ballot modification request state, URL handling, display names, ballot validation, settings guards, rate limiting, and portal token crypto.

Integration tests currently cover:

- Ballot submission through the API route, including persisted speech scores and result computation.
- `computeDebateResult()` for incomplete panels, 3-judge 2-1 results, even-panel chair ties, and the intentional completed-round chair-only fallback.
- Portal token lifecycle for active, expired, revoked, wrong-tournament, and non-judge participants.
- Public standings API output from completed rounds.
- Institution invitation server action authorization and notification creation.

Security tests currently cover:

- Unauthenticated rejection for key protected API mutation/detail routes.
- Ballot IDOR protection for judges.
- Tournament settings organizer authorization.
- Malformed ballot submission rejection.
- Portal ballot token scoping and revoked token rejection.

## E2E and Accessibility

Playwright tests live under `e2e/tests/` and are intentionally environment-gated until Clerk test accounts and seeded URLs are available:

- `E2E_BASE_URL` or `E2E_START_SERVER=1` enables the public accessibility smoke test.
- `E2E_CLERK_EMAIL` and `E2E_CLERK_PASSWORD` enable authenticated smoke tests after auth storage state is recorded.
- `E2E_PORTAL_URL` enables the judge portal smoke test.
- `E2E_BALLOT_URL` enables the seeded ballot smoke test.

The accessibility smoke test uses `@axe-core/playwright`. More complete authenticated browser coverage should be added once a stable E2E seed strategy and Clerk test account are available.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests, integration tests, and security tests for pull requests and pushes to `main`. On pushes to `main`, it also runs the production build and gated Playwright smoke tests against configured E2E secrets.

## Safe Change Checklist

Before modifying these areas, run or extend the matching tests:

| Area | Command |
|---|---|
| Pairings | `npx vitest run src/lib/pairings/` |
| Standings | `npx vitest run src/lib/domains/reporting/computeStandings.test.ts && npm run test:integration -- --run tests/integration/api/standings.api.test.ts` |
| Ballot validation/submission/results | `npx vitest run src/lib/ballots/ && npm run test:integration -- --run tests/integration/api/ballot-submit.api.test.ts tests/integration/domain/ballot-result-computation.test.ts` |
| Portal tokens | `npx vitest run src/lib/portal/ && npm run test:security -- --run tests/security/portal-token.security.test.ts` |
| Auth-sensitive API routes | `npm run test:security` |

## Remaining Gaps

The suite still needs broader integration coverage for participant/team actions, round publishing and pairing persistence, webhook signature verification, Stream behavior, notifications, and full browser flows with real Clerk test accounts.
