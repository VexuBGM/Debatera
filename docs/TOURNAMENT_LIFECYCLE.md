# Tournament Lifecycle - Tabbycat-style Implementation

This document describes the complete tournament lifecycle implemented in Debatera following the Tabbycat model.

## Overview

The system implements a complete tournament management flow with four main phases:

1. **Tournament Creation**
2. **Registration Phase**
3. **Check-in Process**
4. **Competition/Rounds**

## Tournament Statuses

Tournaments progress through these statuses:

- `DRAFT` - Tournament is being set up
- `REGISTRATION` - Teams and adjudicators can register
- `LIVE` - Tournament is actively running
- `COMPLETED` - Tournament has finished

## Phase 1: Creating the Tournament

### Steps:

1. **Create Tournament** (`/tournaments` → "Create Tournament")
   - Name, description, dates
   - Initial status: `DRAFT`
   - Registration is open by default

2. **Setup Tournament (Admin)** (`/tournaments/[id]/admin`)
   - Add **Venues**: Physical or virtual rooms where debates happen
   - Create **Rounds**: Preliminary, Break, or Final rounds
   - Add **Motions**: Debate topics for each round

3. **Open Registration**
   - Change tournament status to `REGISTRATION` via the tournament detail page
   - This allows teams and adjudicators to register

## Phase 2: Registration

### Team Registration

**URL**: `/tournaments/[id]/register/team`

- Teams provide:
  - Team name
  - Optional: Speaker names
- Creates a Team record linked to the tournament
- Sets `isRegistered = true`

### Adjudicator Registration

**URL**: `/tournaments/[id]/register/adjudicator`

- Adjudicators provide:
  - Experience rating (0-10)
  - Independent status (no team affiliation)
- Creates an Adjudicator record linked to the tournament
- Rating is used for allocation in draws

## Phase 3: Check-in

**URL**: `/tournaments/[id]/checkin`

Before each round, participants must check in to confirm availability:

### Check-in Process:

1. Select the round (Round 1, Round 2, etc.)
2. Mark teams as AVAILABLE or UNAVAILABLE
3. Mark adjudicators as AVAILABLE or UNAVAILABLE

This helps tournament organizers know who is present and ready to debate/judge.

## Phase 4: Competition

### Running Rounds

1. **View Round Details**: `/tournaments/[id]/rounds/[roundId]`
   - Shows the draw (pairings)
   - Displays the motion if released
   - Lists all debates in the round

2. **Create Debates** (via API)
   - Each debate pairs two teams (Prop vs Opp)
   - Assigned to a venue
   - Part of a specific round
   - Can have a scheduled time

3. **Join Debates**
   - When debate status is `LIVE`, participants can join
   - Clicking "Join" takes them to `/debate/[id]`
   - The existing debate room interface is used (preserved design)

4. **Submit Ballots** (via API: `/api/debates/[id]/ballots`)
   - Adjudicators submit:
     - Winning side (PROP or OPP)
     - Speaker scores
     - Comments
   - Status: DRAFT or CONFIRMED

5. **Set Final Decision** (via existing API: `/api/debates/[id]/decide`)
   - Sets the `winningSide` on the debate
   - Visible in the round draw

## API Endpoints Summary

