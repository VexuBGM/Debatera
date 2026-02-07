# Tournament Round Management

This document describes the Tournament Round management feature for WSDC format debates in Debatera.

## Overview

Tournament Rounds allow organizers to create, manage, and publish debate pairings. Each round contains multiple debates (pairs of teams), with judges assigned to each debate.

## Data Model

### Entities

#### TournamentRound
A single round in a tournament (e.g., "Round 1", "Quarterfinals").

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (cuid) |
| tournamentId | String | Reference to the tournament |
| number | Int | Sequential round number (unique per tournament) |
| name | String | Display name (editable, defaults to "Round {number}") |
| status | TournamentRoundStatus | Current status of the round |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

#### TournamentRoundStatus (Enum)
- `DRAFT` - Initial state, pairings can be edited
- `PUBLISHED` - Pairings are visible to participants, cannot be edited
- `IN_PROGRESS` - Round is currently being debated
- `COMPLETED` - All debates in the round have finished

Status transitions:
```
DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED
```
No backwards transitions are allowed.

#### TournamentDebate
A single debate (pairing) within a round.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (cuid) |
| roundId | String | Reference to the round |
| order | Int | Position in the round (for UI ordering) |
| propTeamId | String? | Proposition team (nullable for BYE) |
| oppTeamId | String? | Opposition team (nullable for BYE) |
| isBye | Boolean | True if this is a BYE (one team advances without debating) |

#### TournamentDebateJudge
Junction table linking judges to debates.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Unique identifier (cuid) |
| debateId | String | Reference to the debate |
| participantId | String | Reference to TournamentParticipant (must have role=JUDGE) |

**Constraints:**
- A judge (participantId) can only be assigned to ONE debate per round
- Enforced via unique constraint on (debateId, participantId)

### BYE Rules
- Created when there's an odd number of teams
- Exactly one of propTeamId/oppTeamId is set, the other is null
- BYE debates do NOT require judges

## API Endpoints

### Rounds

#### GET /api/tournaments/[tournamentId]/rounds
Lists all rounds for a tournament.
- **Admin**: sees all rounds including DRAFT
- **Non-admin**: only sees PUBLISHED, IN_PROGRESS, COMPLETED

Response:
```json
{
  "rounds": [
    { "id": "...", "number": 1, "name": "Round 1", "status": "DRAFT", ... }
  ]
}
```

#### POST /api/tournaments/[tournamentId]/rounds
Creates a new round.
- **Admin only**
- Automatically assigns next sequential number
- Defaults name to "Round {number}"

Request body (optional):
```json
{ "name": "Quarterfinals" }
```

#### GET /api/tournaments/[tournamentId]/rounds/[roundId]
Returns round details with debates and judges.
- Access control same as list endpoint

#### PATCH /api/tournaments/[tournamentId]/rounds/[roundId]
Updates round name and/or status.
- **Admin only**

Request body:
```json
{ "name": "New Name", "status": "PUBLISHED" }
```

**Validation before PUBLISHED:**
- All non-BYE debates must have both teams
- All non-BYE debates must have at least 1 judge

### Pairings

#### GET /api/tournaments/[tournamentId]/rounds/[roundId]/pairings
Returns full pairings data for the round editor.
- Includes debates, teams, judges, and unassigned items
- Access control same as round endpoint

Response:
```json
{
  "round": { ... },
  "allTeams": [...],
  "allJudges": [...],
  "unassignedTeams": [...],
  "unassignedJudges": [...],
  "isAdmin": true
}
```

#### PUT /api/tournaments/[tournamentId]/rounds/[roundId]/pairings
Saves manual pairings edits.
- **Admin only**
- **DRAFT rounds only**

Request body:
```json
{
  "debates": [
    {
      "debateId": "...",
      "order": 0,
      "propTeamId": "team1",
      "oppTeamId": "team2",
      "isBye": false,
      "judgeParticipantIds": ["judge1", "judge2", "judge3"]
    }
  ]
}
```

**Validation:**
- No team appears in multiple debates
- No judge appears in multiple debates
- Every non-BYE debate has both teams
- Every non-BYE debate has at least 1 judge

#### POST /api/tournaments/[tournamentId]/rounds/[roundId]/generate
Auto-generates random pairings.
- **Admin only**
- **DRAFT rounds only**
- **Idempotent**: replaces all existing debates

## Auto-Generate Algorithm

The auto-generate feature creates random pairings using this algorithm:

### Team Pairing
1. Load all TournamentTeams for the tournament
2. Shuffle teams randomly (Fisher-Yates)
3. Create debates by sequential pairing: (team0 vs team1), (team2 vs team3), ...
4. If odd number of teams: last team gets a BYE

