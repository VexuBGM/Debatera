# Debate Room Role Selection System

## Overview

This document describes the debate room role selection system that controls who can join debate video calls and in what capacity.

## Key Features

1. **Role-Based Access Control**: Only assigned participants can join video calls
2. **3-Person-Per-Team Limit**: Maximum 3 debaters per team can actively participate
3. **Speaker Role Selection**: Debaters choose their speaking role before joining
4. **Automatic Judge Access**: Judges bypass role selection
5. **Reconnection Support**: Users can rejoin with their existing role
6. **Race Condition Handling**: Prevents multiple users from taking the same role

## Database Schema

### New Enums

```prisma
enum SpeakerRole {
  FIRST_SPEAKER
  SECOND_SPEAKER
  THIRD_SPEAKER
  REPLY_SPEAKER
  JUDGE
}

enum ParticipantStatus {
  ACTIVE      // Currently in the debate room
  LEFT        // Left the debate room
  RESERVED    // Role reserved but not yet joined
}
```

### DebateParticipant Model

Tracks which user has which speaker role in each debate:

```prisma
model DebateParticipant {
  id        String            @id
  pairingId String            // Link to RoundPairing
  userId    String            // Link to User
  teamId    String?           // null for judges
  role      SpeakerRole
  status    ParticipantStatus @default(RESERVED)
  joinedAt  DateTime          @default(now())
  leftAt    DateTime?
  
  // Constraints:
  // - One role per user per debate
  // - One user per role per team (judges can have multiple)
}
```

### RoundPairing Updates

Added `callId` field to store the Stream video call identifier:

```prisma
model RoundPairing {
  // ... existing fields
  callId      String?  // Stream video call ID
  participants DebateParticipant[]
}
```

## User Flow

### For Debaters

1. **Navigate to "Your Next Round"**
   - View your assigned debate information
   - Click "Enter Debate Room"

2. **Role Selection Dialog**
   - System checks if you already have a role (reconnect scenario)
   - If no existing role, shows available speaker roles:
     - First Speaker
     - Second Speaker
     - Third Speaker
     - Reply Speaker (optional)
   - Taken roles are disabled and show who has them
   - If team already has 3 debaters, shows "Team Full" message

3. **Reserve Role**
   - Select your desired role
   - Click "Continue to Room"
   - System validates:
     - Role is still available
     - Team hasn't reached 3-person limit
     - You belong to this debate
   - On success, redirects to debate room

4. **Join Video Call**
   - Access granted since you have a reserved role
   - Your role is displayed in the UI
   - You can see other participants and their roles

### For Judges

1. **Navigate to "Your Next Round"**
   - View debate information
   - Click "Enter Judging Room"

2. **Automatic Access**
   - No role selection needed
   - System automatically reserves JUDGE role
   - Redirects directly to debate room

3. **Join Video Call**
   - Access granted immediately
   - Can see all participants

### For Non-Participants

If a user tries to access a debate room without being assigned:

1. **Access Denied Screen**
   - Shows message: "You are not authorized to join this debate room"
   - Displays current participants and their roles
   - Explains only 3 speakers per team + judges can join

This applies to:
- 4th+ debaters on a team
- Coaches who aren't assigned as judges
- Tournament participants not in this specific debate

## API Endpoints

### POST `/api/debates/[pairingId]/reserve-role`

Reserves a speaker role for the authenticated user.

**Request Body:**
```json
{
  "role": "FIRST_SPEAKER" | "SECOND_SPEAKER" | "THIRD_SPEAKER" | "REPLY_SPEAKER" | "JUDGE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "role": "FIRST_SPEAKER",
  "callId": "debate_rpair_123_1234567890",
  "participantId": "dpart_456",
  "message": "Role reserved successfully"
}
```

**Reconnect Response (200):**
```json
{
  "success": true,
  "role": "FIRST_SPEAKER",
  "callId": "debate_rpair_123_1234567890",
  "message": "Rejoining with existing role"
}
```

**Error Responses:**
- `400`: Invalid role, team full, or role already taken
- `401`: Unauthorized (not logged in)
- `403`: User not assigned to this debate
- `409`: Race condition - role just taken by another user

**Validations:**
1. User is authenticated
2. User belongs to the debate (either as debater or judge)
3. For debaters:
   - Team has less than 3 active debaters
   - Selected role is not taken by another team member
4. For judges:
   - Can only select JUDGE role

### GET `/api/debates/[pairingId]/participants`

Retrieves all current participants in a debate.

