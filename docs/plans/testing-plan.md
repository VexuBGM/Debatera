# Debatera Master Testing Plan

**Version:** 1.0
**Date:** 2026-04-11
**Status:** Partially implemented - unit, integration, security, CI, and gated E2E scaffolding exist

> Implementation note (2026-04-11): the original audit below is preserved for planning context, but it is no longer a snapshot of the current suite. See `docs/dev/testing.md` for the current coverage summary and remaining gaps.

---

## 1. Executive Summary

Debatera is a full-stack Next.js debate tournament management platform with zero integration tests, zero E2E tests, zero API tests, and no CI test gate. The existing 71 unit tests cover only pure functions (Swiss pairings, standings computation, validation schemas, display name formatting, URL building, ballot modification request logic). None of these tests touch the database, auth, API routes, server actions, or React components.

This plan designs a practical, phased testing strategy optimized for:
- **A solo developer** maintaining the suite long-term
- **10+ parallel agents** implementing the tests in a single sprint
- **Correctness and regression prevention** over theoretical coverage
- **Security and accessibility hardening** as a dedicated phase

The highest-risk untested areas are: ballot submission + result computation (data integrity), server action authorization (security), round lifecycle transitions (correctness), and the judge portal token flow (security + correctness).

---

## 2. Repository Audit

### 2.1 Existing Test Files (9 files, 71 tests, all passing)

| File | Tests | What it covers |
|---|---|---|
| `src/lib/pairings/swissPairing.test.ts` | 15 | Pure Swiss pairing algorithm: brackets, BYEs, rematches, side balance, determinism, edge cases |
| `src/lib/domains/reporting/computeStandings.test.ts` | 10 | Pure standings computation: wins/losses, points, sorting, BYE handling, ranking |
| `src/lib/domains/reporting/filterTopSpeakers.test.ts` | 7 | Top-N speaker filtering and ranking |
| `src/lib/domains/participants/guestParticipants.test.ts` | 4 | Name normalization, parsing, splitting |
| `src/lib/domains/participants/participants.test.ts` | 9 | Zod schema validation for guest participant input |
| `src/lib/domains/teams/teamManagementScope.test.ts` | 2 | `canManageInstitution` permission logic |
| `src/lib/ballots/modificationRequests.test.ts` | 7 | Ballot editability state machine, modification request eligibility, serialization |
| `src/lib/security/url.test.ts` | 5 | URL normalization, protocol handling, judge portal link building |
| `src/lib/users/displayName.test.ts` | 8 | Display name fallback chain, initials |

### 2.2 Test Framework Configuration

- **Vitest v4.0.18** — installed as devDependency, `vitest.config.ts` present at root
- Config is minimal: `globals: true`, `@` alias mapped to `./src`
- No `test` script in `package.json` — tests must be run via `npx vitest`
- No Playwright, no Cypress, no Jest, no React Testing Library installed
- No test setup files (no `setupTests.ts`, no `globalSetup.ts`)

### 2.3 CI/CD State

- **No CI test gate exists.** No GitHub Actions workflow runs tests.
- Three workflow files exist (`.github/workflows/`) but all are manual DB operations (restore_dump, import_sql, import_from_dump) — none run tests.
- Deployment appears to be Vercel-based (standard Next.js build checks only).
- No test coverage reporting or threshold enforcement.

### 2.4 Test Database Strategy

- **None exists.** All test files carefully avoid importing Prisma or anything that hits the database.
- No test DB URL, no Docker Compose for test Postgres, no `prisma/seed.ts` (glob returned empty).
- The production DB uses Neon or similar hosted Postgres (based on GitHub Actions using `PROD_DATABASE_URL`).

### 2.5 External Dependencies Affecting Testing

| Dependency | How it's used | Testability challenge |
|---|---|---|
| **Clerk** | Auth via `auth()`, `clerkClient()` in server actions and API routes | Must be mocked — every server action and API route starts with `await auth()` |
| **Prisma** | All data access via singleton `prisma` from `@/lib/prisma` | Must use test DB or mock — imported in ~30+ files |
| **Stream SDK** | Video calls, custom events for stopwatch sync | Client-side only, needs mock for component tests |
| **Svix** | Webhook signature verification in `api/webhooks/clerk` | Must mock `Webhook.verify()` |
| **Next.js Server** | `revalidatePath`, `NextResponse`, route handlers | Needs Next.js test helpers or direct function calls |
| **Node crypto** | Portal token hashing + AES-256-GCM encryption | Pure Node — fully testable |

### 2.6 Code Structure Assessment for Testability

**Well-structured for testing (pure functions already extracted):**
- `src/lib/pairings/swissPairing.ts` — pure algorithm, no side effects
- `src/lib/domains/reporting/computeStandings.ts` — pure computation
- `src/lib/domains/reporting/filterTopSpeakers.ts` — pure
- `src/lib/guards/tournamentSettingsGuards.ts` — pure guards with injectable `now`
- `src/lib/ballots/validation.ts` — pure Zod schemas + validation helpers
- `src/lib/ballots/modificationRequests.ts` — pure state checks
- `src/lib/portal/tokens.ts` — pure crypto operations
- `src/lib/portal/encryption.ts` — pure crypto operations
- `src/lib/security/url.ts` — pure URL logic
- `src/lib/users/displayName.ts` — pure formatting

**Harder to test (coupled to Prisma/Clerk/Next.js):**
- `src/lib/ballots/computeResult.ts` — imports `prisma` directly, queries + writes in one function
- `src/lib/ballots/authorization.ts` — `getViewerRole` and `loadBallotAccessContext` query Prisma directly
- `src/lib/security/access.ts` — `getInstitutionViewAccess` and `getTournamentViewAccess` query Prisma directly
- `src/lib/pairings/generateSwissPairings.ts` — orchestrator that mixes pure logic with Prisma transactions
- All server actions (`src/actions/*.ts`) — tightly coupled to `auth()` + `prisma`
- All API routes (`src/app/api/**/route.ts`) — coupled to `auth()` + `prisma` + `NextResponse`
- `src/lib/ensureUser.ts` — coupled to both `clerkClient()` and `prisma`

