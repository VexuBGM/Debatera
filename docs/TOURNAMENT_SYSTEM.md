# Tournament System

This document describes the tournament system implementation for Debatera.

## Overview

The tournament system provides end-to-end functionality for running debate tournaments with:
- Multi-organizer tournament management
- Team registration and management
- Automatic round draw generation (Swiss/power pairing)
- Automatic judge allocation with cost-based optimization
- Manual override capabilities for organizers
- Standings computation with tie-breakers

## Database Schema

### New Models

#### TournamentOrganizer
Manages multi-organizer tournaments.
- `tournamentId` - UUID reference to Tournament
- `userId` - UUID reference to User
- `role` - OrganizerRole enum (OWNER, ORGANIZER)
- `addedAt` - Timestamp when organizer was added

#### Round
Represents a tournament round.
- `id` - UUID primary key
- `tournamentId` - UUID reference to Tournament
- `number` - Round number (1, 2, 3, ...)
- `stage` - RoundStage enum (PRELIM, ELIM)
- `isPublished` - Boolean, false = draft, true = published
- `createdAt` - Timestamp

#### Updated: Debate
- Added `roundId` - UUID reference to Round (optional for backwards compatibility)

### Enums

- `OrganizerRole`: OWNER, ORGANIZER
- `RoundStage`: PRELIM (preliminary/Swiss), ELIM (elimination/knockout)

## API Endpoints

### Tournament Management

#### POST /api/tournaments/:id/organizers
Add an organizer to a tournament.
- **Auth**: Must be tournament organizer or admin
- **Body**: `{ userId: string, role?: 'OWNER' | 'ORGANIZER' }`
- **Returns**: Created TournamentOrganizer with user details

#### GET /api/tournaments/:id/organizers
List all organizers for a tournament.
- **Returns**: Array of TournamentOrganizer with user details

#### POST /api/tournaments/:id/rounds
Create a new round for a tournament.
- **Auth**: Must be tournament organizer or admin
- **Body**: `{ stage?: 'PRELIM' | 'ELIM' }`
- **Returns**: Created Round (auto-increments round number)

#### GET /api/tournaments/:id/rounds
List all rounds for a tournament with debates and participants.
- **Returns**: Array of Rounds with nested debates, teams, and participants

#### GET /api/tournaments/:id/standings
Get current standings for a tournament.
- **Returns**: Array of standings ordered by wins, then opponent strength

### Round Management

#### POST /api/rounds/:roundId/generate-draw
Generate automatic pairing for a round.
- **Auth**: Must be tournament organizer or admin
- **Behavior**:
  - Round 1: Random pairing
  - Later rounds: Power pairing by wins with pull-ups for odd brackets
  - Avoids rematches (hard constraint)
  - Attempts side balancing (Prop/Opp)
- **Returns**: Generated debates with teams

#### POST /api/rounds/:roundId/allocate-judges
Automatically allocate judges to debates.
- **Auth**: Must be tournament organizer or admin
- **Body**: Optional weights `{ importanceWeight?, conflictPenalty?, strengthMismatchPenalty? }`
- **Algorithm**: Greedy cost-based allocation considering:
  - Judge strength vs debate importance
  - Conflicts (judge has judged team before)
  - Load balancing across judges
- **Returns**: Debates with allocated judges

#### GET /api/rounds/:roundId/draw
Get the current draw for a round.
- **Returns**: Round with all debates, teams, and participants

#### PATCH /api/rounds/:roundId/draw
Manually edit the draw (swap teams, change judges).
- **Auth**: Must be tournament organizer or admin
- **Cannot edit**: Published rounds
- **Body**: `{ debates: [{ id, propTeamId?, oppTeamId?, judges?: [judgeId] }] }`
- **Returns**: Updated round with debates

#### POST /api/rounds/:roundId/publish
Publish a round (locks it and makes it visible to participants).
- **Auth**: Must be tournament organizer or admin
- **Validates**: Round has at least one debate
- **Returns**: Published round

## Services

### pairingService.ts

#### `generatePrelimDraw(tournamentId, roundNumber)`
Generates Swiss/power pairing draw for a preliminary round.

