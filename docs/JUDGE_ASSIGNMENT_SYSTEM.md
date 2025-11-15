# Judge Assignment System - Implementation Summary

## Overview
This document describes the implementation of the judge assignment feature for tournament round pairings. Judges can be assigned to debate rooms via drag-and-drop, with support for panel judges and chair designation.

## Database Schema

### New Model: RoundPairingJudge
```prisma
model RoundPairingJudge {
  id              String   @id @default(dbgenerated("'rpj_' || gen_random_uuid()::text"))
  pairingId       String
  participationId String
  isChair         Boolean  @default(false)
  createdAt       DateTime @default(now())

  pairing       RoundPairing            @relation(...)
  participation TournamentParticipation @relation(...)

  @@unique([pairingId, participationId])
}
```

**Key Features:**
- Links judges (TournamentParticipation with role=JUDGE) to specific pairings
- `isChair`: Boolean flag to designate one judge as the panel chair
- Unique constraint prevents duplicate judge assignments per pairing
- Cascade delete when pairing is removed

## API Endpoints

### 1. Get Rounds with Judges
**Endpoint:** `GET /api/tournaments/{id}/rounds`

Updated to include judges in pairing data:
```typescript
include: {
  roundPairings: {
    include: {
      judges: {
        include: {
          participation: {
            include: { user: true, institution: true }
          }
        },
        orderBy: { isChair: 'desc' }
      }
    }
  }
}
```

### 2. Add Judge to Pairing
**Endpoint:** `POST /api/tournaments/{id}/rounds/{roundId}/pairings/{pairingId}/judges`

**Request Body:**
```json
{
  "participationId": "part_abc123",
  "isChair": false
}
```

**Behavior:**
- Validates user is tournament owner
- Verifies participation is a JUDGE role
- Prevents duplicate assignments
- If `isChair: true`, unsets any existing chair for that pairing

**Response:** RoundPairingJudge object with nested participation and user data

### 3. Update Judge Assignment
**Endpoint:** `PATCH /api/tournaments/{id}/rounds/{roundId}/pairings/{pairingId}/judges/{judgeId}`

**Request Body:**
```json
{
  "isChair": true
}
```

**Use Case:** Toggle chair status for a judge

### 4. Remove Judge from Pairing
**Endpoint:** `DELETE /api/tournaments/{id}/rounds/{roundId}/pairings/{pairingId}/judges/{judgeId}`

**Behavior:** Removes judge assignment from the pairing

### 5. Auto-Assign Judges
**Endpoint:** `POST /api/tournaments/{id}/rounds/{roundId}/auto-assign-judges`

**Behavior:**
- Requires pairings to exist first
- Clears existing judge assignments for the round
- Distributes judges evenly across all pairings using round-robin algorithm
- First judge assigned to each pairing becomes the chair
- If there are more judges than pairings, distributes extras evenly
- Prevents duplicate assignments to the same pairing

**Response:**
```json
{
  "message": "Judges auto-assigned successfully",
  "assignmentsCount": 12,
  "judgesUsed": 6,
  "pairingsCount": 6
}
```

**Algorithm:**
1. Calculate `judgesPerPairing = floor(totalJudges / totalPairings)` (minimum 1)
2. Assign judges to pairings in round-robin fashion
3. First judge per pairing is marked as chair
4. Distribute leftover judges to pairings with fewer judges
5. Skip if judge already assigned to that pairing

## UI Components

### 1. UnpairedJudgesPool.tsx
**Purpose:** Display unassigned judges with drag-and-drop support

**Features:**
- Grid layout of judge cards
- Search/filter by name or institution
- Draggable judge cards with purple Gavel icon
- Badge showing count of unassigned judges
- Touch-friendly drag activation

**Drag Data:**
```typescript
{
  type: 'judge',
  judge: {
    id: string,  // participation ID
    user: { ... },
    institution: { ... }
  }
}
```

### 2. PairingRoom.tsx (Updated)
**New Features:**
- `JudgesDropZone`: Droppable area for judge assignments
- Display list of assigned judges with chair badge
- Remove judge button (trash icon)
- Toggle chair button (star icon, filled when chair)
- Visual feedback on hover (purple ring)

**Props Added:**
```typescript
onRemoveJudge: (judgeId: string) => void
onToggleChair: (judgeId: string, isChair: boolean) => void
judges: Judge[]
```

**Judge Display:**
- Shows judge name with Gavel icon
- Chair judges display a purple "Chair" badge with star
- Institution name below judge name
- Actions: toggle chair, remove judge

### 3. PairingBoard.tsx (Updated)
**New State:**
```typescript
const [activeJudge, setActiveJudge] = useState<JudgeParticipation | null>(null)
```

**New Statistics:**
- `unassignedJudges`: Count of judges not assigned to any room
- Badge showing unassigned judge count (purple theme)