**The consistent pattern across all server actions:** `{ success: boolean; data?: T; error?: string }` return type — good for assertion consistency.

**The consistent pattern across all API routes:** `auth()` first, then authorization check, then Zod parse, then business logic, then `NextResponse.json()`. This uniformity makes API testing systematic.

---

## 3. Current Gaps

### 3.1 Critical Untested Areas

| Gap | Risk | Impact if broken |
|---|---|---|
| **Ballot submission + result computation** | Data integrity — incorrect winners, wrong standings | Entire tournament results are wrong |
| **Server action authorization** | Security — any authenticated user could modify other users' data | Privilege escalation, data corruption |
| **API route authorization** | Security — unauthenticated/unauthorized access to admin endpoints | Data leaks, unauthorized mutations |
| **Round lifecycle transitions** (DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED) | Correctness — rounds could get stuck or skip states | Tournament workflow breaks |
| **Portal token flow** (generate → hash → validate → expire → revoke) | Security — token bypass, expired token reuse | Unauthorized judge portal access |
| **Institution registration → approval → participant flow** | Correctness — broken registration pipeline | Users can't join tournaments |
| **Team building + member constraints** | Correctness — wrong team sizes, duplicate members | Invalid tournament state |
| **Pairing persistence (generateSwissPairings orchestrator)** | Data integrity — correct algorithm but wrong DB writes | Pairings don't save correctly |
| **Webhook signature validation** | Security — spoofed webhooks could create/modify users | Unauthorized data modification |

### 3.2 Missing Infrastructure

- No `test` script in `package.json`
- No test database provisioning strategy
- No Prisma test client or mock setup
- No Clerk auth mock helpers
- No test factories or fixtures for tournament scenarios
- No API route testing helpers (request builders)
- No E2E framework installed
- No accessibility testing tools
- No CI pipeline for tests

---

## 4. Risk Map by Domain

| Domain | Business Criticality | Regression Likelihood | User Impact | Data Integrity Risk | Security Risk | A11y Risk | Recommended Test Layers |
|---|---|---|---|---|---|---|---|
| **Ballot submit + result computation** | CRITICAL | HIGH | CRITICAL | CRITICAL | Medium | Low | Unit, Integration, API |
| **Swiss pairing algorithm** | CRITICAL | Medium | CRITICAL | High | Low | Low | Unit (exists), Integration |
| **Standings computation** | HIGH | Medium | HIGH | High | Low | Medium | Unit (exists), Integration, API |
| **Server action authorization** | HIGH | HIGH | HIGH | Medium | CRITICAL | Low | Unit, Integration |
| **API route authorization** | HIGH | HIGH | HIGH | Medium | CRITICAL | Low | API |
| **Portal token auth** | HIGH | Medium | HIGH | Low | CRITICAL | Low | Unit, Integration, API |
| **Institution CRUD + invitations** | HIGH | Medium | HIGH | Medium | HIGH | Medium | Integration, API, E2E |
| **Tournament creation + settings** | HIGH | Medium | HIGH | Medium | Medium | Medium | API, E2E |
| **Participant registration** | HIGH | HIGH | HIGH | Medium | Medium | Medium | Integration, API |
| **Team building + member mgmt** | HIGH | HIGH | HIGH | HIGH | Medium | Medium | Integration, API, E2E |
| **Round lifecycle management** | HIGH | HIGH | HIGH | HIGH | Medium | Low | Integration, API |
| **Judge assignment** | HIGH | Medium | HIGH | Medium | Medium | Low | Integration |
| **Pairing generation (orchestrator)** | HIGH | Medium | CRITICAL | HIGH | Low | Low | Integration |
| **Manual pairing editing** | Medium | Medium | Medium | Medium | Medium | Medium | API |
| **Ballot modification requests** | Medium | Low | Medium | Low | Medium | Low | Unit (exists), API |
| **Notifications** | Medium | Low | Medium | Low | Low | Medium | Integration |
| **Permissions / guards** | HIGH | Medium | HIGH | Low | CRITICAL | Low | Unit, Integration |
| **Stopwatch sync** | Medium | Low | Medium | Low | Low | Medium | Component, API |
| **Stream video integration** | Medium | Low | Medium | Low | Medium | Low | Component (mock) |
| **Clerk webhook handling** | Medium | Low | Medium | Medium | HIGH | Low | API |
| **Prisma schema constraints** | HIGH | Low | HIGH | CRITICAL | Medium | Low | DB integrity |
| **Zod validation schemas** | Medium | Medium | Medium | Medium | Medium | Low | Unit (partial exists) |

---

## 5. Recommended Testing Stack

### 5.1 Core Stack

| Layer | Tool | Rationale |
|---|---|---|
| **Unit + Integration** | **Vitest** (already installed) | Already configured, fast, native ESM, great TypeScript support |
| **API route testing** | **Vitest + custom request helper** | Call route handlers directly with mocked `Request` objects — no HTTP server needed |
| **Component testing** | **Vitest + React Testing Library** | `@testing-library/react` for component rendering, `jsdom` environment |
| **E2E** | **Playwright** | Best Next.js integration, built-in a11y via `@axe-core/playwright`, cross-browser |
| **Accessibility** | **@axe-core/playwright** (E2E) + **eslint-plugin-jsx-a11y** (static, already installed) | Automated a11y checks at two levels |
| **Test DB** | **PGlite** (already a transitive dep via `@electric-sql/pglite`) | In-process Postgres — no Docker needed, fast setup/teardown, Prisma-compatible |
| **Mocking** | **Vitest built-in mocks** (`vi.mock`, `vi.fn`) | No additional library needed |
| **Factories** | **Custom factory functions** (project-specific) | Lightweight, type-safe, no additional dependencies |

### 5.2 What to Add

```
npm install -D @testing-library/react @testing-library/jest-dom jsdom
npm install -D playwright @playwright/test @axe-core/playwright
npm install -D @electric-sql/pglite  # likely already available as transitive dep
```

### 5.3 What NOT to Add

- **Jest** — Vitest is already configured and superior for ESM/TypeScript
- **Cypress** — Playwright is more capable for Next.js App Router
- **MSW (Mock Service Worker)** — Overkill; direct handler invocation + `vi.mock` is simpler
- **Testcontainers** — Docker-based Postgres is too heavy; PGlite is sufficient
- **Storybook** — Component testing via RTL is more practical for a solo dev
- **Prisma `createMockClient`** — Testing against a real (embedded) DB is more reliable

