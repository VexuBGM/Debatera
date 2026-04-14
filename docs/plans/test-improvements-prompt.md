# Test Improvements — Agent Prompt

**Scope:** Fill the remaining gaps in Debatera's test suite after the initial implementation sprint.  
**Do not** rewrite or duplicate tests that already exist. Add only what is missing.

---

## Context: What Already Exists

Debatera is a Next.js 16 (App Router) debate tournament management platform — WSDC format only (3v3, 8 speeches per debate).

The existing suite has three layers, all using **Vitest**:

| Layer | Command | Location |
|---|---|---|
| Unit tests | `npm test` | `src/lib/**/*.test.ts` (colocated) |
| Integration tests | `npm run test:integration` | `tests/integration/**/*.test.ts` |
| Security tests | `npm run test:security` | `tests/security/*.security.test.ts` |

Playwright E2E tests exist as stubs in `e2e/tests/` but are out of scope for this task.

### Existing Unit Tests (do not re-implement)

- `src/lib/pairings/swissPairing.test.ts` — Swiss algorithm (brackets, BYEs, rematches, side balance, RNG)
- `src/lib/domains/reporting/computeStandings.test.ts` — standings computation
- `src/lib/domains/reporting/filterTopSpeakers.test.ts` — top-N speaker filtering
- `src/lib/domains/participants/guestParticipants.test.ts` — name parsing
- `src/lib/domains/participants/participants.test.ts` — guest participant Zod schemas
- `src/lib/domains/teams/teamManagementScope.test.ts` — `canManageInstitution`
- `src/lib/ballots/modificationRequests.test.ts` — ballot edit state machine
- `src/lib/ballots/validation.test.ts` — WSDC ballot schema + `validateBallotSubmission`
- `src/lib/guards/tournamentSettingsGuards.test.ts` — registration open/closed guards
- `src/lib/portal/encryption.test.ts` — AES-GCM encryption round-trip
- `src/lib/portal/tokens.test.ts` — token generation, hashing, TTL, expiry
- `src/lib/security/rateLimit.test.ts` — in-memory rate limiter
- `src/lib/security/url.test.ts` — URL normalization, portal link building
- `src/lib/users/displayName.test.ts` — display name fallback chain

### Existing Integration Tests (do not re-implement)

- `tests/integration/domain/ballot-result-computation.test.ts` — majority vote, chair tie-break, 2-judge fallback
- `tests/integration/domain/portal-token-lifecycle.test.ts` — token lifecycle
- `tests/integration/actions/invitation.actions.test.ts`
- `tests/integration/actions/participants.actions.test.ts`
- `tests/integration/actions/teams.actions.test.ts`
- `tests/integration/api/ballot-submit.api.test.ts`
- `tests/integration/api/institutions.api.test.ts`
- `tests/integration/api/notifications.api.test.ts`
- `tests/integration/api/pairings.api.test.ts`
- `tests/integration/api/portal-ballots.api.test.ts`
- `tests/integration/api/rounds.api.test.ts`
- `tests/integration/api/standings.api.test.ts`
- `tests/integration/api/stream.api.test.ts`
- `tests/integration/api/tournament-settings.api.test.ts`
- `tests/integration/api/tournaments.api.test.ts`

### Existing Security Tests (do not re-implement)

- `tests/security/auth-guards.security.test.ts`
- `tests/security/authorization.security.test.ts`
- `tests/security/input-validation.security.test.ts`
- `tests/security/portal-token.security.test.ts`
- `tests/security/webhook-validation.security.test.ts`

---

## Infrastructure Reference

Before writing any test, read the following files to understand the test infrastructure:

- **Test DB client:** `tests/setup/prisma-test-client.ts` — PGlite-backed in-memory Postgres. Use `testPrisma` for direct DB queries.
- **Auth mock:** `tests/setup/clerk-mock.ts` — `mockAuthenticatedUser({ id, email })` / `mockUnauthenticatedUser()`
- **Integration setup:** `tests/setup/vitest.integration.setup.ts` — resets DB between tests
- **Factories:** `tests/factories/` — `createUser`, `createTournament`, `createInstitution`, `createTournamentTeam`, `createTournamentParticipant`, `createRound`, `createDebate`, `createJudgeAssignment`, `createBallot`, `buildValidBallotSubmission`
- **Fixtures:** `tests/fixtures/tournament-scenarios.ts` — `createSingleDebateScenario`
- **API helpers:** `tests/helpers/api-request.ts` (`createJsonRequest`, `responseJson`) and `tests/helpers/assert-api-response.ts` (`expectJsonError`)
- **Action helpers:** `tests/helpers/assert-action-response.ts` (`expectActionSuccess`, `expectActionFailure`)
- **Vitest configs:**
  - Integration: `vitest.integration.config.ts`
  - Security: `vitest.security.config.ts`
  - Unit: `vitest.config.ts`

