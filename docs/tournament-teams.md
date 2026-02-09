# Tournament Teams Feature

This document describes the Tournament Teams feature, which allows institution admins to create and manage teams for their institution within a tournament.

## Overview

Institution admins can:
- Create teams for their approved institution in a tournament
- Assign registered debaters to teams via drag-and-drop
- Delete teams (members are automatically unassigned)

All users can view all institutions' teams in read-only mode.

## Schema Changes

### Tournament Model
Added team size configuration:
```prisma
model Tournament {
  // ... existing fields
  teamMinSize Int @default(2)
  teamMaxSize Int @default(5)
  tournamentTeams TournamentTeam[]
}
```

### TournamentTeam Model
```prisma
model TournamentTeam {
  id              String   @id @default(cuid())
  tournamentId    String
  institutionId   String
  name            String   // Auto-generated: "${Institution.name} 1", etc.
  createdByUserId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tournament  Tournament  @relation(...)
  institution Institution @relation(...)
  createdBy   User        @relation("TeamsCreated", ...)
  members     TournamentTeamMember[]

  @@unique([tournamentId, institutionId, name])
  @@index([tournamentId])
  @@index([institutionId])
  @@index([createdByUserId])
}
```

### TournamentTeamMember Model
```prisma
model TournamentTeamMember {
  id            String   @id @default(cuid())
  teamId        String
  participantId String   @unique  // One team per participant
  createdAt     DateTime @default(now())

  team        TournamentTeam        @relation(...)
  participant TournamentParticipant @relation(...)

  @@index([teamId])
}
```

## Constraints

| Constraint | Enforcement |
|------------|-------------|
| Team name unique per institution+tournament | DB `@@unique` |
| Participant can only be in one team | DB `@@unique` on `participantId` |
| Only debaters can join teams | Server validation |
| Cannot exceed `teamMaxSize` | Server validation |
| Only institution admins can manage | Server validation |
| Institution must be approved | Server validation |
| No mutations after `registrationClosesAt` | Server + UI validation |

## Server Actions

Located in `src/actions/teams.actions.ts`:

### Data Fetching
- `getTournamentTeamsPageData(tournamentId)` - Fetches tournament config, all teams, and manageable institutions
- `getInstitutionTeamState(tournamentId, institutionId)` - Fetches teams and debaters for a specific institution

### Mutations
- `createTeam({ tournamentId, institutionId })` - Creates a new team with auto-generated name
- `deleteTeam({ teamId })` - Deletes a team (cascade removes members)
- `moveParticipant({ tournamentId, participantId, toTeamId })` - Assigns/moves/unassigns a debater

## Permission Rules

1. **Create/Delete/Move**: User must be an `InstitutionMember` with role `ADMIN` for the institution. Tournament admins/creators cannot manage teams.
2. **Approved Only**: Institution must have `TournamentInstitution.status = APPROVED`
3. **Lock After Close**: If `tournament.registrationClosesAt` is in the past, all mutations are blocked

## UI Components

### Page: `/tournaments/[id]/registration/teams`
Server component that fetches data and renders:
- Header with team size rules and lock state
- `ManageTeamsBoard` (if user can manage institutions)
- `AllTeamsList` (read-only view for everyone)

### ManageTeamsBoard
Client component with dnd-kit integration:
- Institution selector (if user manages multiple)
- "Create Team" button
- Drag-and-drop columns for unassigned debaters and each team
- Optimistic updates with server action calls

### TeamColumn
Droppable column showing:
- Team name and member count
- Status badges ("Needs X more", "Full")
- Delete button (for teams)
- List of debater cards

### DebaterCard
Draggable card showing:
- User avatar
- Username/email
- Drag handle

### AllTeamsList
Read-only grid showing all teams grouped by institution.

## DnD State Model

```
State:
  - teams: TeamWithMembers[]
  - debaters: DebaterParticipant[]

Computed:
  - unassignedDebaters = debaters.filter(d => !d.teamMembership)

Container IDs:
  - "unassigned"
  - "team:{teamId}"

Item IDs:
  - "participant:{participantId}"

On Drag End:
  1. Determine source and destination containers
  2. Optimistically update local state
  3. Call moveParticipant server action
  4. Revert on error + show toast
```

## Team Naming

Team names are auto-generated as `${Institution.name} ${N}` where N is the smallest missing positive integer:
- If teams 1 and 3 exist, next team is 2
- Handles race conditions with retry on unique constraint violation

## Extending the Feature

### Editing Team Sizes
Add UI in tournament settings to update `teamMinSize` and `teamMaxSize`.

### Team Name Editing
Currently disabled. To enable:
1. Add `updateTeam` server action
2. Validate uniqueness within institution+tournament
3. Add edit button/input in TeamColumn

## File Locations

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models |
| `src/lib/tournament-utils.ts` | Shared utilities |
| `src/actions/teams.actions.ts` | Server actions |
| `src/app/(main)/(home)/tournaments/[id]/registration/teams/page.tsx` | Page component |
| `src/app/(main)/(home)/tournaments/[id]/registration/teams/_components/` | UI components |