### 5.4 Tradeoffs

| Decision | Pro | Con |
|---|---|---|
| PGlite over Docker Postgres | Zero infrastructure, fast in CI, works on Windows | Slight behavior differences from production Postgres (rare) |
| Direct route handler calls over HTTP tests | Faster, no server startup, easier mocking | Doesn't test Next.js middleware or routing |
| Playwright for E2E | Full browser, real auth flow possible | Slow, requires dev server, needs Clerk test account |
| Custom factories over Prisma seed | Type-safe, composable, per-test isolation | More code to write upfront |

### 5.5 Maintenance Cost for Solo Developer

- **Unit/integration tests** — Low maintenance, fast feedback, highest ROI
- **API tests** — Medium maintenance, catch auth/validation regressions efficiently
- **E2E tests** — Higher maintenance (brittle selectors, slow), but critical for the top 3-5 flows
- **Accessibility** — Low maintenance once axe-core is set up (automated scanning)
- **Total estimate:** ~20 min/week to maintain after initial implementation

---

## 6. Proposed Folder Structure

### 6.1 Hybrid Approach: Colocated Unit Tests + Centralized Integration/E2E

```
src/
  lib/
    pairings/
      swissPairing.ts
      swissPairing.test.ts          # unit (existing pattern — keep)
    ballots/
      validation.ts
      validation.test.ts            # unit (colocated)
      computeResult.test.ts         # unit for extractable pure logic
    domains/
      reporting/
        computeStandings.test.ts    # unit (existing)
    guards/
      tournamentSettingsGuards.test.ts  # unit (colocated)
    portal/
      tokens.test.ts                # unit (colocated)
      encryption.test.ts            # unit (colocated)
    security/
      url.test.ts                   # unit (existing)
      rateLimit.test.ts             # unit (colocated)

tests/                              # centralized test infrastructure
  setup/
    vitest.setup.ts                 # global setup (PGlite, mocks)
    vitest.integration.setup.ts     # integration-specific setup
    prisma-test-client.ts           # PGlite-backed Prisma client
    clerk-mock.ts                   # Clerk auth mock helpers
    stream-mock.ts                  # Stream SDK mock
    next-mock.ts                    # Next.js server mocks (revalidatePath, etc.)
  factories/
    user.factory.ts                 # User creation helper
    institution.factory.ts          # Institution + members
    tournament.factory.ts           # Tournament + settings
    participant.factory.ts          # Participants (debater, judge, guest)
    team.factory.ts                 # Teams + members
    round.factory.ts                # Rounds + debates + pairings
    ballot.factory.ts               # Ballots + speeches + results
    portal.factory.ts               # Access links + tokens
  fixtures/
    tournament-scenarios.ts         # Pre-built tournament states (8-team, completed round, etc.)
  helpers/
    api-request.ts                  # Helper to build Request objects for route handlers
    assert-action-response.ts       # Custom matchers for server action responses
    assert-api-response.ts          # Custom matchers for API route responses
  integration/                      # Integration tests (hit test DB, mock auth)
    actions/
      invitation.actions.test.ts
      participants.actions.test.ts
      teams.actions.test.ts
      venues.actions.test.ts
      profile.actions.test.ts
    api/
      institutions.api.test.ts
      tournaments.api.test.ts
      tournament-settings.api.test.ts
      rounds.api.test.ts
      pairings.api.test.ts
      ballots.api.test.ts
      ballot-submit.api.test.ts
      standings.api.test.ts
      stream.api.test.ts
      webhooks.api.test.ts
      notifications.api.test.ts
      portal-auth.api.test.ts
      portal-ballots.api.test.ts
      dashboard.api.test.ts
    domain/
      ballot-result-computation.test.ts
      swiss-pairing-orchestrator.test.ts
      round-lifecycle.test.ts
      team-building-constraints.test.ts
      institution-registration-flow.test.ts
      portal-token-lifecycle.test.ts
  security/
    auth-guards.security.test.ts        # Every route rejects unauthenticated
    authorization.security.test.ts      # Role-based access control per endpoint
    idor.security.test.ts               # Insecure direct object reference tests
    input-validation.security.test.ts   # Malformed/oversized/injection inputs
    webhook-validation.security.test.ts # Svix signature verification
    portal-token.security.test.ts       # Token expiry, revocation, reuse
    rate-limiting.security.test.ts      # Rate limit enforcement
  accessibility/                         # Placeholder for axe-core configs

e2e/                                # Playwright E2E tests
  config/
    playwright.config.ts
    auth.setup.ts                   # Clerk login flow for test accounts
    global-setup.ts                 # Seed test data
  fixtures/
    test-accounts.ts                # Test user credentials
  tests/
    tournament-lifecycle.spec.ts    # Create → register → pair → ballot → standings
    institution-management.spec.ts  # Create → invite → accept → manage
    ballot-workflow.spec.ts         # Draft → edit → submit → result
    judge-portal.spec.ts            # Token access → view ballots → submit
    accessibility.spec.ts           # Axe-core automated scans on key pages
```

### 6.2 Naming Conventions

| Type | Pattern | Example |
|---|---|---|
| Colocated unit test | `*.test.ts` next to source | `swissPairing.test.ts` |
| Integration test | `tests/integration/**/*.test.ts` | `ballots.api.test.ts` |
| Security test | `tests/security/*.security.test.ts` | `auth-guards.security.test.ts` |
| E2E test | `e2e/tests/*.spec.ts` | `tournament-lifecycle.spec.ts` |
| Factory | `tests/factories/*.factory.ts` | `tournament.factory.ts` |
| Helper | `tests/helpers/*.ts` | `api-request.ts` |
| Setup | `tests/setup/*.ts` | `prisma-test-client.ts` |

### 6.3 Why This Structure

- **Colocated unit tests** — existing convention, easy to find, encourages writing tests alongside code
- **Centralized integration/security/E2E** — prevents merge conflicts when 10+ agents work in parallel (each agent owns a different file)
- **Factories in one place** — all agents share the same data builders, preventing duplication
- **Clear separation** — unit tests never import from `tests/`, integration tests import from `tests/setup/` and `tests/factories/`