For integration tests, import from `@tests/` alias (maps to `tests/`). For source, import from `@/` (maps to `src/`).

---

## WSDC Format Rules (domain knowledge for test correctness)

All debates use **WSDC (World Schools Debating Championship)** format:

| Speech | Role constant | Score range | Increment |
|---|---|---|---|
| 1st–3rd Prop/Opp constructive | `PROP_1`, `OPP_1`, `PROP_2`, `OPP_2`, `PROP_3`, `OPP_3` | 60–80 | 0.5 |
| Prop/Opp reply | `PROP_REPLY`, `OPP_REPLY` | 30–40 | 0.5 |

**Speech order:** `PROP_1 → OPP_1 → PROP_2 → OPP_2 → PROP_3 → OPP_3 → OPP_REPLY → PROP_REPLY`

**Reply speaker rule:** The reply speech must be delivered by Speaker 1 or Speaker 2 from that side — never Speaker 3. The `validateBallotSubmission` function in `src/lib/ballots/validation.ts` enforces this via `validateReplySpeaker`.

**Winner determination:** The team with the higher total speaker points wins. The judge's `vote` field must be consistent with the score totals. Tie scores are arithmetically impossible in practice (6 constructives × 0.5 increments = can be equal only in degenerate cases, but the validator must still reject inconsistent votes).

**Panel composition:**
- Solo judge: 1 chair. Their vote determines the winner.
- 2-judge panel: normally waits for both; special fallback — if the round is COMPLETED and only the chair has submitted, the chair ballot is used as the official result.
- 3-judge panel: majority vote (2-1). If tied 1-1 (even panels ≥ 4 judges), the chair's vote breaks the tie.

**Swiss pairing constraints (for pairing tests):**
1. Pair within the same win-bracket first (fold-in: top half of bracket faces bottom half).
2. Avoid rematches. If unavoidable, issue a warning.
3. Avoid same-institution matchups. If unavoidable, issue a warning.
4. Balance proposition/opposition assignments — a team with 2 prop assignments and 0 opp should be assigned opp.
5. BYE is given to the lowest-ranked team; a team that already had a BYE is avoided.

---

## Tasks

Implement the following in order of priority. Each task is one file unless stated otherwise.

---

### TASK 1 — Unit: Institution Conflict Detection

**File to create:** `src/lib/tournamentRounds/institutionConflict.test.ts`

Read `src/lib/tournamentRounds/institutionConflict.ts` before writing. It exports two pure functions:
- `hasInstitutionConflict(judgeInstitutionId, propInstitutionId, oppInstitutionId): boolean`
- `isJudgeEligibleForDebate(judge, debate): boolean`

Write the following tests:

```
hasInstitutionConflict
  ✓ returns false when judgeInstitutionId is null
  ✓ returns false when judgeInstitutionId is undefined
  ✓ returns true when judge matches propInstitutionId
  ✓ returns true when judge matches oppInstitutionId
  ✓ returns false when judge matches neither team
  ✓ returns false when prop and opp institution IDs are null (judge has an institution)
  ✓ returns false when judge matches an institution but both teams have null institutions

isJudgeEligibleForDebate
  ✓ returns true when judge has no institution conflict with either team
  ✓ returns false when judge shares institution with the prop team
  ✓ returns false when judge shares institution with the opp team
  ✓ returns true when judge.institutionId is an empty string (treated as no institution)
```

---

### TASK 2 — Unit: Ballot Authorization Pure Functions

**File to create:** `src/lib/ballots/authorization.test.ts`

Read `src/lib/ballots/authorization.ts` before writing. The file exports two synchronous pure functions (no DB):
- `canEditBallot(userId, context): boolean`
- `canViewBallotDetails(userId, context): boolean`

The `BallotAccessContext` shape (from the source file):
```typescript
{
  ballotStatus: BallotStatus;
  ballotAdjudicatorParticipantUserId: string;
  roundStatus: TournamentRoundStatus;
  tournamentCreatorUserId: string;
  ballotReopenedAt: Date | null;
}
```

Write the following tests. Import `BallotStatus` and `TournamentRoundStatus` from `@prisma/client`.

