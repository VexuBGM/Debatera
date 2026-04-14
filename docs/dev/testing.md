# Testing

## Test Runners

Debatera uses Vitest for unit, integration, and security tests, and Playwright for browser smoke and accessibility tests.

```bash
npm test
npm run test:watch
npm run test:integration
npm run test:security
npm run test:e2e
npm run typecheck
npm run lint
```

`vitest.config.ts` excludes `tests/integration/**`, `tests/security/**`, and `e2e/**` from the fast unit command. Integration and security tests use dedicated configs.

## Test Database

Integration and security tests run against PGlite through `tests/setup/prisma-test-client.ts`.

The setup generates SQL from `prisma/schema.prisma` with `prisma migrate diff --from-empty --to-schema ... --script`, applies it directly to an in-memory PGlite instance, and connects Prisma Client through the `pg` adapter with a single-connection pool. This gives Prisma-backed coverage without Docker or a local Postgres service.

The app Prisma singleton (`@/lib/prisma`) is mocked in `tests/setup/vitest.integration.setup.ts`, so routes and server actions use the test client transparently. Clerk auth, `next/cache`, and Stream call creation are also mocked at module boundaries.

## Current Coverage

Unit tests cover pure business logic such as:
- Swiss pairing behavior and institution-conflict helpers
- standings and top-speaker filtering
- participant guest-name parsing and schemas
- ballot validation edge cases and ballot/round authorization helpers
- ballot modification request rules
- tournament settings guards and round-status transitions
- portal token crypto
- URL and rate-limiter utilities
- display-name fallback logic

Integration tests currently cover:
- ballot submission through the Clerk-backed API route, including persisted speech scores and result computation
- `computeDebateResult()` for incomplete panels, 3-judge 2-1 results, even-panel chair ties, and the intentional completed-round chair-only fallback
- portal token lifecycle for active, expired, revoked, wrong-tournament, and non-judge participants
- standings API output from completed rounds
- institution invitation authorization and notification creation
- institution API creation, validation, public/member-scoped listing, and creator-admin membership
- tournament API creation/listing/detail visibility and creator-only visibility updates
- tournament settings API reads, creator-only updates, and invalid payload rejection
- participant actions for guest judge creation/removal, missing debater institutions, institution-admin scoping, and public/private reads
- team actions for institution-admin team creation, debater assignment, same-team rejection, single-membership enforcement, and size limits
- venue actions for organizer-only CRUD, IRL-only guards, and auto-allocation behavior
- profile actions for auth, validation, persistence, and trimming
- round API creation plus publish, in-progress, and completed status transitions
- round lifecycle publication checks, team-size publication checks, and completion side effects
- pairings API manual saves, draft visibility restrictions, random pairing generation, persisted judge assignments, and draft ballot creation
- Swiss pairing orchestration from DB records through persisted debates/ballots and round-to-round match-point feeds
- portal ballot API token-authenticated read, draft save, submit, result computation, and wrong-tournament rejection
- notification API unread filtering/counts and ownership-safe read updates
- Stream token API eligibility for online debate judges and rejection for unassigned users

Security tests currently cover:
- unauthenticated rejection for key protected Clerk-backed routes
- ballot IDOR protection, including cross-resource access attempts
- tournament settings organizer authorization
- malformed ballot submission rejection
- private-standings isolation
- portal ballot token scoping and revoked token rejection
- portal ballot rate-limit enforcement
- Clerk webhook Svix verification success and invalid/missing signature rejection

## E2E and Accessibility

Playwright tests live under `e2e/tests/` and are intentionally environment-gated until Clerk test accounts and seeded URLs are available.

Important environment toggles:
- `E2E_BASE_URL` or `E2E_START_SERVER=1` enables the public accessibility smoke test
- `E2E_SEED=1` seeds deterministic portal/ballot smoke-test data
- `E2E_CLERK_EMAIL` and `E2E_CLERK_PASSWORD` enable authenticated smoke tests
- `E2E_PORTAL_URL` enables the judge portal smoke test
- `E2E_BALLOT_URL` enables the seeded ballot smoke test

The accessibility smoke test uses `@axe-core/playwright`.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit tests, integration tests, and security tests on pull requests and pushes to `main`. On pushes to `main`, it also runs the production build and gated Playwright smoke tests.

## Safe Change Checklist

Before modifying these areas, run or extend the matching tests:

| Area | Command |
|---|---|
| Pairings | `npx vitest run src/lib/pairings/` |
| Standings | `npx vitest run src/lib/domains/reporting/computeStandings.test.ts && npx vitest run --config vitest.integration.config.ts tests/integration/api/standings.api.test.ts` |
| Ballots | `npx vitest run src/lib/ballots/ && npx vitest run --config vitest.integration.config.ts tests/integration/api/ballot-submit.api.test.ts tests/integration/domain/ballot-result-computation.test.ts` |
| Portal tokens | `npx vitest run src/lib/portal/ && npx vitest run --config vitest.security.config.ts tests/security/portal-token.security.test.ts` |
| Auth-sensitive routes | `npm run test:security` |

## Remaining Gaps

The suite still needs broader participant/team/round edge-case matrices beyond the current high-risk paths, Stream call creation behavior beyond token eligibility, and full browser flows backed by stable seeded URLs/data.