---

## 7. Test Environments and Data Strategy

### 7.1 Unit Tests (No DB, No Network)

- **Environment:** Default Vitest (Node.js)
- **Mocking:** `vi.mock('@/lib/prisma')` where needed; pure functions need no mocks
- **Data:** Inline test data, factory functions for convenience
- **Setup/teardown:** None

### 7.2 Integration Tests (Test DB, Mocked Auth)

- **Database:** PGlite (in-process embedded Postgres)
  - Initialized once per test file via `beforeAll`
  - Schema applied via Prisma migration against PGlite
  - Each test runs in a transaction that rolls back (`beforeEach` / `afterEach`)
  - Alternative: truncate all tables between tests (simpler for transaction-heavy code)
- **Auth mocking:** `vi.mock('@clerk/nextjs/server')` — mock `auth()` to return `{ userId: 'test_user_xxx' }`
  - Different user personas: organizer, judge, debater, unauthenticated, wrong-tournament user
- **Stream mocking:** `vi.mock('@stream-io/node-sdk')` — mock token generation
- **Next.js mocking:** `vi.mock('next/cache')` — mock `revalidatePath` as no-op
- **Environment variables:** Minimal — `DATABASE_URL` pointing to PGlite, `CLERK_SECRET_KEY=test-secret` for encryption tests

### 7.3 Test Data Strategy

**Factory pattern with builder-style API:**

```typescript
// Pseudocode — NOT implementation
const tournament = await createTestTournament(tx, {
  createdByUserId: 'user_organizer',
  settings: { pairingSystem: 'SWISS', teamSizeMin: 3 },
});

const team = await createTestTeam(tx, {
  tournamentId: tournament.id,
  memberCount: 3,
});
```

**Pre-built scenarios for common states:**

| Scenario | Description |
|---|---|
| `emptyTournament` | Tournament + settings, no participants |
| `registeredTournament` | Tournament + 2 institutions + 8 teams (3 members each) + 4 judges |
| `pairedRound` | Above + 1 round with Swiss pairings + judge assignments + draft ballots |
| `completedRound` | Above + all ballots submitted + debate results computed |
| `multiRoundTournament` | 3 completed rounds + computed standings |

**Teardown strategy:** Truncate all tables after each test file (not each test — too slow with PGlite).

### 7.4 Environment Variables for Testing

```env
# tests/.env.test
DATABASE_URL="(set dynamically by PGlite setup)"
CLERK_SECRET_KEY="test-clerk-secret-key-for-encryption"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_fake"
NEXT_PUBLIC_STREAM_API_KEY="test-stream-key"
STREAM_API_SECRET="test-stream-secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
CLERK_WEBHOOK_SECRET="whsec_test_secret"
PORTAL_TOKEN_TTL_DAYS="14"
NODE_ENV="test"
```

### 7.5 Docker: Not Required

PGlite eliminates the need for Docker in development and CI. If PGlite compatibility issues arise with Prisma 7, the fallback is a GitHub Actions `services: postgres` container (no local Docker needed).

### 7.6 E2E Environment

- **Dev server:** `npm run dev` started by Playwright `webServer` config
- **Database:** Real dev database (or a dedicated test DB seeded before tests)
- **Auth:** Real Clerk test account (requires test credentials in CI secrets)
- **Execution:** Local + CI (on merge or nightly, not every PR due to speed)

---

## 8. Detailed Test Matrix

### 8.1 Institution Creation

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Create institution (happy path) | API | POST returns 201, institution created with name, creator becomes ADMIN member | |
| Unauthenticated create rejected | API, Security | POST returns 401 when no auth | |
| Duplicate name rejected | API | POST returns 409 for existing institution name | Case sensitivity, whitespace |
| Empty/overlong name rejected | API | POST returns 400 for invalid name | `""`, 121+ chars |
| Creator is auto-assigned ADMIN role | Integration | After creation, `InstitutionMember` exists with `role=ADMIN` | |
| Institution view access | Integration | Public institutions viewable by all; private only by members | |

### 8.2 Institution Invitations

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Admin can invite by email | Integration | Invitation created with PENDING status, notification created | |
| Non-admin cannot invite | Integration, Security | Returns error for MEMBER role | |
| Cannot invite self | Integration | Returns specific error message | |
| Cannot invite existing member | Integration | Returns error | |
| Cannot create duplicate pending invite | Integration | Returns error for same user+institution | |
| Accept invitation | Integration | Creates InstitutionMember, sets ACCEPTED, marks notification read | Already-member edge case |
| Decline invitation | Integration | Sets DECLINED, marks notification read | |
| Revoke invitation (admin) | Integration | Sets REVOKED, deletes notification | |
| Non-admin cannot revoke | Integration, Security | Returns error | |
| Cannot accept/decline non-PENDING invite | Integration | Returns error for ACCEPTED/DECLINED/REVOKED invites | |
| Accept invite for wrong user | Security | Returns error when userId doesn't match `invitedUserId` | |

### 8.3 Participant Registration

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Add guest debater | Integration | Creates User + TournamentParticipant with institution | |
| Add guest judge | Integration | Creates User + TournamentParticipant, defaults to "Independent Adjudicators" | |
| Bulk add guests | Integration | Parses multiline names, creates all, returns per-line results | Blank lines, duplicates, 128+ char names |
| Only participant manager can add | Security | Tournament creator and approved institution admin allowed; others rejected | |
| Debater requires institution | Integration | Error when no institution specified for debater | |
| Remove participant | Integration | Deletes TournamentParticipant + cascade; cleans up guest User | Guest vs real user cleanup |
| Get participants respects permissions | Integration | Organizer sees all; institution admin sees their institution; public sees if tournament is public | |