**Success Response (200):**
```json
{
  "propTeam": {
    "id": "team_123",
    "name": "Team A",
    "institution": { "id": "inst_1", "name": "University A" },
    "participants": [
      {
        "id": "dpart_1",
        "userId": "user_1",
        "role": "FIRST_SPEAKER",
        "status": "ACTIVE",
        "teamId": "team_123",
        "user": {
          "id": "user_1",
          "username": "john_doe",
          "email": "john@example.com"
        }
      }
    ]
  },
  "oppTeam": {
    "id": "team_456",
    "name": "Team B",
    "institution": { "id": "inst_2", "name": "University B" },
    "participants": []
  },
  "judges": [
    {
      "id": "dpart_5",
      "userId": "user_5",
      "role": "JUDGE",
      "status": "ACTIVE",
      "teamId": null,
      "user": {
        "id": "user_5",
        "username": "judge_smith",
        "email": "judge@example.com"
      }
    }
  ]
}
```

## Components

### RoleSelectionDialog

**Location:** `src/components/tournaments/rounds/RoleSelectionDialog.tsx`

**Props:**
- `open: boolean` - Controls dialog visibility
- `onClose: () => void` - Callback when dialog closes
- `pairingId: string` - The debate pairing ID
- `userTeamId: string` - The user's team ID
- `onRoleSelected?: (role, callId) => void` - Optional callback on successful role selection

**Features:**
- Fetches current participants on open
- Shows available roles with descriptions
- Disables taken roles and shows who has them
- Displays "Team Full" message when 3 debaters are active
- Handles race conditions gracefully
- Auto-refreshes on conflict

### TournamentYourNextRound Updates

**Location:** `src/components/tournaments/TournamentYourNextRound.tsx`

**Changes:**
- Replaced static "Enter Debate Room" link with button
- Added `handleEnterRoom()` function that:
  - Checks if user is a judge → direct join
  - Checks if user has existing role → direct join
  - Otherwise → shows role selection dialog
- Integrated `RoleSelectionDialog` component

### Debate Room Page

**Location:** `src/app/(main)/debate/[id]/page.tsx`

**Changes:**
- Fetches debate participant info on mount
- Checks if current user has a reserved role
- If no role:
  - Shows "Access Restricted" message
  - Displays current participants
  - Blocks video call access
- If has role:
  - Allows video call join
  - Passes role info to `MeetingSetup` and `MeetingRoom`

### MeetingSetup Updates

**Location:** `src/components/MeetingSetup.tsx`

**Changes:**
- Accepts optional `userRole` prop
- Displays user's assigned role above video preview
- Removed manual role selection (now done before joining)

### MeetingRoom Updates

**Location:** `src/components/MeetingRoom.tsx`

**Changes:**
- Accepts optional `debateInfo` and `userParticipant` props
- Displays team names in side panels
- Shows user's role in top bar
- Displays participant count instead of timer
- Can show speaker badges (e.g., "Speaker 1", "Speaker 2")

## Security & Validation

### Database-Level Constraints

1. **Unique role per user per debate:**
   ```prisma
   @@unique([pairingId, userId])
   ```

2. **Unique role per team (except judges):**
   ```prisma
   @@unique([pairingId, teamId, role])
   ```
   This prevents two users from being "First Speaker" on the same team.

### API-Level Validations

1. **Authentication:** All endpoints require authenticated user
2. **Authorization:** User must be assigned to the debate
3. **Team Capacity:** Enforces 3-debater-per-team limit
4. **Role Availability:** Checks role isn't already taken
5. **Race Condition Handling:** Catches Prisma unique constraint violations

### Frontend Validations

1. **Role Selection Dialog:**
   - Fetches fresh data before showing options
   - Disables taken roles
   - Shows team capacity status

2. **Debate Room Access:**
   - Checks for participant entry before allowing call join
   - Shows informative error for non-participants

## Edge Cases Handled

### 1. Reconnection / Browser Refresh

- User closes browser or loses connection
- When they click "Enter Debate Room" again:
  - System finds existing `DebateParticipant` entry
  - Returns existing role and callId
  - User rejoins with same role

### 2. Race Condition (Two Users Select Same Role)

- User A and User B both select "First Speaker" simultaneously
- Both send reserve requests
- Database unique constraint ensures only one succeeds
- Loser receives 409 error
- Dialog refreshes and shows role is now taken
- User can select different role

### 3. Team Full During Selection

