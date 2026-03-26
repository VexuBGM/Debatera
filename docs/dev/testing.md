# Testing

## Test Runner

**Vitest** v4 is the test runner. Configuration is inferred from `package.json` (no separate `vitest.config.ts` is present).

```bash
npx vitest run          # Run all tests once
npx vitest              # Watch mode
npx vitest run --reporter=verbose   # Verbose output
```

---

## Current Test Coverage

All existing tests cover **pure business logic with no database calls**. There are no integration tests, API route tests, or end-to-end tests.

### Test Files

| File | What it tests |
|---|---|
| `src/lib/domains/reporting/computeStandings.test.ts` | Standings ranking algorithm — wins, tie-breaking by points and name |
| `src/lib/domains/reporting/filterTopSpeakers.test.ts` | Speaker ranking by average points, top-N filtering |
| `src/lib/domains/participants/participants.test.ts` | Participant domain logic |
| `src/lib/domains/participants/guestParticipants.test.ts` | Guest user ID generation and name parsing |
| `src/lib/domains/teams/teamManagementScope.test.ts` | Who can manage a given team (scope resolution) |
| `src/lib/pairings/swissPairing.test.ts` | Swiss pairing algorithm correctness |
| `src/lib/ballots/modificationRequests.test.ts` | Ballot modification request logic |
| `src/lib/users/displayName.test.ts` | Display name fallback logic |
| `src/lib/security/url.test.ts` | URL sanitization and open-redirect prevention |

---

## What Is Not Tested

The following areas have no automated test coverage:

- **All API routes** (`src/app/api/`) — no tests exist for any route handler
- **Server Actions** (`src/actions/`) — no tests
- **Database queries** — all Prisma queries are untested
- **Auth flows** — Clerk integration is untested
- **Ballot submission end-to-end** — the submission + result computation pipeline is not tested as a whole
- **Portal token generation/validation** — `src/lib/portal/` has no tests
- **Stream integration** — `src/lib/stream/` has no tests
- **Venue auto-allocation** — `src/lib/venues/autoAllocate.ts` has no tests
- **Round publishing** — ballot creation on publish is untested

---

## Safe Change Checklist

Before modifying any of these areas, add or verify tests:

### High-risk, low coverage

| Area | Risk | Test needed |
|---|---|---|
| `src/lib/ballots/computeResult.ts` | Incorrect result computation produces wrong standings | Unit test for all vote combinations, tie scenarios, chair fallback |
| `src/lib/pairings/` | Pairing bugs affect the entire tournament | ✅ Has tests — verify edge cases (BYE, institution conflicts) |
| `src/lib/domains/reporting/computeStandings.ts` | Wrong tie-break order distorts standings | ✅ Has tests — verify before any change |
| `src/lib/tournamentRounds/savePairings.ts` | Transaction failure leaves partial data | Integration test with DB transaction rollback |
| `src/lib/portal/auth.ts` | Token validation bypass = unauthorized ballot access | Unit test for expired, revoked, and invalid tokens |
| `src/lib/guards/tournamentSettingsGuards.ts` | Wrong guard logic = registration data corruption | Unit tests for boundary conditions |

### Medium-risk

| Area | Risk |
|---|---|
| `src/lib/ballots/createBallots.ts` | Ballots not created or duplicated on round publish |
| `src/lib/ballots/authorization.ts` | Judges accessing each other's ballots |
| `src/lib/domains/teams/teamManagementScope.ts` | Wrong scope allows unauthorized team edits |

---

## Testing Philosophy

From `.claude/docs/conventions.md`:
> Business rules must not live only in the UI. Critical rules must exist in server logic and database constraints.

This means the most important things to test are:
1. Pure domain logic (already has good coverage in `src/lib/domains/`)
2. Authorization checks in API routes and actions
3. Database constraint behavior (integration tests)
4. Guard functions for edge cases

---

## Recommended Next Tests to Write

In priority order:

1. **`computeDebateResult()` unit tests** — cover 1-judge, 3-judge, tie scenarios, chair fallback for 2-judge rounds.
2. **Portal auth tests** — expired token, revoked token, wrong tournament, valid token.
3. **Guard boundary tests** — `assertRegistrationOpen()` with dates at the exact boundary.
4. **`createBallots()` tests** — correct number of ballots created per judge assignment.
5. **`autoAllocate()` tests** — all debates assigned, priority respected, active venues only.

---

## No Mocking Policy

Current tests are pure functions and require no mocking. For future tests that involve DB or Clerk:
- Prefer real test database over mocking Prisma (avoids mock/prod divergence).
- If mocking is necessary, mock at the module boundary, not inside the function under test.
