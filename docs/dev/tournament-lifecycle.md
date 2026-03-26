# Tournament Lifecycle

This document traces the full lifecycle of a tournament in Debatera, from creation to final standings.

---

## 1. Tournament Creation

**Who:** Any authenticated user.

**Steps:**
1. User fills the "New Tournament" form (`src/app/(main)/(home)/tournaments/new/`).
2. Client calls `src/lib/services/mvp.ts` → `createTournament()`.
3. A `Tournament` record is created with `isPublic = false` (default).
4. A `TournamentSettings` record is created with default values.

**Result:** Tournament in a configurable draft state, visible only to the creator.

---

## 2. Tournament Configuration

**Who:** Tournament creator.

**Settings updated via:** `PATCH /api/tournaments/[id]/settings` (Zod schema: `src/lib/validations/tournamentSettings.ts`).

Key decisions the organizer makes:
- **Event mode:** `ONLINE` (Stream video) or `IRL` (venues).
- **Pairing system:** `SWISS` (recommended), `RANDOM`, or `MANUAL`.
- **Registration window:** `registrationOpensAt` / `registrationClosesAt`.
- **Team size limits:** `teamSizeMin` / `teamSizeMax`.
- **Public visibility:** which tabs non-authenticated visitors can see.

---

## 3. Institution Registration

**Who:** Institution ADMINs.

**Flow:**
1. Institution ADMIN submits a registration request → `POST /api/tournaments/[id]/institution-registrations`.
2. Request is created with status `PENDING`.
3. Tournament creator reviews → `PATCH /api/tournaments/[id]/institution-registrations/[id]` with `APPROVED` or `REJECTED`.

Only institutions with status `APPROVED` can register participants.

---

## 4. Participant Registration

**Who:** Institution ADMINs (on behalf of their institution).

**Debaters:**
- `POST /api/tournaments/[id]/participants` with `role: DEBATER`.
- Creates a `TournamentParticipant` linking the user, institution, and tournament.
- Registration guard `assertRegistrationOpen()` is checked; returns error if outside the window.

**Judges:**
- Same endpoint, `role: JUDGE`.

**Guest participants:**
- Handled by `src/lib/domains/participants/guestParticipants.ts`.
- Guest participants get synthetic user IDs (not Clerk accounts).
- `parseGuestParticipantNames()` handles bulk name input.

**Uniqueness:** A user can only appear once per tournament (`@@unique([tournamentId, userId])`).

---

## 5. Team Building

**Who:** Institution ADMIN or tournament creator.

**Flow:**
1. Create a team → `POST /api/tournaments/[id]/teams` or `src/actions/teams.actions.ts` → `createTeam()`.
   - Team name is auto-generated: `"<Institution Name> 1"`, `"<Institution Name> 2"`, etc.
2. Assign debaters to the team → `src/actions/teams.actions.ts` → `addDebatersToTeam()`.
   - `assertValidTeamSize()` guard checks bounds.
   - A debater cannot be in more than one team (DB `@unique` on `TournamentTeamMember.participantId`).
3. Remove debaters if needed → `removeDebatersFromTeam()`.

**Scope resolution:** `src/lib/domains/teams/teamManagementScope.ts` → `resolveTeamManagementScope()` determines whether the acting user can manage a given team (institution admin of that institution, or tournament creator).

---

## 6. Round Creation

**Who:** Tournament creator.

**Flow:**
1. `POST /api/tournaments/[id]/rounds` — creates a `TournamentRound` with status `DRAFT`.
2. Round gets a sequential `number` and a display `name`.
3. Organizer sets the `motion` (debate topic) and optional `infoSlide`.

Status lifecycle: `DRAFT` → `PUBLISHED` → `IN_PROGRESS` → `COMPLETED`

---

## 7. Generating Pairings

**Who:** Tournament creator.

**Flow:**
1. `POST /api/tournaments/[id]/rounds/[roundId]/generate` — triggers pairing generation.
2. The pairing system is read from `TournamentSettings.pairingSystem`.

