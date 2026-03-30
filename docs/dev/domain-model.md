# Domain Model

Source of truth: [`prisma/schema.prisma`](../../prisma/schema.prisma).

---

## Entity Groups

### Users & Auth

**`User`** — Local mirror of a Clerk user. Created/updated on every authenticated page load via `ensureUser()`. The primary key is the Clerk user ID (`varchar(128)`).

Key fields: `email`, `firstName`, `lastName`, `displayName`, `bio`, `pronouns`, `publicEmail`, `imageUrl`.

> Note: `username` field is deprecated and kept only for backward compatibility.

**`InstitutionMember`** — Join table linking a `User` to an `Institution` with a role.
Roles: `ADMIN`, `MEMBER`. A user can belong to multiple institutions.

**`InstitutionInvitation`** — Pending/accepted/declined invitations to join an institution.
Statuses: `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED`.
Unique constraint prevents duplicate pending invitations for the same user+institution.

---

### Institutions

**`Institution`** — A school, club, or organization. Teams and participants are registered under an institution.
`isPublic` controls visibility in public listings.
Name must be globally unique.

---

### Tournaments

**`Tournament`** — Top-level entity. Created by one user (`createdByUserId`). Has a single optional `TournamentSettings` record.

Key fields: `name`, `isPublic`, `registrationClosesAt`.

> Note: `teamMinSize` and `teamMaxSize` on `Tournament` are **deprecated**. These values have moved to `TournamentSettings` and should be read from there.

**`TournamentSettings`** — 1:1 with `Tournament`. Holds all configurable options.

| Field                                          | Type            | Purpose                                                                                                         |
| ---------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `registrationOpensAt` / `registrationClosesAt` | `DateTime?`     | Registration window                                                                                             |
| `teamSizeMin` / `teamSizeMax`                  | `Int`           | Min/max debaters per team (1–10)                                                                                |
| `debateFormat`                                 | `DebateFormat`  | Currently only `WSDC`                                                                                           |
| `eventMode`                                    | `EventMode`     | `ONLINE` or `IRL`                                                                                               |
| `pairingSystem`                                | `PairingSystem` | `SWISS`, `RANDOM`, or `MANUAL`                                                                                  |
| `showDebaterNames`                             | `Boolean`       | Display individual names instead of team names in standings                                                     |
| `speakerTopN`                                  | `Int?`          | Show only top N speakers; `null` = show all                                                                     |
| `hideSpeakerPoints`                            | `Boolean`       | Hide numeric scores in speaker standings                                                                        |
| `publicTabs`                                   | `String[]`      | Which tabs are visible to unauthenticated visitors (`overview`, `rounds`, `teams`, `standings`, `participants`) |

**`TournamentInstitution`** — Institution registration in a tournament.
Statuses: `PENDING`, `APPROVED`, `REJECTED`.
Must be approved before the institution's participants can register.

**`TournamentParticipant`** — A user registered in a specific tournament under a specific institution.
Roles: `DEBATER`, `JUDGE`.
Unique per `(tournamentId, userId)` — a user can only hold one role per tournament.

---

### Teams

**`TournamentTeam`** — A debating team within a tournament. Always belongs to an institution.
Name is auto-generated as `"<Institution Name> 1"`, `"<Institution Name> 2"`, etc.
Name uniqueness is enforced per `(tournamentId, institutionId, name)`.

**`TournamentTeamMember`** — Links a `TournamentParticipant` (debater) to a `TournamentTeam`.
A participant can be in **at most one team** per tournament (enforced via `@unique` on `participantId`).

---

### Rounds & Debates

**`TournamentRound`** — A round within a tournament. Has a sequential `number` and display `name`.
Stores the `motion` (debate topic) and optional `infoSlide`.

Statuses (lifecycle order): `DRAFT` → `PUBLISHED` → `IN_PROGRESS` → `COMPLETED`

**`TournamentDebate`** — A single debate pairing within a round.

- `propTeamId` / `oppTeamId` — proposition and opposition teams (nullable for BYE debates).
- `isBye` — true if one team has no opponent.
- `venueId` — assigned venue (nullable; set by auto-allocator or manually, IRL only).
- `order` — stable display ordering within the round.

