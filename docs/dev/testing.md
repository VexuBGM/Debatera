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
- Institution API creation, validation, public/member-scoped listing, and creator-admin membership.
- Tournament API creation/listing/detail visibility and creator-only visibility updates.
- Tournament settings API reads, creator-only updates, and invalid payload rejection.
- Participant server actions for guest judge creation/removal, missing debater institutions, institution-admin scoping, and public/private reads.
- Team server actions for approved institution-admin team creation, debater assignment, unapproved institution rejection, and bulk-add team-size enforcement.
- Round API creation, invalid publish validation, and publish -> in-progress -> completed status updates.
- Pairing API manual saves, draft visibility restrictions, random pairing generation, persisted judge assignments, and draft ballot creation.
- Portal ballot API token-authenticated read, draft save, submit, result computation, and wrong-tournament rejection.
- Notification API unread filtering/counts and ownership-safe read updates.
- Stream token API eligibility for online debate judges and rejection for unassigned users.

Security tests currently cover:

- Unauthenticated rejection for key protected API mutation/detail routes.
- Ballot IDOR protection for judges.
- Tournament settings organizer authorization.
- Malformed ballot submission rejection.
- Portal ballot token scoping and revoked token rejection.
- Clerk webhook Svix verification success and invalid/missing signature rejection.

## E2E and Accessibility

Playwright tests live under `e2e/tests/` and are intentionally environment-gated until Clerk test accounts and seeded URLs are available:

- Playwright loads the standard Next.js env files before reading these values, so local `.env` or `.env.local` entries work.
- `E2E_BASE_URL` or `E2E_START_SERVER=1` enables the public accessibility smoke test.
- `E2E_SEED=1` seeds deterministic portal/ballot smoke-test data into the configured database and derives missing `E2E_PORTAL_URL` and `E2E_BALLOT_URL`. When no `E2E_BASE_URL` or `E2E_START_SERVER` is set, seeding also makes Playwright start the local dev server.
- `E2E_CLERK_EMAIL` and `E2E_CLERK_PASSWORD` enable authenticated smoke tests after auth storage state is recorded. Clerk treats emails ending in `+clerk_test@gmail.com` as test accounts; the Playwright auth setup automatically uses verification code `424242` for those accounts, or `E2E_CLERK_VERIFICATION_CODE` when overridden.
- `E2E_PORTAL_URL` enables the judge portal smoke test.
- `E2E_BALLOT_URL` enables the seeded ballot smoke test.

The accessibility smoke test uses `@axe-core/playwright`. More complete authenticated browser coverage should be added once a stable E2E seed strategy is available.

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

The suite still needs venue/profile action integration coverage, broader participant/team/round edge-case matrices, more exhaustive rate-limit and IDOR matrices, Stream call creation behavior beyond token eligibility, and full browser flows backed by stable seeded URLs/data.