- User opens role selection dialog (2 speakers joined)
- While dialog is open, a 3rd speaker joins
- User selects role and clicks "Continue"
- API validates and returns "Team full" error
- Dialog refreshes and shows "Team Full" message

### 4. Late Joiner (4th Debater)

- Team has 3 debaters already in call
- 4th debater clicks "Enter Debate Room"
- Gets immediate "Team Full" message in dialog
- Cannot proceed to room

### 5. Non-Participant Access Attempt

- Someone gets debate room URL
- They're not assigned to this debate
- Access denied screen shows
- Cannot join video call

### 6. Judge Joining

- Judge clicks "Enter Judging Room"
- No role selection needed
- JUDGE role auto-reserved
- Direct access to call
- Not counted in 3-per-team limit

## Testing Checklist

### Basic Flow
- [ ] Debater can see "Your Next Round" page
- [ ] Debater clicks "Enter Debate Room"
- [ ] Role selection dialog appears
- [ ] All 4 roles are initially available
- [ ] Debater selects a role
- [ ] Role is successfully reserved
- [ ] Debater is redirected to debate room
- [ ] Debater can join video call

### Role Selection
- [ ] Taken roles show as disabled
- [ ] Taken roles show who has them
- [ ] User can change selection before confirming
- [ ] "Continue to Room" is disabled until role selected

### 3-Person Limit
- [ ] First debater can join
- [ ] Second debater can join
- [ ] Third debater can join
- [ ] Fourth debater sees "Team Full" message
- [ ] Fourth debater cannot join video call

### Judge Flow
- [ ] Judge sees "Your Next Round" page
- [ ] Judge clicks "Enter Judging Room"
- [ ] No role selection dialog appears
- [ ] Judge is redirected directly to debate room
- [ ] Judge can join video call

### Reconnection
- [ ] User reserves a role
- [ ] User closes browser
- [ ] User clicks "Enter Debate Room" again
- [ ] No role selection needed
- [ ] User joins with previous role

### Race Conditions
- [ ] Two users select same role simultaneously
- [ ] Only one succeeds
- [ ] Other user sees error message
- [ ] Dialog refreshes with updated data
- [ ] User can select different role

### Access Control
- [ ] Non-assigned user cannot access debate room
- [ ] 4th debater cannot access video call
- [ ] Access denied screen shows participant list
- [ ] Coach without judge assignment cannot join

### UI Updates
- [ ] Debate room shows team names
- [ ] Debate room shows user's role
- [ ] Debate room shows participant count
- [ ] Access denied screen is clear and informative

## Migration Notes

The system requires a database migration:

```bash
npx prisma migrate dev --name add_debate_participant_roles
```

This migration:
1. Creates `SpeakerRole` enum
2. Creates `ParticipantStatus` enum
3. Adds `callId` to `RoundPairing`
4. Creates `DebateParticipant` table with constraints

## Future Enhancements

### Potential Features

1. **Real-time Updates**
   - Use WebSocket to notify when roles are taken
   - Update role selection dialog in real-time

2. **Role Swapping**
   - Allow debaters to swap roles before debate starts
   - Requires mutual consent or admin approval

3. **Pre-assignment**
   - Tournament admin can pre-assign speaker roles
   - Users skip role selection if pre-assigned

4. **Role History**
   - Track which roles each debater has played
   - Show statistics (e.g., "You've been 1st speaker 3 times")

5. **Timer Integration**
   - Restore actual debate timer in top bar
   - Track speaking time per role

6. **Spectator Mode**
   - Allow extra team members to watch (audio/video off)
   - Separate from active participants

7. **Role Requirements**
   - Make Reply Speaker optional or required
   - Configure number of speakers per format (e.g., 2v2, 3v3)

## Troubleshooting

### "Team full" but only 2 people in room

**Cause:** Participants in RESERVED status but not yet LEFT
**Solution:** Check DebateParticipant status field; may need cleanup logic

### User can't see role selection

**Cause:** User might not be assigned to a team
**Solution:** Check TournamentParticipation has valid teamId

### Race condition errors too frequent

**Cause:** High concurrency, multiple users selecting at once
**Solution:** Add optimistic locking or retry logic

### CallId not generating

**Cause:** Error in reserve-role endpoint
**Solution:** Check RoundPairing callId generation logic

## Support

For issues or questions about the debate room system:

1. Check this documentation
2. Review API endpoint responses for error details
3. Check browser console for client-side errors
4. Review server logs for API errors
5. Verify database constraints are in place
