# Ballots and Results

## Overview

Debatera uses per-judge WSDC-format ballots. Each assigned judge submits one ballot per debate. When all ballots are submitted, the debate result is computed automatically via majority vote with chair tie-break.

---

## Ballot States

```
DRAFT → SUBMITTED → DRAFT (if reopened via modification request)
```

A `Ballot` record is created (status `DRAFT`) for each `TournamentDebateJudge` when the round is published. See `src/lib/ballots/createBallots.ts`.

---

## Speech Roles (WSDC Format)

Eight speech slots are recorded per ballot:

| Role | Side |
|---|---|
| `PROP_1` | PROPOSITION |
| `PROP_2` | PROPOSITION |
| `PROP_3` | PROPOSITION |
| `PROP_REPLY` | PROPOSITION |
| `OPP_1` | OPPOSITION |
| `OPP_2` | OPPOSITION |
| `OPP_3` | OPPOSITION |
| `OPP_REPLY` | OPPOSITION |

Defined in `src/lib/ballots/constants.ts`: `PROP_ROLES`, `OPP_ROLES`.

Each speech is stored as a `BallotSpeech` with a `score` (decimal, e.g., `75.5`), optional `comment`, and optional `speakerId` (linking to `TournamentTeamMember`). The `side` field is redundant with `role` but stored for easier queries.

---

## Ballot Authorization

`src/lib/ballots/authorization.ts` determines who can access a ballot:

- **View (DRAFT):** The assigned judge only.
- **Edit:** The assigned judge while ballot is `DRAFT`.
- **View (SUBMITTED):** The assigned judge or the tournament creator.
- **Submit:** The assigned judge, ballot must be `DRAFT`.

---

## Submitting a Ballot

**Endpoint:** `POST /api/ballots/[ballotId]/submit`

**Flow:**
1. Validate request body with Zod (schema in `src/lib/ballots/validation.ts`).
2. Check authorization (`ballotAuthorization()`).
3. In a single transaction (`prisma.$transaction`):
   - Upsert all `BallotSpeech` rows.
   - Compute `propTotal` and `oppTotal` from speech scores.
   - Set `ballot.vote` (winning side chosen by this judge).
   - Set `ballot.status = SUBMITTED`, `ballot.submittedAt = now()`.
4. Call `computeDebateResult(debateId)` — see result computation below.
5. Return the updated ballot and result (if computed).

**Portal version:** `POST /api/tournaments/[id]/portal/ballots/[id]/submit` — same logic, different auth (token-based).

---

## Result Computation

`src/lib/ballots/computeResult.ts` → `computeDebateResult(debateId)`

**Triggers:** Called after every ballot submission. Returns `null` if not all ballots are in yet.

**Normal flow (all ballots submitted):**
1. Count `voteProp` and `voteOpp` across all submitted ballots.
2. Majority wins.
3. **Tie:** The chair's vote decides (`decidedByChair = true`).
4. Compute average speech totals: `propTotalAvg`, `oppTotalAvg`.
5. Upsert `DebateResult`.

**Special case — 2-judge panel, round COMPLETED:**
If the round is marked `COMPLETED` and only 2 judges were assigned but only the chair has submitted, the chair ballot alone can stand as the official result (`canUseChairOnlyFallback`). This handles situations where a panelist fails to submit before the organizer closes the round.

```typescript
canUseChairOnlyFallback =
  round.status === COMPLETED &&
  debate.judges.length === 2 &&
  submittedBallots.length === 1 &&
  chairBallot !== null
```

**Edge case:** If votes are tied and there is no chair ballot (e.g., no chair assigned), `winningSide` falls back to `PROPOSITION`. This is a defensive fallback and should not occur in normal operation.

---

## Standings Computation

**Entry point:** `src/lib/domains/reporting/service.ts` → `getTournamentStandings()`

**Steps:**
1. Fetch all `DebateResult` rows for the tournament (via `src/lib/domains/reporting/queries.ts`).
2. Pass to pure function `computeStandings()` (`src/lib/domains/reporting/computeStandings.ts`).
3. Return ranked `StandingsRow[]`.

**Ranking algorithm (`computeStandings`):**
- For each team, count wins and sum total average points across all their debates.
- Sort: **wins DESC → totalPoints DESC → teamName ASC** (alphabetical for full determinism).

**Speaker standings:**
- `filterTopSpeakers()` (`src/lib/domains/reporting/filterTopSpeakers.ts`) ranks individual speakers by average points across submitted ballots.
- `speakerTopN` in `TournamentSettings` truncates the list. `null` = show all.
- `hideSpeakerPoints` suppresses numeric display.

---

## Ballot Modification Requests

**Who can request:** Any tournament participant (debater or judge).
**Who resolves:** Tournament creator.

**Flow:**
1. Participant submits `POST /api/ballots/[id]/modification-request` with an optional `reason`.
2. Creates `BallotModificationRequest` with status `PENDING`.
3. Tournament creator reviews all requests via `GET /api/tournaments/[id]/ballot-modification-requests`.
4. Creator resolves: `PATCH /api/tournaments/[id]/ballot-modification-requests/[id]` with `APPROVED` or `REJECTED` and optional `resolutionNote`.
5. On `APPROVED`:
   - `ballot.status` is reset to `DRAFT`.
   - `ballot.reopenedAt` and `ballot.reopenedByUserId` are set.
   - Judge can now edit and resubmit the ballot.
   - `DebateResult` is not automatically recomputed — a resubmission triggers recomputation.

**Implementation:** `src/lib/ballots/modificationRequests.ts`.

---

## Known Issues / Technical Debt

- **No validation that the chair is among the assigned judges.** The application assumes a chair exists; if not, tie resolution falls back to `PROPOSITION` silently.
- **`DebateResult` is not automatically deleted** when a ballot is reopened. A stale result persists until the judge resubmits. Standing queries may show outdated results during this window.
- **Speaker scores** can be submitted without a `speakerId`. These scores contribute to team totals but are excluded from individual speaker rankings.