```
canEditBallot
  ✓ allows the owning adjudicator to edit a DRAFT ballot during IN_PROGRESS round
  ✓ allows the owning adjudicator to edit a reopened DRAFT after round COMPLETED
  ✓ blocks a different user from editing (even with valid ballot state)
  ✓ blocks editing a SUBMITTED ballot even for the owning judge
  ✓ blocks editing when round is COMPLETED and ballot was not reopened

canViewBallotDetails
  ✓ tournament organizer can view any ballot in any round status
  ✓ owning adjudicator can view their ballot when round is IN_PROGRESS
  ✓ owning adjudicator can view their ballot when round is COMPLETED
  ✓ owning adjudicator cannot view their ballot when round is DRAFT (not yet started)
  ✓ owning adjudicator cannot view their ballot when round is PUBLISHED
  ✓ a third-party user (neither organizer nor adjudicator) cannot view the ballot
```

---

### TASK 3 — Unit: Ballot Validation Edge Cases (extend existing file)

**File to extend:** `src/lib/ballots/validation.test.ts`

Read the existing file first. The existing `validSubmission()` helper builds a valid WSDC ballot with Prop winning. Add the following missing test cases to the `validateBallotSubmission` describe block:

```
validateBallotSubmission (additional cases)
  ✓ accepts the exact minimum constructive score (60)
  ✓ accepts the exact maximum constructive score (80)
  ✓ rejects a constructive score of 59.5 (below minimum)
  ✓ rejects a constructive score of 80.5 (above maximum)
  ✓ accepts the exact minimum reply score (30)
  ✓ accepts the exact maximum reply score (40)
  ✓ rejects a reply score of 29.5 (below minimum)
  ✓ rejects a reply score of 40.5 (above maximum)
  ✓ rejects OPP_REPLY delivered by OPP_3 speaker (only OPP_1 or OPP_2 allowed)
  ✓ accepts OPP_REPLY delivered by OPP_2 speaker
  ✓ rejects a vote for PROPOSITION when totals are exactly equal (tie)
  ✓ rejects a vote for OPPOSITION when totals are exactly equal (tie)
```

For the tie cases: construct a submission where all constructive scores are 70 and all reply scores are 35 for both sides. Total = 70×3 + 35 = 245 each. Vote for either side must error on the `vote` field.

For the OPP_REPLY cases: `validSubmission()` uses `prop_1` for `PROP_REPLY`. Mirror that pattern to construct OPP scenarios and set `speakerId` to the OPP_3 participant's ID.

---

### TASK 4 — Unit: Round Status Transition State Machine

**File: `src/lib/tournamentRounds/validation.ts`**

Read the file. `isValidStatusTransition` currently always returns `true` — this is a stub. Implement a real state machine:

**Allowed transitions:**
- `DRAFT` → `PUBLISHED`
- `PUBLISHED` → `IN_PROGRESS`
- `PUBLISHED` → `DRAFT` (organizer can un-publish before the round starts)
- `IN_PROGRESS` → `COMPLETED`
- `IN_PROGRESS` → `PUBLISHED` (organizer rewind, e.g. to fix pairings)

**Blocked transitions (all others):** Any transition not in the list above should return `false`.

After fixing `isValidStatusTransition`, **create** `src/lib/tournamentRounds/validation.test.ts` with:

```
isValidStatusTransition
  ✓ DRAFT → PUBLISHED is allowed
  ✓ PUBLISHED → IN_PROGRESS is allowed
  ✓ PUBLISHED → DRAFT is allowed
  ✓ IN_PROGRESS → COMPLETED is allowed
  ✓ IN_PROGRESS → PUBLISHED is allowed
  ✗ DRAFT → IN_PROGRESS is blocked (skips PUBLISHED)
  ✗ DRAFT → COMPLETED is blocked
  ✗ COMPLETED → any status is blocked (no un-completing)
  ✗ same-status transition (DRAFT → DRAFT) is blocked
```

**Important:** After changing `isValidStatusTransition`, verify the existing rounds API integration test in `tests/integration/api/rounds.api.test.ts` still passes. It tests DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED which must all still be allowed. If the route currently ignores `isValidStatusTransition`, find where status updates happen in `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts` and wire it in — reject with a 400 if the transition is invalid.

---

### TASK 5 — Integration: Venue Actions

**File to create:** `tests/integration/actions/venues.actions.test.ts`

Read `src/actions/venues.actions.ts` and `src/lib/venues/autoAllocate.ts` before writing.