### Judge Distribution
Goal: Assign odd panel sizes where possible (1, 3, 5, ...).

1. Load all TournamentParticipants with role=JUDGE
2. If judges < debates: return error (need at least 1 judge per debate)
3. Shuffle judges randomly
4. **Pass 1**: Assign 1 judge to each non-BYE debate
5. **Pass 2**: Distribute remaining judges in pairs (2 at a time) round-robin to maintain odd panels (1→3→5...)
6. **Final**: If exactly 1 judge remains, add to first debate (creates even panel, triggers warning)

### Warnings (do not block, just inform)
- Same-institution matchup: propTeam.institutionId === oppTeam.institutionId
- Judge conflict: judge.institutionId matches either team's institutionId
- Even panel: debate has even number of judges

## UI / Pages

### Admin: Round List
Path: `/tournaments/[id]/rounds`

Features:
- List all rounds with status badges
- Create new round (dialog)
- Navigate to round editor

### Admin: Round Editor
Path: `/tournaments/[id]/rounds/[roundId]`

Features:
- Edit round name (inline)
- Status badge and transitions
- Action buttons:
  - Auto-generate pairings
  - Save changes
  - Publish (validates before allowing)
  - Mark In Progress
  - Complete

**Drag-and-Drop Editor:**
- Left panel: Unassigned Teams
- Center: List of Debate Cards
- Right panel: Unassigned Judges

**Debate Card:**
- Proposition slot (droppable)
- Opposition slot (droppable)
- Judges list (droppable)
- Actions: Swap teams, Remove team, Toggle BYE
- Inline warnings for conflicts

**DnD Behavior:**
- Drag teams between debates or to/from unassigned
- Drag judges between debates or to/from unassigned
- Invalid drops are prevented
- Visual feedback during drag

### Non-Admin: Round View
Path: `/tournaments/[id]/rounds` and `/tournaments/[id]/rounds/[roundId]`

Features:
- Read-only view of published rounds
- Shows pairings and judges
- Only sees rounds with status != DRAFT

## Authorization

**Tournament Admin**: Currently defined as `tournament.createdByUserId === userId`

Future extension: The `isTournamentAdmin()` and `requireTournamentAdmin()` helpers in `lib/tournamentRounds/authorization.ts` can be extended to support:
- Multiple admins per tournament
- Role-based access (owner, admin, moderator)
- Institutional admin roles

**Access Rules:**
- Create/edit rounds: Admin only
- View DRAFT rounds: Admin only
- View PUBLISHED+ rounds: Everyone
- Generate pairings: Admin only, DRAFT rounds only
- Edit pairings: Admin only, DRAFT rounds only
- Status transitions: Admin only

## Known Limitations / Future Work

### Current Limitations
1. **Simple random pairing**: No power-matching, bracket seeding, or Swiss pairing
2. **No conflict avoidance**: Same-institution matchups are warned but not prevented
3. **Single admin**: Only tournament creator is admin
4. **No undo**: Generating pairings replaces all data
5. **No debate results**: No scoring or results tracking yet

### Planned Enhancements
1. **Swiss pairing algorithm**: Match teams by win record
2. **Power matching**: Use speaker scores for pairings
3. **Judge constraints**: Hard/soft blocks, preference levels
4. **Multiple admins**: Role-based tournament management
5. **Result entry**: Scores, rankings, speaker awards
6. **Tab/adjudicator core**: Full tabulation system
7. **Room assignment**: Physical/virtual room allocation

## File Structure

```
src/
├── lib/
│   └── tournamentRounds/
│       ├── index.ts           # Re-exports
│       ├── authorization.ts   # Admin checks
│       ├── validation.ts      # Zod schemas
│       ├── queries.ts         # Database queries
│       ├── generatePairings.ts # Auto-generate logic
│       └── savePairings.ts    # Manual save logic
├── app/
│   └── api/
│       └── tournaments/
│           └── [id]/
│               └── rounds/
│                   ├── route.ts           # GET/POST rounds
│                   └── [roundId]/
│                       ├── route.ts       # GET/PATCH round
│                       ├── pairings/
│                       │   └── route.ts   # GET/PUT pairings
│                       └── generate/
│                           └── route.ts   # POST generate
│   └── (main)/
│       └── (home)/
│           └── tournaments/
│               └── [id]/
│                   └── rounds/
│                       ├── page.tsx       # Round list
│                       └── [roundId]/
│                           ├── page.tsx   # Round editor
│                           ├── types.ts   # TypeScript types
│                           ├── RoundEditor.tsx
│                           ├── DebateCard.tsx
│                           ├── DraggableItem.tsx
│                           ├── DroppablePanel.tsx
│                           └── DroppableSlot.tsx
```