### Tournament Management
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments/[id]/status` - Change tournament status
- `POST /api/tournaments/[id]/verify` - Verify tournament (admin only)

### Registration
- `POST /api/teams` - Register a team
- `POST /api/tournaments/[id]/adjudicators` - Register as adjudicator
- `GET /api/tournaments/[id]/adjudicators` - List adjudicators

### Setup
- `POST /api/tournaments/[id]/venues` - Add venue
- `GET /api/tournaments/[id]/venues` - List venues
- `POST /api/tournaments/[id]/rounds` - Create round
- `GET /api/tournaments/[id]/rounds` - List rounds with debates
- `POST /api/tournaments/[id]/motions` - Add motion
- `GET /api/tournaments/[id]/motions` - List motions

### Check-in
- `POST /api/tournaments/[id]/checkin` - Check in team/adjudicator
- `GET /api/tournaments/[id]/checkin?roundSeq=1` - Get check-in status

### Competition
- `POST /api/debates` - Create debate (with roundId, venueId)
- `GET /api/debates` - List debates
- `GET /api/debates/[id]` - Get debate details
- `POST /api/debates/[id]/ballots` - Submit ballot
- `GET /api/debates/[id]/ballots` - List ballots
- `POST /api/debates/[id]/decide` - Set winning side

## Database Models

### Core Models

- **Tournament**: Container for everything
  - status, dates, registration settings
  
- **Team**: Debate teams
  - Can be tournament-specific or independent
  - isRegistered flag
  
- **Adjudicator**: Judges
  - Rating (0-10) for allocation
  - isIndependent flag

- **Venue**: Physical/virtual rooms
  - Name, URL, priority
  
- **Round**: Tournament stages
  - Sequential numbering (seq)
  - Stage (PRELIMINARY, BREAK, FINAL)
  - Draw/motion release flags

- **Motion**: Debate topics
  - Text, info slide
  - Can be assigned to a round

- **Debate**: Individual matches
  - Links to propTeam, oppTeam
  - Links to round, venue
  - streamCallId for video integration
  - winningSide when decided

- **Ballot**: Judge decisions
  - Per-adjudicator voting
  - Winner, scores, comments
  - Status (DRAFT, CONFIRMED)

- **TeamCheckIn / AdjudicatorCheckIn**: Availability tracking
  - Per-round basis
  - Status (AVAILABLE, UNAVAILABLE)

## Debate Room Integration

The existing debate room (`/debate/[id]`) is preserved:
- Same beautiful 3-panel design (Prop | Center | Opp)
- Judge panel at the bottom center
- Uses Stream Video SDK for real-time video
- Role selection in setup (Debater, Judge, Spectator)

The tournament system integrates by:
1. Creating debates with proper tournament/round context
2. Storing streamCallId in the Debate model
3. Linking debates to teams and venues
4. Providing navigation from round pages to live debates

## User Roles

### Platform Roles
- **USER**: Regular users (default)
- **ADMIN**: Can verify tournaments, manage platform

### Per-Debate Roles (existing)
- **DEBATER**: Participates in debate with a side (PROP/OPP)
- **JUDGE**: Evaluates and provides feedback
- **SPECTATOR**: Watches without participating

## Tournament Admin Permissions

Tournament creators can:
- Change tournament status
- Add venues, rounds, motions
- Create debates for rounds
- Manage check-ins

Admins can additionally:
- Verify tournaments
- Access all tournament management features

## Next Steps for Full Implementation

To complete the tournament lifecycle:

1. **Automatic Draw Generation**: Implement pairing algorithms
   - Power-paired for preliminaries
   - Break determination logic
   - Venue allocation based on priority

2. **Real-time Updates**: Add WebSocket support for live draws

3. **Tab/Results**: Implement team standings and speaker rankings

4. **Export**: Generate draw sheets, ballots in PDF/CSV format

5. **Notifications**: Email/push notifications for check-in, results

## Usage Example

```bash
# 1. Create tournament
POST /api/tournaments
{ "name": "National Debate Championship", "startDate": "2025-11-01" }

# 2. Change to registration
POST /api/tournaments/{id}/status
{ "status": "REGISTRATION" }

# 3. Teams register
POST /api/teams
{ "name": "Team Alpha", "tournamentId": "{id}" }

# 4. Adjudicators register
POST /api/tournaments/{id}/adjudicators
{ "rating": 7.5, "isIndependent": true }

# 5. Admin adds venues
POST /api/tournaments/{id}/venues
{ "name": "Room 101", "url": "https://meet.example.com/room101" }

# 6. Admin creates rounds
POST /api/tournaments/{id}/rounds
{ "name": "Prelim 1", "stage": "PRELIMINARY" }

# 7. Admin adds motions
POST /api/tournaments/{id}/motions
{ "text": "This house believes that AI will benefit humanity", "roundId": "{roundId}" }

# 8. Change to live
POST /api/tournaments/{id}/status
{ "status": "LIVE" }

# 9. Teams check in
POST /api/tournaments/{id}/checkin
{ "roundSeq": 1, "teamId": "{teamId}", "status": "AVAILABLE" }

# 10. Create debates (draw)
POST /api/debates
{ "propTeamId": "{team1}", "oppTeamId": "{team2}", "roundId": "{round1}", "venueId": "{venue1}" }

# 11. Debates go live, participants join video call

# 12. Adjudicators submit ballots
POST /api/debates/{debateId}/ballots
{ "adjudicatorId": "{adjId}", "winningSide": "PROP", "propScore": 75, "oppScore": 72, "status": "CONFIRMED" }

# 13. Set final decision
POST /api/debates/{debateId}/decide
{ "winningSide": "PROP" }
```

## Differences from Original Tabbycat

This implementation focuses on:
1. **Video Integration**: Built-in video debates (Tabbycat typically doesn't include this)
2. **Simplified UI**: Modern, clean interface vs Tabbycat's more complex admin interface
3. **Real-time Focus**: Stream video and potential real-time updates
4. **Reduced Complexity**: Core features without all advanced options (e.g., break categories, trainee adjudicators)

Core similarities:
- Tournament phases and lifecycle
- Registration and check-in workflows
- Round/draw management
- Ballot submission system
- Team and adjudicator tracking