### 8.4 Team Building

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Create team | Integration | Team created with auto-generated name, unique feedback code | |
| Add member to team | Integration | Creates TournamentTeamMember | |
| Remove member from team | Integration | Deletes TournamentTeamMember | |
| Team size validation | Integration | Rejects teams exceeding `teamSizeMax` from settings | |
| Participant can only be in one team | Integration | Unique constraint on `TournamentTeamMember.participantId` | |
| Team name unique per tournament+institution | Integration | Constraint violation handled | |
| Only authorized users can manage teams | Security | Organizer and approved institution admin; others rejected | |
| Create team with institution resolution | Integration | Inline `institutionName` creates new institution, `institutionId` uses existing | |
| Cannot add "Independent Adjudicators" debaters to teams | Integration | Rejects adding judges' institution debaters | |

### 8.5 Pairing Generation

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Swiss pairing generation (orchestrator) | Integration | Reads team records from DB, calls pure algorithm, persists debates + judges + ballots | |
| Only DRAFT rounds can be paired | Integration | Error for PUBLISHED/IN_PROGRESS/COMPLETED rounds | |
| Judge allocation with institution conflicts | Integration | Chairs avoid same institution as teams; warnings for unavoidable conflicts | |
| Existing debates replaced on re-generate | Integration | Old debates/judges/ballots deleted, new ones created | |
| Draft ballots auto-created for each judge | Integration | Each TournamentDebateJudge gets one DRAFT Ballot with 8 BallotSpeech rows | |
| Fewer than 2 teams rejected | Integration | Error message | |
| Admin-only access | Security | Non-admin gets 403 | |

### 8.6 Round Lifecycle

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Create round | API | Sequential number, default DRAFT status | |
| Publish round (DRAFT → PUBLISHED) | API | Status update, motion visible | |
| Start round (PUBLISHED → IN_PROGRESS) | API | Ballots become editable | |
| Complete round (IN_PROGRESS → COMPLETED) | API | Triggers result computation where possible | |
| Invalid transitions rejected | API | Cannot go COMPLETED → DRAFT, etc. | |
| Round belongs to correct tournament | API | Cross-tournament round access rejected | |

### 8.7 Ballot Draft Save

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Save draft with partial data | API | Updates ballot fields, preserves nulls for unset fields | |
| Only owning adjudicator can save | Security | Other users get 403 | |
| Cannot save to SUBMITTED ballot | API | Returns 403 | |
| Cannot save when round is COMPLETED (unless reopened) | API | Returns 403 | |
| Reopened ballot is editable | API | Returns 200 when `reopenedAt` is set | |
| Speech scores stored correctly | API | Decimal precision preserved | |

### 8.8 Ballot Submit

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Submit valid ballot | API | Status → SUBMITTED, totals computed, speeches updated | |
| Zod validation rejects invalid body | API | 400 for missing required fields | |
| Business validation rejects inconsistencies | API | 422 for vote/score mismatch, missing speeches, out-of-range scores | |
| Half-point increment validation | API | Rejects scores not in 0.5 increments | |
| Reply speaker must be Speaker 1 or 2 | API | Rejects Speaker 3 as reply | |
| Vote must match higher total | API | Prop vote rejected when opp total is higher | |
| Cannot submit already-submitted ballot | API | 403 | |
| Result computed when all ballots submitted | Integration | `DebateResult` created with correct winner, averages, vote counts | |
| Chair tiebreaker | Integration | When votes tied, chair's vote wins | |
| 2-judge panel chair-only fallback | Integration | Completed round with 2 judges, only chair submitted → result uses chair ballot | |

### 8.9 Result Computation

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Majority vote determines winner | Integration | 2-1 vote → majority side wins | |
| Tied vote → chair decides | Integration | 1-1 vote → chair's vote is winner | |
| propTotalAvg and oppTotalAvg computed correctly | Integration | Average across all counted ballots | |
| Upsert behavior (re-computation) | Integration | Running again updates existing result | |
| No result when not all ballots submitted | Integration | Returns null | |
| Chair-only fallback for 2-judge completed round | Integration | Special path tested | |

### 8.10 Standings

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Team standings sorted correctly | API | Wins DESC → speaker points DESC → name ASC | |
| Speaker standings computed correctly | API | Per-debate average, then sum across debates | |
| Only completed rounds included by default | API | Draft/published rounds excluded | |
| `includeInProgress=1` adds in-progress rounds | API | Both completed and in-progress included | |
| BYE debates count as win but 0 points | API | Consistent with pure standings logic | |
| Pagination works | API | Page/pageSize params respected | |
| `speakerTopN` setting applied | API | Only top N speakers returned | |
| `hideSpeakerPoints` setting applied | API | Points hidden in response | |

### 8.11 Judge Role Enforcement

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Only JUDGE participants can be assigned to debates | Integration | DEBATER participant rejected | |
| Judge can only be in one debate per round | Integration | Unique constraint on (debateId, participantId) | |
| Chair role: exactly one per debate | Integration | Warning if chair missing, error if two chairs | |
| Portal: only JUDGE role tokens work | Security | Token for non-JUDGE participant rejected | |

### 8.12 Stopwatch Sync

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| GET returns current stopwatch state | API | Running/paused state, elapsed time, version | |
| Start/pause/reset update state | API | State transitions, version increment | |
| Version monotonicity | API | Each change increments version | |
| Elapsed time computation | Unit | `baseElapsedMs + (now - startedAtMs)` when running | |

### 8.13 Access Control to Tournament Resources

| Test | Type | Behavior | Edge Cases |
|---|---|---|---|
| Public tournaments viewable by anyone | API | Unauthenticated GET returns 200 | |
| Private tournaments require auth + role | API | Unauthenticated returns 404, unauthorized returns 404 (not 403, to avoid info leak) | |
| Tournament admin can access everything | API | Creator of tournament has full access | |
| Participant can view their tournament | API | Registered participants can view | |
| Institution member can view tournament | API | Members of registered institutions can view | |
| Cross-tournament access rejected | Security | Ballot from tournament A not accessible via tournament B's endpoint | |

---

## 9. Security Testing Plan

### 9.1 Authentication Tests

| Test | What to verify |
|---|---|
| Every API route rejects `auth() → null` with 401 | Systematically call every POST/PUT/PATCH/DELETE route without auth |
| Every server action rejects `auth() → null` with error | Call each server action with mocked null auth |
| Webhook route validates Svix signature | Invalid/missing signatures return 400 |
| Portal routes reject missing/invalid Bearer token | No token → 401, bad token → 401 |