**`TournamentDebateJudge`** — Junction table assigning a judge (`TournamentParticipant` with role `JUDGE`) to a debate.
Roles: `CHAIR` (exactly one per debate, breaks ties), `PANELIST` (zero or more).
A judge can only be assigned to one debate per round (enforced at application level, not DB).

---

### Venues (IRL only)

**`Venue`** — A physical room for IRL debates. Has a `priority` (higher = preferred by auto-allocator) and `isActive` flag.

**`VenueCategory`** — Tags for venues (e.g., `"Wheelchair Accessible"`, `"Building A"`). Many-to-many with `Venue`.

---

### Ballots & Results

**`Ballot`** — One per judge per debate. Tracks the judge's vote and speech scores.

Key fields:

- `vote: Side?` — `PROPOSITION` or `OPPOSITION`
- `propTotal` / `oppTotal` — computed server-side from speech scores
- `status` — `DRAFT` or `SUBMITTED`
- `privateNotes` — visible only to the organizer
- `reopenedAt` / `reopenedByUserId` — set when a submitted ballot is reopened

**`BallotSpeech`** — Individual speech score within a ballot.
One row per `(ballotId, role)`. Roles: `PROP_1`, `OPP_1`, `PROP_2`, `OPP_2`, `PROP_3`, `OPP_3`, `OPP_REPLY`, `PROP_REPLY`.
`speakerId` links to `TournamentTeamMember` (nullable; can record scores without speaker identity).

**`BallotModificationRequest`** — A participant's request to reopen a submitted ballot.
Statuses: `PENDING`, `APPROVED`, `REJECTED`. Organizer resolves with an optional `resolutionNote`.

**`DebateResult`** — Computed once all ballots for a debate are submitted. Stores:

- `winningSide` / `winningTeamId`
- `voteProp` / `voteOpp` — raw vote counts
- `propTotalAvg` / `oppTotalAvg` — average speech totals across all ballots
- `decidedByChair` — true when result was determined by tie-break

---

### Portal & Real-time

**`TournamentParticipantAccessLink`** — Token-based judge portal access. One per participant.
`tokenHash` (SHA-256) is used for DB lookup. `encryptedToken` (AES-256-GCM) allows organizers to regenerate the link URL. Default TTL: 14 days (configurable via `PORTAL_TOKEN_TTL_DAYS`).

**`VideoCall`** — Stream SDK call record. Created on-demand for ONLINE debates. `callId` is the Stream call identifier (format: `"debate_<debateId>"`).

**`DebateStopwatch`** — Synced timer state for video debate rooms. Uses monotonic `version` counter for conflict detection. Updated via `PATCH /api/debates/[id]/stopwatch`.

---

### Notifications

**`Notification`** — In-app notifications per user.
Types: `INSTITUTION_INVITE`, `GENERAL`.
Polled every 30 seconds by the client. No push mechanism exists.

---

## Relationship Summary

```
User
 ├── InstitutionMember[]        → Institution
 ├── TournamentParticipant[]    → Tournament, Institution
 │    ├── TournamentTeamMember  → TournamentTeam
 │    ├── TournamentDebateJudge[] → TournamentDebate
 │    │    └── Ballot            → BallotSpeech[]
 │    └── TournamentParticipantAccessLink
 └── Tournament[]
      ├── TournamentSettings
      ├── TournamentInstitution[]
      ├── TournamentTeam[]
      ├── TournamentRound[]
      │    └── TournamentDebate[]
      │         ├── TournamentDebateJudge[]
      │         ├── Ballot[]
      │         │    └── BallotSpeech[]
      │         ├── DebateResult
      │         ├── VideoCall
      │         └── DebateStopwatch
      └── Venue[]
```

---

## ID Conventions

| Model                   | ID format                  |
| ----------------------- | -------------------------- |
| `User`                  | Clerk user ID (`user_...`) |
| `Institution`           | `inst_<uuid>`              |
| `InstitutionMember`     | `imem_<uuid>`              |
| `Tournament`            | `tourn_<uuid>`             |
| `InstitutionInvitation` | `inv_<uuid>`               |
| `Notification`          | `notif_<uuid>`             |
| Most other models       | `cuid()`                   |