**Algorithm:**
1. **Round 1**: Random shuffle and pair consecutively
2. **Later rounds**:
   - Compute team history (wins, side counts, opponents faced)
   - Group teams into brackets by wins
   - Apply pull-ups for odd-sized brackets
   - Pair within brackets:
     - Avoid rematches (hard constraint)
     - Balance sides (prefer assigning teams to side they've done less)
     - Random tiebreak

#### `generateRoundDraw(tournamentId, roundNumber, stage)`
High-level function that:
1. Checks if round already exists
2. Generates pairings
3. Creates round and debates in transaction
4. Returns round ID

### judgeAllocationService.ts

#### `autoAllocateJudges(roundId, options)`
Allocates judges to debates using greedy cost optimization.

**Cost Function:**
- Strength mismatch penalty: weak judges on important debates
- Conflict penalty: judge has judged team before (very high)
- Load balancing: prefer judges with fewer allocations

**Algorithm:**
1. Calculate debate importance (round number + team win bracket)
2. Get judge strengths (based on past feedback count)
3. Identify conflicts (past judge-team pairings)
4. Sort debates by importance (highest first)
5. For each debate, assign judge with lowest cost
6. Update database in transaction

### standingsService.ts

#### `computeStandings(tournamentId)`
Computes standings for all teams in a tournament.

**Metrics:**
- Wins (primary sort key)
- Opponent strength / Buchholz (secondary - average wins of opponents faced)
- Also tracks: losses, prop/opp counts

Returns sorted array of StandingRow objects.

## Authorization

### Permission Levels

1. **Admin**: Full access to all tournaments
2. **Tournament Creator**: Automatically has organizer rights
3. **Added Organizers**: Users added via TournamentOrganizer
4. **Participants**: Read-only after round publication

### Helper Functions (lib/auth.ts)

- `requireAuth()` - Require any authenticated user
- `requireAdmin()` - Require admin role
- `requireTournamentOrganizer(tournamentId)` - Require organizer/admin for tournament
- `isTournamentOrganizer(userId, tournamentId)` - Check if user is organizer

## Workflow

### Typical Tournament Flow

1. **Setup**
   - Admin/user creates tournament (POST /api/tournaments)
   - Add organizers (POST /api/tournaments/:id/organizers)
   - Teams register (POST /api/teams with tournamentId)

2. **Round 1**
   - Create round (POST /api/tournaments/:id/rounds)
   - Generate draw (POST /api/rounds/:id/generate-draw)
   - Allocate judges (POST /api/rounds/:id/allocate-judges)
   - Optional: Manual adjustments (PATCH /api/rounds/:id/draw)
   - Publish (POST /api/rounds/:id/publish)

3. **Run Debates**
   - Participants join debates
   - Judges provide feedback
   - Organizer sets winningSide on debates

4. **Subsequent Rounds**
   - Create next round
   - Generate draw (now uses power pairing based on wins)
   - Allocate judges (considers debate importance from brackets)
   - Optional: Manual adjustments
   - Publish
   - Repeat

5. **View Standings**
   - Check standings anytime (GET /api/tournaments/:id/standings)
   - Updated automatically after each result

## Features Implemented

### ✅ Completed

- [x] Prisma schema with Round, TournamentOrganizer models
- [x] Multi-organizer support
- [x] Round creation and management
- [x] Automatic draw generation
  - [x] Random pairing for round 1
  - [x] Power pairing by win brackets
  - [x] Pull-up logic for odd brackets
  - [x] Rematch avoidance
  - [x] Side balancing
- [x] Automatic judge allocation
  - [x] Cost-based optimization
  - [x] Conflict detection
  - [x] Importance calculation
- [x] Manual draw editing
- [x] Round publishing
- [x] Standings computation
  - [x] Wins as primary metric
  - [x] Buchholz tie-breaker
- [x] Authorization system for organizers
- [x] Seed data with sample tournament

### 🚧 Future Enhancements

- [ ] Elimination (knockout) bracket generation
- [ ] Institution/club conflict handling
- [ ] Multi-judge panels (chair/wing roles)
- [ ] Pre-formed panels
- [ ] Speaker points tracking
- [ ] Audit log for sensitive changes
- [ ] UI for drag-and-drop round builder
- [ ] Bye handling (currently team is skipped)
- [ ] Email notifications on round publish

## Testing

### Manual Testing

To test the API endpoints, you can use curl or a tool like Postman:

```bash
# Create a tournament
curl -X POST http://localhost:3000/api/tournaments \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tournament", "description": "Test"}'

# Add organizer
curl -X POST http://localhost:3000/api/tournaments/{id}/organizers \
  -H "Content-Type: application/json" \
  -d '{"userId": "{userId}", "role": "ORGANIZER"}'

# Create round
curl -X POST http://localhost:3000/api/tournaments/{id}/rounds \
  -H "Content-Type: application/json" \
  -d '{"stage": "PRELIM"}'

# Generate draw
curl -X POST http://localhost:3000/api/rounds/{roundId}/generate-draw

# Allocate judges
curl -X POST http://localhost:3000/api/rounds/{roundId}/allocate-judges

# Get standings
curl http://localhost:3000/api/tournaments/{id}/standings
```

### Seed Data

Run `npm run prisma:seed` to populate the database with:
- 8 teams in "National Championship 2025"
- 1 completed round with results
- Multiple users (admin, judges, team members)

## Configuration

### Environment Variables

No additional environment variables are required. The system uses existing DATABASE_URL.

### Pairing Weights (Future)

The pairing and allocation algorithms support customizable weights:
- `PAIRING_SIDE_BALANCE_WEIGHT` - How much to prefer side balance
- `JUDGE_COST_WEIGHTS` - Importance, conflict penalty, strength mismatch

Currently hardcoded in services but can be moved to configuration.

## Notes

### Backward Compatibility

- `Debate.roundId` is optional to maintain compatibility with existing debates
- Existing API endpoints remain unchanged
- Tournament system is additive, doesn't break existing features

### Performance Considerations

- Pairing algorithm is O(n²) for rematch checking - suitable for tournaments up to ~500 teams
- Judge allocation is greedy O(n*m) where n=debates, m=judges
- Standings computation is O(n) where n=teams

### Design Decisions

1. **Greedy vs Optimal**: Using greedy allocation for simplicity; Hungarian algorithm could be added later
2. **Side Balance**: Soft constraint (best effort) rather than hard requirement
3. **Conflicts**: Based on past judge-team pairings; institution-based conflicts future work
4. **Round Publishing**: One-way operation; unpublishing would require additional logic
5. **Transaction Safety**: All multi-step operations wrapped in Prisma transactions