### 9.2 Authorization Tests (IDOR / Privilege Escalation)

| Test | What to verify |
|---|---|
| User A cannot edit User B's ballot | Mock auth as User A, try to save/submit User B's ballot |
| Non-admin cannot generate pairings | Mock auth as participant, hit generate endpoint |
| Non-admin cannot save manual pairings | Mock auth as participant, hit PUT pairings |
| Non-admin cannot publish/complete rounds | Mock auth as participant, hit round status endpoints |
| Institution member cannot invite (only admin) | Mock auth as MEMBER, try `createInstitutionInvitation` |
| User cannot accept/decline another user's invitation | Mock auth as wrong user |
| Non-organizer cannot add/remove participants | Mock auth as random user |
| Cross-tournament resource access blocked | Valid user tries to access resources in a tournament they're not part of |
| Portal token scoped to correct tournament | Token for tournament A rejected on tournament B endpoints |
| Portal token scoped to correct judge | Token for judge A cannot access judge B's ballot |

### 9.3 Input Validation

| Test | What to verify |
|---|---|
| All Zod schemas reject garbage input | Fuzz each schema with invalid types, overlong strings, injection payloads |
| SQL injection via string inputs | Names, motions, notes with SQL fragments — Prisma should parameterize |
| XSS via string inputs | `<script>alert(1)</script>` in names/motions — verify stored and returned as-is (React escapes on render) |
| Integer overflow in pagination | `page=-1`, `pageSize=99999` |
| Decimal precision attacks on scores | `score=75.123456789` — verify Zod/Prisma handle correctly |

### 9.4 Token Security

| Test | What to verify |
|---|---|
| Expired portal tokens rejected | Token past `expiresAt` returns null |
| Revoked portal tokens rejected | Token with `revokedAt` set returns null |
| Token hash is one-way | Cannot derive plaintext from stored hash |
| Encryption key derived from CLERK_SECRET_KEY | Different key → decryption fails |
| Token format: 32 bytes base64url | Verify length and character set |

### 9.5 Business Logic Abuse

| Test | What to verify |
|---|---|
| Cannot submit ballot twice | Second submit returns 403 |
| Cannot generate pairings for non-DRAFT round | Returns error |
| Cannot delete last admin of institution | Returns specific error |
| Rate limiting on sensitive endpoints | Verify 429 after exceeding limit |

### 9.6 Webhook Security

| Test | What to verify |
|---|---|
| Valid Svix signature accepted | Properly signed payload returns 200 |
| Invalid signature rejected | Tampered payload returns 400 |
| Missing headers rejected | Missing svix-id/timestamp/signature returns 400 |
| Rate limiting on webhook endpoint | 120 req/min limit enforced |

---

## 10. Accessibility Testing Plan

### 10.1 Automated (axe-core via Playwright)

Run axe-core scans on every key page:

| Page | Priority | Key elements to verify |
|---|---|---|
| Landing page | Medium | Headings hierarchy, link text, contrast |
| Sign in / Sign up | High | Form labels, error messages, focus management |
| Dashboard | High | Card semantics, navigation landmarks |
| Tournament overview | High | Tab panel accessibility, data tables |
| Participants page | High | Table semantics, action buttons labeled |
| Teams page (drag-and-drop) | CRITICAL | DnD keyboard alternative, ARIA live regions, focus after drop |
| Round pairings editor | High | Table structure, debate cards, judge assignment controls |
| Ballot entry form | CRITICAL | Form labels, score input labels, speech role labels, error messages, tab order |
| Standings page | High | Data table headers, sortable columns |
| Judge portal (token-gated) | High | Same ballot form checks, portal navigation |
| Institution management | Medium | Member list table, invitation form, dialog accessibility |
| Notification center | Medium | Alert semantics, read/unread state, dismiss action |

### 10.2 Component-Level Checks (Manual or semi-automated)

| Component | What to verify |
|---|---|
| Dialog/AlertDialog (Radix) | Focus trap, Escape to close, return focus on close |
| Select/Dropdown (Radix) | Keyboard navigation, ARIA expanded/selected states |
| Tabs (Radix) | Arrow key navigation, ARIA tab roles |
| Toast/Sonner notifications | ARIA live region, auto-dismiss timing, screen reader announcement |
| Table components | Proper `<th>` with scope, caption or aria-label |
| Pagination controls | Current page announced, disabled states |
| Score input in ballot | Increment/decrement via keyboard, min/max boundaries, label association |
| Command palette (cmdk) | ARIA combobox pattern, keyboard navigation |
| Calendar/DatePicker | Keyboard date selection, ARIA grid pattern |

### 10.3 Manual Checks (Cannot be fully automated)

- Screen reader testing (NVDA/VoiceOver) on ballot submission flow
- High-contrast mode on key pages
- Zoom to 200% without horizontal scrolling
- Touch target sizes on mobile views
- Error message association with form fields (aria-describedby)
- Focus visible indicators on all interactive elements
- Skip-to-content link

### 10.4 Static Analysis (Already Partially in Place)

`eslint-plugin-jsx-a11y` is already installed as a transitive dependency of `eslint-config-next`. Verify it is active by checking the ESLint output — it should flag missing alt text, unlabeled form controls, etc.

---

## 11. CI/CD Strategy

### 11.1 Recommended Pipeline

```
PR opened / updated:
  ├── Lint (ESLint)                     ~30s
  ├── Type check (tsc --noEmit)         ~60s
  ├── Unit tests (vitest --run)         ~5s (existing: 0.67s)
  └── Integration tests (vitest --run)  ~30-60s (with PGlite)

Merge to main:
  ├── All PR checks
  ├── Security tests                    ~30s
  ├── Build (next build)                ~2-3min
  └── E2E smoke (Playwright, 3-5 tests) ~2-3min

Nightly (optional):
  ├── Full E2E suite                    ~5-10min
  ├── Full accessibility scan           ~3-5min
  └── Coverage report generation
```

### 11.2 GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