**Drag Handlers:**
- `handleDragStart`: Sets `activeJudge` when dragging a judge
- `handleDragEnd`: 
  - Detects judge drop on judges zone (`type === 'judges'`)
  - Extracts pairing ID from drop zone ID (`{pairingId}-judges`)
  - Calls POST API to assign judge
  - Prevents duplicate assignments with toast error

**New Handlers:**
```typescript
handleRemoveJudge(pairingId, judgeId)
handleToggleChair(pairingId, judgeId, isChair)
handleAutoAssignJudges()
```

**Auto-Assign Button:**
- Purple-themed button with Gavel icon
- Label: "Auto-Assign Judges"
- Disabled when: no pairings exist OR no judges registered
- Calls auto-assign API endpoint
- Shows success toast with count: "6 judges assigned to 6 rooms"

**DragOverlay:**
- Shows dragged judge card with purple Gavel icon
- Displays judge name and institution

### 4. TournamentRounds.tsx (Updated)
**New Props:**
```typescript
judges: JudgeParticipation[]
```

**Updated Types:**
- Added `Judge` interface for assigned judges
- Added `JudgeParticipation` for judge pool
- `RoundPairing` now includes `judges: Judge[]`

**Read-Only Table:**
- Displays assigned judges with chair badge
- Shows "TBD" if no judges assigned

## User Workflows

### Workflow 1: Assign Judge to Room
1. Admin opens Rounds tab for tournament
2. Selects a round
3. **Judge Pool** appears below Team Pool
4. Admin drags a judge card from the pool
5. Drops judge onto a room's **Judges** drop zone
6. Toast: "Judge assigned successfully"
7. Judge appears in room card, removed from pool

### Workflow 2: Designate Panel Chair
1. Judge is already assigned to a room
2. Admin clicks the **star icon** next to judge name
3. Judge's badge changes to "Chair" with filled star
4. Any previous chair in that room is unset
5. Toast: "Judge set as chair"

### Workflow 3: Remove Judge from Room
1. Judge is assigned to a room
2. Admin clicks the **trash icon** next to judge name
3. Confirmation (implicit)
4. Judge is removed and returns to judge pool
5. Toast: "Judge removed"

### Workflow 4: Auto-Assign All Judges
1. Admin creates round and auto-pairs teams
2. Clicks **"Auto-Assign Judges"** button (purple, with Gavel icon)
3. System distributes judges evenly across all rooms
4. First judge per room is automatically set as chair
5. Toast: "6 judges assigned to 6 rooms"
6. All rooms now have judges, judge pool is empty (or has fewer judges if more rooms than judges)

### Workflow 5: View Judges (Non-Admin)
1. Participant opens Rounds tab
2. Selects a round
3. Views read-only table showing rooms, teams, and judges
4. Chair judges display a purple "Chair" badge

## Technical Details

### Drop Zone ID Format
- **Teams:** `{pairingId}-prop` or `{pairingId}-opp`
- **Judges:** `{pairingId}-judges`

### Drag Data Types
- **Team:** `{ type: 'team', team: TournamentTeam }`
- **Judge:** `{ type: 'judge', judge: JudgeParticipation }`

### Validation & Conflicts
- **Server-side:** Only tournament owner can assign judges
- **Client-side:** Prevents duplicate assignments with toast
- **Chair uniqueness:** Setting a new chair automatically unsets the previous chair

### Visual Theme
- **Judges:** Purple color scheme (Gavel icon, badges, borders)
- **Teams:** Cyan color scheme (existing)
- **Warnings:** Yellow (same institution, etc.)

## Migration

**Migration:** `20251115214223_add_round_pairing_judges`

**Changes:**
- Created `RoundPairingJudge` table
- Added relation to `TournamentParticipation.judgeAssignments`
- Added relation to `RoundPairing.judges`

**Migration Command:**
```bash
npx prisma migrate dev --name add_round_pairing_judges
```

## Testing Checklist

- [x] Schema migration applied successfully
- [x] API endpoints created and functional
- [x] Drag judge from pool to room
- [x] Judge appears in room and removed from pool
- [x] Toggle judge as chair
- [x] Remove judge from room
- [x] Prevent duplicate assignments
- [x] Chair uniqueness per pairing
- [x] Read-only view for non-admins
- [x] Multiple judges per room (panel)
- [x] Auto-assign judges to all rooms
- [ ] Judge conflict detection (same institution)

## Future Enhancements

### Phase 1: Judge Conflicts
- Detect and warn when judge is from same institution as a team
- Similar to team conflict warnings

### Phase 2: Advanced Auto-Assignment
- Algorithm to avoid conflicts automatically
- Option to specify panel size (1, 3, or 5 judges)
- Workload balancing across rounds

### Phase 3: Judge Availability
- Mark judges as available/unavailable per round
- Only show available judges in pool
- Track judge assignments across rounds (workload balancing)

### Phase 4: Judge Preferences & Strikes
- Teams can strike certain judges
- Record judge preferences/expertise
- Weight auto-assignment based on preferences

---

**Implementation Date:** November 15, 2025  
**Status:** ✅ Complete and ready for testing