The action file exports: `createVenue`, `updateVenue`, `deleteVenue`, `getTournamentVenues`, `autoAllocateVenuesToRound`.

Follow the pattern in `tests/integration/actions/teams.actions.test.ts`. Use the existing factories.

```
venue actions
  ✓ organizer can create a venue for their tournament
  ✓ created venue is persisted with correct defaults (isActive: true, priority: 0)
  ✓ organizer can update venue name and priority
  ✓ organizer can deactivate a venue (isActive: false)
  ✓ non-organizer cannot create a venue (returns { success: false })
  ✓ unauthenticated call is rejected

auto-allocate venues
  ✓ assigns highest-priority venues to debates in order
  ✓ when there are more venues than debates, surplus venues are unused
  ✓ when there are fewer venues than debates, returns a warning and partially allocates
  ✓ BYE debates are skipped during allocation (do not consume a venue)
  ✓ non-organizer cannot trigger auto-allocation
```

For auto-allocate tests you need to create a round with debates using `createRound` and `createDebate` from `tests/factories/round.factory.ts`. Create venues directly via `testPrisma.venue.create(...)`.

**ONLINE tournament guard:** The `assertIRLMode` call in venue creation means venue actions should fail for ONLINE tournaments. Add:
```
  ✓ returns an error when the tournament is in ONLINE mode
```

To create an ONLINE tournament, pass `settings: { eventMode: 'ONLINE' }` to `createTournament`.

---

### TASK 6 — Integration: Profile Actions

**File to create:** `tests/integration/actions/profile.actions.test.ts`

Read `src/actions/profile.actions.ts` and `src/lib/services/profile.ts` before writing.

```
profile actions
  ✓ authenticated user can update their display name
  ✓ display name update is persisted in the database
  ✓ rejects a display name that exceeds the schema maximum length
  ✓ unauthenticated call returns { success: false }
  ✓ trims leading/trailing whitespace from display name
```

---

### TASK 7 — Integration: Swiss Pairing Orchestrator (DB layer)

**File to create:** `tests/integration/domain/swiss-pairing-orchestrator.test.ts`

Read `src/lib/pairings/generateSwissPairings.ts` and `src/lib/tournamentRounds/generatePairings.ts` before writing. The orchestrator reads team records from the DB, calls the pure Swiss algorithm, and persists debates + judge ballot stubs.

This tests the full loop from DB → algorithm → DB. The pure algorithm is already unit-tested in `src/lib/pairings/swissPairing.test.ts` — do not re-test pure logic here.

```
Swiss pairing orchestrator
  ✓ generates pairings for round 1 and persists the correct number of debates
  ✓ creates draft ballots for each judge–debate assignment after generating pairings
  ✓ dry-run mode returns pairings without writing debates to the database
  ✓ with 8 teams creates 4 debates (or 3 debates + 1 BYE if Swiss leaves a bye)
  ✓ after round 1 results, round 2 uses match points from round 1 (verifies DB feed)
  ✓ returns warnings for institution conflicts that cannot be avoided
```

For the round-2 test: create 4 teams, generate round 1, mark all debates as completed with results via `testPrisma` directly, then generate round 2. Assert that the teams with 1 win are paired against each other (not against 0-win teams).

---

### TASK 8 — Integration: Round Lifecycle Domain Tests

**File to create:** `tests/integration/domain/round-lifecycle.test.ts`

This differs from `tests/integration/api/rounds.api.test.ts` (which tests HTTP routes) — here we test the domain-level business rules that govern the round state machine and ballot completion requirements.

```
round lifecycle
  ✓ a round cannot be published when any debate is missing its prop team
  ✓ a round cannot be published when any debate is missing its opp team
  ✓ a round cannot be published when any debate has no judges assigned
  ✓ a BYE debate does not require a judge to be assigned for publication
  ✓ a fully configured round transitions to PUBLISHED correctly
  ✓ completing a round with all ballots submitted sets status to COMPLETED
  ✓ completing a round with unsubmitted ballots: the 2-judge chair fallback is triggered if round is COMPLETED and only chair submitted
  ✓ completing a round with unsubmitted ballots (3-judge panel, 1 missing): result is NOT computed
```

For the publication-validation tests, read `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts` to find the validation logic for `PUBLISHED` status and test it at the domain level (call the validation function directly if it is extracted, or set up the full API call via the route handler if it is not).

---

### TASK 9 — Integration: Team Building Constraints