- **Trigger:** `pull_request` to `main`, `push` to `main`
- **Matrix:** Node 22 (match current dev)
- **Steps:**
  1. Checkout + install deps (cached)
  2. `npx prisma generate` (needed for type generation)
  3. Run lint, typecheck, unit tests in parallel
  4. Run integration tests (PGlite, no external DB needed)
  5. On merge to main: run security tests + build + E2E smoke
- **Required checks for PR:** lint, typecheck, unit tests, integration tests
- **Required checks for deploy:** all of the above + build succeeds

### 11.3 Keeping CI Fast

- PGlite eliminates DB provisioning time
- Vitest is already fast (~0.67s for 71 tests)
- No Docker needed in CI
- Playwright E2E only on merge/nightly (not every PR)
- Parallel test file execution (Vitest default)

### 11.4 Add `test` Script to package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:security": "vitest run tests/security/",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 12. Parallel Agent Execution Plan

### 12.1 Work Breakdown (13 Tracks)

| Track | Name | Dependencies | Can Start Immediately | Files Owned |
|---|---|---|---|---|
| **T0** | **Test Infrastructure** | None | YES | `tests/setup/*`, `tests/factories/*`, `tests/helpers/*`, `vitest.config.ts` update, `vitest.integration.config.ts`, `package.json` scripts |
| **T1** | **Unit: Ballot Validation** | None | YES | `src/lib/ballots/validation.test.ts` |
| **T2** | **Unit: Guards + Security Utils** | None | YES | `src/lib/guards/tournamentSettingsGuards.test.ts`, `src/lib/security/rateLimit.test.ts`, `src/lib/portal/tokens.test.ts`, `src/lib/portal/encryption.test.ts` |
| **T3** | **Integration: Institution Actions** | T0 | After T0 | `tests/integration/actions/invitation.actions.test.ts` |
| **T4** | **Integration: Participant Actions** | T0 | After T0 | `tests/integration/actions/participants.actions.test.ts` |
| **T5** | **Integration: Team Actions** | T0 | After T0 | `tests/integration/actions/teams.actions.test.ts` |
| **T6** | **Integration: API Routes (Institutions + Tournaments)** | T0 | After T0 | `tests/integration/api/institutions.api.test.ts`, `tests/integration/api/tournaments.api.test.ts`, `tests/integration/api/tournament-settings.api.test.ts` |
| **T7** | **Integration: API Routes (Rounds + Pairings)** | T0 | After T0 | `tests/integration/api/rounds.api.test.ts`, `tests/integration/api/pairings.api.test.ts` |
| **T8** | **Integration: Ballot + Result Computation** | T0 | After T0 | `tests/integration/api/ballots.api.test.ts`, `tests/integration/api/ballot-submit.api.test.ts`, `tests/integration/domain/ballot-result-computation.test.ts` |
| **T9** | **Integration: Standings + Portal** | T0 | After T0 | `tests/integration/api/standings.api.test.ts`, `tests/integration/api/portal-auth.api.test.ts`, `tests/integration/api/portal-ballots.api.test.ts`, `tests/integration/domain/portal-token-lifecycle.test.ts` |
| **T10** | **Security Tests** | T0 | After T0 | `tests/security/*` |
| **T11** | **E2E Setup + Core Flows** | T0, build works | After T0 | `e2e/**` |
| **T12** | **CI Pipeline** | T0 | After T0 | `.github/workflows/ci.yml` |

### 12.2 Dependency Graph

```
T0 (Infrastructure) ─────┬──→ T3 (Institution Actions)
                          ├──→ T4 (Participant Actions)
                          ├──→ T5 (Team Actions)
                          ├──→ T6 (API: Institutions/Tournaments)
T1 (Unit: Validation) ──→│   (independent, no deps)
T2 (Unit: Guards) ──────→│   (independent, no deps)
                          ├──→ T7 (API: Rounds/Pairings)
                          ├──→ T8 (API: Ballots/Results)
                          ├──→ T9 (API: Standings/Portal)
                          ├──→ T10 (Security)
                          ├──→ T11 (E2E)
                          └──→ T12 (CI Pipeline)
```

### 12.3 Immediate Start Tracks

- **T0** — Must start first (all integration tracks depend on it)
- **T1** — Can start immediately in parallel with T0
- **T2** — Can start immediately in parallel with T0

### 12.4 File Ownership Boundaries

Each agent ONLY touches files in its assigned track. Specifically:

- T0 agent creates ALL files in `tests/setup/`, `tests/factories/`, `tests/helpers/`
- No other agent creates files in those directories
- T1 and T2 only create colocated `.test.ts` files in `src/lib/`
- T3-T9 only create files in `tests/integration/`
- T10 only creates files in `tests/security/`
- T11 only creates files in `e2e/`
- T12 only creates `.github/workflows/ci.yml` and modifies `package.json` scripts

### 12.5 Merge Risk Warnings

| Risk | Mitigation |
|---|---|
| `package.json` conflicts | Only T0 and T12 modify it. T0 adds dependencies, T12 adds scripts. Merge T0 first. |
| `vitest.config.ts` conflicts | Only T0 modifies the root config. Others use it read-only. |
| Factory API changes | T0 defines factory API. All other tracks use it as-is. If changes needed, T0 agent must update. |
| PGlite setup issues | T0 agent must verify PGlite + Prisma 7 compatibility before other tracks start. |

### 12.6 Suggested PR/Merge Sequence

1. **PR 1:** T0 (test infrastructure) + T1 (unit: validation) + T2 (unit: guards) — merge first
2. **PR 2:** T12 (CI pipeline) — merge second so all subsequent PRs run CI
3. **PR 3-9:** T3 through T9 (integration tests) — can merge in any order after PR 1
4. **PR 10:** T10 (security tests) — can merge after PR 1
5. **PR 11:** T11 (E2E) — merge last (most likely to need iteration)

---

## 13. Phased Roadmap

### Phase 0: Audit + Infrastructure (this plan + T0 implementation)

**Goal:** Establish test infrastructure that all future tests build on.

**Deliverables:**
- This testing plan document (done)
- PGlite-backed Prisma test client setup
- Clerk auth mock helpers
- Test factories for all core entities
- API request builder helpers
- Vitest integration config
- `test` scripts in `package.json`

**Why first:** Everything depends on this. Without factories and a test DB, no integration tests are possible.