**Swiss pairing** (default):
- `src/lib/tournamentRounds/generatePairings.ts` calls `src/lib/pairings/generateSwissPairings.ts`.
- Uses `computeSwissData.ts` to load team win records and prior matchups.
- Seeded RNG (`seededRng.ts`) ensures deterministic tie-breaking.
- Avoids same-institution matchups where possible (`institutionConflict.ts`).
- BYE debates are created for odd numbers of teams.

**Manual pairings:**
- Organizer sets `propTeamId` / `oppTeamId` directly.

**Saving:**
- `src/lib/tournamentRounds/savePairings.ts` persists `TournamentDebate` records in a transaction.

---

## 8. Round Publication

**Who:** Tournament creator.

**Flow:**
1. Organizer assigns judges to debates (via round management UI).
2. Optionally assigns venues (IRL) — manually or via auto-allocate (`src/lib/venues/autoAllocate.ts`).
3. `PATCH /api/tournaments/[id]/rounds/[roundId]` with `status: PUBLISHED`.
4. On publication, ballots are created for each judge in each debate → `src/lib/ballots/createBallots.ts`.

**Ballot creation:** One `Ballot` record (status `DRAFT`) is created per `TournamentDebateJudge`. No ballot data is pre-populated.

---

## 9. Debates

**IRL debates:**
- Participants go to the physical venue.
- Stopwatch is available via the debate UI (`PATCH /api/debates/[debateId]/stopwatch`).

**ONLINE debates:**
- Round status must be `IN_PROGRESS` or `PUBLISHED` for the video room to be accessible.
- `src/lib/stream/eligibility.ts` checks if the user's role allows joining.
- Accessing the call page triggers `POST /api/stream/calls/ensure` (creates `VideoCall` record) then `POST /api/stream/token` (generates Stream JWT).
- All participants share a synchronized stopwatch (`DebateStopwatch`).

---

## 10. Ballots

**Who:** Assigned judges (via app or judge portal).

See [ballots-and-results.md](./ballots-and-results.md) for the full judging flow.

**Short version:**
1. Judge opens their ballot (status `DRAFT`).
2. Enters speech scores and selects a winning side.
3. Submits → status moves to `SUBMITTED`.
4. When all ballots for a debate are submitted, `computeDebateResult()` fires and creates/updates `DebateResult`.

---

## 11. Standing Computation

**When:** On-demand via `GET /api/tournaments/[id]/standings`.

**How:**
- `src/lib/domains/reporting/service.ts` → `getTournamentStandings()` fetches all debate results for the tournament.
- `src/lib/domains/reporting/computeStandings.ts` → `computeStandings()` is a pure function that ranks teams.
- Tie-break order: **wins DESC → total points DESC → team name ASC** (alphabetical, deterministic).

**Visibility rules:** `src/lib/domains/reporting/policy.ts` → `canViewTournamentStandings()` enforces `publicTabs` and `isPublic` settings.

---

## 12. Round Completion

**Who:** Tournament creator.

`PATCH /api/tournaments/[id]/rounds/[roundId]` with `status: COMPLETED`.

When a round is marked `COMPLETED` with a 2-judge panel where only the chair has submitted:
- `computeDebateResult()` includes a fallback path — chair-only result is allowed (see `src/lib/ballots/computeResult.ts:canUseChairOnlyFallback`).

---

## State Summary

```
Tournament
  └── TournamentRound
        DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED

Ballot (per judge per debate, created at round publication)
  DRAFT → SUBMITTED → (reopened back to DRAFT via modification request)

DebateResult (computed when all ballots submitted)
  Created once, upserted on resubmission
```

---

## Known Gaps / Incomplete Features

- **No concept of elimination rounds.** All rounds use the same `TournamentRound` model. Break brackets are not yet implemented.
- **No automated round progression.** The organizer manually advances round status.
- **Pairing editing after generation** is supported via manual mode but has no dedicated UI flow for partial edits.
- **Venue assignment for ONLINE events** is not blocked at the API level (only the UI restricts it).