**File to create:** `tests/integration/domain/team-building-constraints.test.ts`

Read `src/actions/teams.actions.ts` before writing. The relevant actions are `assignDebaterToTeam`, `bulkAddDebatersToTeam`, and `createTeam`.

```
team size constraints
  ✓ cannot add more members than teamSizeMax (default 5)
  ✓ adding the exact maximum number of debaters succeeds
  ✓ adding a debater who is already on the team is rejected
  ✓ a debater cannot be on two teams in the same tournament
  ✓ bulk-add respects teamSizeMax and stops at the limit
  ✓ tournament settings teamSizeMin is enforced when submitting pairings (team with too few members cannot be paired)
```

For the pairing constraint test: use a tournament with `teamSizeMin: 3`, add only 2 debaters to a team, then attempt to publish the round and verify rejection.

---

### TASK 10 — Security: IDOR (Insecure Direct Object Reference)

**File to create:** `tests/security/idor.security.test.ts`

Read `tests/security/authorization.security.test.ts` for the pattern. Import route handlers directly and call them with mocked auth.

The existing `authorization.security.test.ts` covers some IDOR cases. This file adds the **cross-resource** cases:

```
IDOR: ballot access
  ✓ Judge A cannot GET Judge B's ballot details (403)
  ✓ Judge A cannot POST to submit Judge B's ballot (403)
  ✓ Judge cannot save a ballot draft that belongs to a different judge (403)

IDOR: cross-tournament isolation
  ✓ user from tournament A cannot read standings of tournament B (if tournament B is not public)
  ✓ judge from tournament A cannot access a ballot from tournament B via portal API (401/403)

IDOR: portal token scoping
  ✓ a portal token for tournament A cannot be used to access tournament B's portal ballot
  — this is covered in portal-token.security.test.ts, verify it exists before adding
```

Use `createSingleDebateScenario` for quick setup. Create two separate tournaments for cross-tournament tests.

---

### TASK 11 — Security: Rate Limit Enforcement (Integration)

**File to create:** `tests/security/rate-limiting.security.test.ts`

Read `src/lib/security/rateLimit.ts` and the existing `src/lib/security/rateLimit.test.ts` (which tests the rate limiter in isolation). This file tests the limiter as applied to actual API routes.

Find which API routes call `rateLimit` (search `src/app/api/` for `rateLimit` imports). As of writing, portal ballot endpoints and potentially the webhook route use it.

```
rate limiting on portal ballot API
  ✓ portal ballot route allows N requests per window (confirm the limit constant)
  ✓ portal ballot route returns 429 with Retry-After header after exceeding limit
  ✓ two different subjects (different IPs / tokens) have independent buckets

rate limiting headers
  ✓ responses below the limit include X-RateLimit-Remaining or similar headers (if implemented)
```

Use `vi.useFakeTimers()` to test window resets without real time passing, matching the pattern in `src/lib/security/rateLimit.test.ts`.

---

## Implementation Notes

### Do not

- Re-implement tests that already exist (listed at the top).
- Add snapshot tests — they are brittle and add no value for business logic.
- Add tests for simple property getters or Prisma queries with no logic.
- Add component tests (React Testing Library) — there are no component tests in the suite and adding infrastructure for them is out of scope.

### Follow existing patterns

- Integration tests: start with `const organizer = await createUser(...)` and build up from there.
- Always use `mockAuthenticatedUser({ id: user.id, email: user.email })` before calling server actions or API routes that require auth.
- Use `expectActionSuccess` / `expectActionFailure` from `tests/helpers/assert-action-response.ts` for server actions.
- Use `expectJsonError(response, statusCode, messagePart)` from `tests/helpers/assert-api-response.ts` for API routes.
- Keep test IDs globally unique per file to avoid PGlite unique constraint violations across tests in the same run: prefix with a short string unique to the test file, e.g., `createUser({ id: 'idor_judge_a' })`.

### Running tests locally

```bash
npm test                        # unit tests
npm run test:integration        # integration tests (PGlite)
npm run test:security           # security tests

# Run a single file
npx vitest run src/lib/tournamentRounds/institutionConflict.test.ts
npm run test:integration -- --run tests/integration/actions/venues.actions.test.ts
```

---

## Acceptance Criteria

Every task is done when:
1. All new tests pass (`npm test`, `npm run test:integration`, `npm run test:security` as appropriate).
2. No existing tests are broken.
3. `npx tsc --noEmit` reports no type errors.
4. Test IDs in factories are unique and do not collide with IDs used in existing test files.