**Confidence added:** None yet — this is infrastructure.

**Risks remaining:** All functional risks remain.

### Phase 1: Highest-Value Protective Tests

**Goal:** Cover the flows where a regression would corrupt tournament data or expose security holes.

**Deliverables:**
- T1: Unit tests for ballot validation (score ranges, speech completeness, vote/score consistency)
- T2: Unit tests for guards, portal tokens, encryption, rate limiting
- T8: Integration tests for ballot submission + result computation
- T10 (partial): Security tests for auth guards on all routes + IDOR tests for ballots/tournaments
- T12: CI pipeline running on all PRs

**Why this phase:** Ballot submission is the single riskiest flow — incorrect results corrupt the entire tournament. Auth bypass is the single biggest security risk.

**Confidence added:** "If I change ballot logic, tests catch it before deploy. If I break auth, CI catches it."

**Risks remaining:** Institution/participant flows, team building, round lifecycle, pairings orchestrator, standings, E2E.

### Phase 2: Broader Regression Coverage

**Goal:** Cover the full tournament lifecycle from institution creation through standings.

**Deliverables:**
- T3: Integration tests for institution + invitation actions
- T4: Integration tests for participant actions
- T5: Integration tests for team actions
- T6: Integration tests for institution/tournament/settings API routes
- T7: Integration tests for round/pairing API routes
- T9: Integration tests for standings + portal authentication

**Why this phase:** These are the "plumbing" flows that make up the full tournament lifecycle. Individually lower risk than ballots, but collectively critical.

**Confidence added:** "The full tournament lifecycle works. Registration, teams, pairings, and standings all verified."

**Risks remaining:** E2E coverage, accessibility, remaining security hardening, edge cases.

### Phase 3: Security + Accessibility Hardening

**Goal:** Systematic security coverage and automated accessibility baseline.

**Deliverables:**
- T10 (complete): All security test categories (authorization, IDOR, input validation, webhook, portal token, rate limiting)
- T11: E2E Playwright setup + tournament lifecycle E2E + accessibility scans
- Axe-core integration on key pages

**Why this phase:** Security and accessibility are important but less likely to cause "I shipped something and another thing broke" than data integrity issues. They're also more complex to implement.

**Confidence added:** "Security holes would be caught. Key pages meet basic WCAG 2.1 AA."

**Risks remaining:** Manual accessibility testing, visual regression, performance.

### Phase 4: Remaining Gaps and Quality Improvements

**Goal:** Fill in remaining coverage gaps and add quality-of-life improvements.

**Deliverables:**
- Additional E2E flows (institution management, judge portal, ballot modification)
- Component tests for complex interactive components (ballot form, team builder DnD)
- Coverage reporting and threshold enforcement
- Manual accessibility audit follow-up
- Stopwatch sync tests
- Notification tests
- Dashboard test

**Why last:** These are individually lower risk. The earlier phases already protect the critical paths.

**Confidence added:** Comprehensive coverage. Confidence that new features can be shipped safely.

**Risks remaining:** Visual regression, cross-browser edge cases, performance under load, real Postgres vs PGlite behavioral differences.

---

## 14. Open Questions / Uncertainties

| # | Question | Impact | How to resolve |
|---|---|---|---|
| 1 | **PGlite + Prisma 7 compatibility** — has anyone confirmed PGlite works as a Prisma adapter for schema push/migration in tests? | Blocks T0 | T0 agent should spike this first. Fallback: use `prisma db push` against real local Postgres |
| 2 | **Clerk test accounts for E2E** — does the project have test Clerk users? | Blocks T11 | Check with developer. If not, create test accounts in Clerk dashboard |
| 3 | **No `prisma/seed.ts` found** — is the seed file deleted or was it never created? The `package.json` has a `seed` script pointing to `prisma/seed.ts`. | Affects E2E data setup | Check git history. If deleted intentionally, E2E setup will need its own seeding |
| 4 | **Some API routes query Prisma directly in route handlers** (e.g., standings) rather than through service functions — makes unit testing harder. | Affects test architecture | For these routes, test at the API level rather than extracting pure functions |
| 5 | **`computeDebateResult` is tightly coupled to Prisma** — it reads and writes in one function. | Harder to unit test | Test via integration test (hit real test DB) rather than trying to mock Prisma |
| 6 | **No middleware.ts found** — Clerk route protection may rely solely on `auth()` checks in each route handler. Is this intentional? | Affects security test scope | Verify with developer. If intentional, security tests must verify every handler individually |
| 7 | **The `Tournament.teamMinSize/teamMaxSize` fields are deprecated but still referenced** in some server actions as fallback (`settings?.teamSizeMin ?? tournament.teamMinSize`). | Edge case in team validation tests | Include fallback path in tests |
| 8 | **Stream SDK mocking for component tests** — the `SyncedStopwatch` component directly uses `Call` from `@stream-io/video-react-sdk`. How deeply should this be mocked? | Affects T11 scope | Mock at the SDK level (provide a fake `Call` object). Full Stream testing is out of scope. |

---

## 15. Concrete Next Actions

### Immediate (before any agent starts)

1. **Validate PGlite + Prisma 7 compatibility** — run a quick spike: can you `prisma db push` to a PGlite instance and run a simple query?
2. **Add `test` and `test:watch` scripts to `package.json`**
3. **Decide on Clerk E2E test account** — will E2E tests use real Clerk auth or bypass it?

### First PR (T0 + T1 + T2)

4. **Implement test infrastructure** (T0):
   - `tests/setup/prisma-test-client.ts`
   - `tests/setup/clerk-mock.ts`
   - `tests/setup/next-mock.ts`
   - `tests/factories/*.factory.ts`
   - `tests/helpers/api-request.ts`
   - `vitest.integration.config.ts`
5. **Implement pure unit tests** (T1 + T2) — these can run immediately with no infrastructure

### Second PR (T12)

6. **Create CI pipeline** — `.github/workflows/ci.yml` with lint + typecheck + test

### Parallel PRs (T3-T10)

7. **Hand off integration tracks to parallel agents** — each agent gets this document + the test infrastructure from PR 1

### Final PR (T11)

8. **Implement E2E tests** — after all integration tests are merged and CI is green
