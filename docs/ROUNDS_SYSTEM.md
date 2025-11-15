# Tournament Rounds System

## Overview
This document describes the tournament rounds system that allows administrators to create rounds, generate pairings automatically, and manually adjust team matchups through a drag-and-drop interface.

## Features

### 1. Round Management
- **Create Rounds**: Tournament admins can create new rounds with auto-incrementing numbers
- **Edit Round Names**: Click the edit icon on any round tab to rename it
- **Delete Rounds**: Remove rounds that are no longer needed
- **View Round Statistics**: Each round tab shows the number of pairings

### 2. Pairing Generation
- **Auto-Generate Pairings**: Automatically pair all teams in the tournament
  - Currently uses simple sequential pairing (team 1 vs team 2, team 3 vs team 4, etc.)
  - Can be extended to support Swiss, double elimination, or other pairing algorithms
- **Manual Pairing Creation**: Add individual pairings manually
- **Edit Pairings**: Use dropdown selects to change which teams face each other
- **Delete Pairings**: Remove specific pairings from a round

### 3. Drag-and-Drop Reordering
- **Sortable Pairings**: Tournament admins can drag and drop pairings to reorder them
- **Visual Feedback**: Pairings show visual feedback while being dragged
- **Grip Handle**: Each pairing row has a grip icon for easy dragging

### 4. Team Selection
- **Proposition Team**: Select from all tournament teams for the prop side
- **Opposition Team**: Select from all tournament teams for the opp side
- **Team Information**: View team name, institution, and debater names
- **Flexible Assignment**: Teams can be set to "None" (TBD) if not yet assigned

## API Endpoints

### Rounds

#### `GET /api/tournaments/[id]/rounds`
Get all rounds for a tournament with their pairings.

**Response:**
```json
[
  {
    "id": "rnd_xxx",
    "tournamentId": "tourn_xxx",
    "number": 1,
    "name": "Round 1",
    "roundPairings": [...]
  }
]
```

#### `POST /api/tournaments/[id]/rounds`
Create a new round.

**Response:**
```json
{
  "id": "rnd_xxx",
  "tournamentId": "tourn_xxx",
  "number": 2,
  "name": "Round 2",
  "roundPairings": []
}
```

#### `PATCH /api/tournaments/[id]/rounds/[roundId]`
Update a round's details.

**Request Body:**
```json
{
  "name": "Semifinals"
}
```

#### `DELETE /api/tournaments/[id]/rounds/[roundId]`
Delete a round and all its pairings.

### Pairings

#### `POST /api/tournaments/[id]/rounds/[roundId]/pairings`
Create a new pairing or auto-generate all pairings.

**Request Body (Manual):**
```json
{
  "propTeamId": "team_xxx",
  "oppTeamId": "team_yyy"
}
```

**Request Body (Auto-Generate):**
```json
{
  "autoGenerate": true
}
```

#### `PATCH /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId]`
Update a pairing's teams.

**Request Body:**
```json
{
  "propTeamId": "team_xxx",
  "oppTeamId": "team_yyy"
}
```

#### `DELETE /api/tournaments/[id]/rounds/[roundId]/pairings/[pairingId]`
Delete a pairing.

## Database Schema

### Round
```prisma
model Round {
  id           String   @id @default(dbgenerated("'rnd_' || gen_random_uuid()::text"))
  tournamentId String
  number       Int
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  tournament    Tournament     @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  roundPairings RoundPairing[]
}
```

### RoundPairing
```prisma
model RoundPairing {
  id          String    @id @default(dbgenerated("'rpair_' || gen_random_uuid()::text"))
  roundId     String
  propTeamId  String?
  oppTeamId   String?
  scheduledAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  round    Round           @relation(fields: [roundId], references: [id], onDelete: Cascade)
  propTeam TournamentTeam? @relation("propTeam", fields: [propTeamId], references: [id])
  oppTeam  TournamentTeam? @relation("oppTeam", fields: [oppTeamId], references: [id])
}
```

## User Interface

### Admin View
- **Create Round Button**: Top-right corner to add new rounds
- **Round Tabs**: Each round appears as a tab with name and pairing count
- **Edit/Delete Icons**: On each round tab for quick actions
- **Auto-Generate Button**: Automatically creates pairings for all teams
- **Add Pairing Button**: Manually add individual pairings
- **Dropdown Selects**: Change team assignments on each pairing
- **Drag Handle**: Grip icon to reorder pairings
- **Delete Button**: Trash icon to remove pairings

### Non-Admin View
- **Round Tabs**: View all rounds and their pairings
- **Team Information**: See team names, institutions, and debaters
- **Read-Only**: Cannot modify rounds or pairings

## Future Enhancements

### 1. Advanced Pairing Algorithms
- **Swiss System**: Pair teams based on current standings
- **Double Elimination**: Bracket-style tournament structure
- **Power Pairing**: Match teams with similar records
- **Seeding**: Initial placement based on team strength

### 2. Judge Assignment
- **Judge Pool**: Manage available judges per round
- **Auto-Assignment**: Automatically assign judges to pairings
- **Conflict Management**: Prevent judges from judging their own institution
- **Judge Preferences**: Allow teams to strike certain judges

### 3. Room Assignment
- **Room Management**: Assign physical or virtual rooms to pairings
- **Schedule**: Set specific times for each pairing
- **Notifications**: Send notifications to teams and judges

### 4. Results and Scoring
- **Ballot Entry**: Record debate results for each pairing
- **Speaker Points**: Track individual speaker scores
- **Standings**: Calculate and display team rankings
- **Break Rounds**: Determine which teams advance to elimination rounds

### 5. Real-Time Updates
- **Live Updates**: Refresh pairings automatically when changes are made
- **WebSocket Integration**: Real-time collaboration between admins
- **Push Notifications**: Notify participants of pairing releases

## Technical Implementation

### Technologies Used
- **Next.js 15**: React framework with App Router
- **Prisma**: Database ORM for PostgreSQL
- **@dnd-kit**: Drag-and-drop library for React
- **Clerk**: Authentication and user management
- **Shadcn/ui**: UI component library
- **Tailwind CSS**: Styling framework

### Key Components
1. **TournamentRounds.tsx**: Main component managing rounds and pairings
2. **SortablePairingRow**: Individual pairing row with drag-and-drop
3. **API Routes**: RESTful endpoints for CRUD operations

### Drag-and-Drop Implementation
- Uses `@dnd-kit/core` for drag context
- `@dnd-kit/sortable` for sortable list functionality
- `arrayMove` utility for reordering items
- Pointer sensor for activation constraint

## Permissions
- **Tournament Owner**: Full access to create, edit, and delete rounds/pairings
- **Other Users**: Read-only access to view rounds and pairings

## Error Handling
- **Toast Notifications**: User-friendly error messages
- **Console Logging**: Detailed error logs for debugging
- **Validation**: Server-side validation on all API endpoints
- **Loading States**: Visual feedback during async operations
