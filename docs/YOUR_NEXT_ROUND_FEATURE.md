# Your Next Round Feature

## Overview
The "Your Next Round" feature allows participants (debaters and judges) to easily view their upcoming debate assignments with all relevant details and quick access to the debate room.

## Implementation Summary

### 1. API Endpoint
**File**: `src/app/api/tournaments/[id]/my-next-round/route.ts`

- **Route**: `GET /api/tournaments/:id/my-next-round`
- **Purpose**: Returns the current user's next round assignment
- **Features**:
  - Checks user's participation in the tournament (DEBATER or JUDGE)
  - Iterates through rounds to find the first round where the user is assigned
  - For DEBATERS: Returns their team, opponent, side (PROP/OPP), and judges
  - For JUDGES: Returns both teams they're judging and fellow judges
  - Returns appropriate message if no assignment exists yet

### 2. React Component
**File**: `src/components/tournaments/TournamentYourNextRound.tsx`

- **Component**: `TournamentYourNextRound`
- **Features**:
  - Fetches and displays user's next round assignment
  - Different UI for debaters vs judges
  - Shows team details, opponent information, and assigned judges
  - Displays round name, number, and scheduled time
  - "Enter Debate Room" button linking to `/debate/[pairingId]`

#### Debater View
- Highlights which side they're on (PROP or OPP)
- Shows their team members
- Shows opponent team and members
- Lists all judges (with chair judge highlighted)
- Color-coded badges for visual clarity

#### Judge View
- Shows if they are chair judge
- Displays both teams they're judging
- Lists fellow judges
- Purple-themed UI to distinguish from debater view

### 3. Tournament Page Integration
**File**: `src/app/(main)/(home)/tournaments/[id]/page.tsx`

- Added new tab "Your Next Round" in the tournament tabs
- Positioned prominently as the second tab (after Registration)
- Accessible to all participants

## User Flow

### For Debaters
1. Navigate to tournament page
2. Click "Your Next Round" tab
3. See their round assignment:
   - Round name (e.g., "Round 1")
   - Their side (PROP or OPP)
   - Their team and teammates
   - Opponent team and members
   - Assigned judges
4. Click "Enter Debate Room" to join the video call

### For Judges
1. Navigate to tournament page
2. Click "Your Next Round" tab
3. See their judging assignment:
   - Round name
   - Chair status (if applicable)
   - Both teams they're judging
   - Fellow judges
4. Click "Enter Judging Room" to join the video call

## Technical Details

### Database Schema Usage
- Uses existing `TournamentParticipation` model to identify user's role
- Queries `Round` and `RoundPairing` models to find assignments
- Leverages `RoundPairingJudge` for judge assignments
- Includes full team and user details via Prisma relations

### Room Link Integration
- Room link format: `/debate/[pairingId]`
- Integrates with existing Stream Video infrastructure
- Each pairing ID serves as a unique meeting room identifier
- Video meeting functionality already implemented in `src/app/(main)/debate/[id]/page.tsx`

## Future Enhancements
1. **Multiple Rounds**: Currently shows the first assigned round; could be enhanced to show all upcoming rounds
2. **Round Status**: Add indicators for completed, in-progress, or upcoming rounds
3. **Notifications**: Push notifications when a round is about to start
4. **Schedule View**: Calendar view of all rounds
5. **Pre-Room Lobby**: Waiting area before debate starts
6. **Motion Display**: Show the debate motion/topic in the round view

## Testing Scenarios

### Test Case 1: Debater with Assignment
1. User registered as DEBATER with a team
2. Round created and team paired
3. User sees round details with opponent and judges

### Test Case 2: Judge with Assignment
1. User registered as JUDGE
2. Round created and judge assigned to pairing
3. User sees teams they're judging

### Test Case 3: No Assignment Yet
1. User registered but not assigned to any round
2. User sees helpful message indicating no assignment
3. Shows their registration status (role, team, institution)

### Test Case 4: Not Registered
1. User not registered for tournament
2. API returns 404 error
3. Component shows appropriate error message

## Related Files
- API Route: `src/app/api/tournaments/[id]/my-next-round/route.ts`
- Component: `src/components/tournaments/TournamentYourNextRound.tsx`
- Page: `src/app/(main)/(home)/tournaments/[id]/page.tsx`
- Debate Room: `src/app/(main)/debate/[id]/page.tsx`
- Database Schema: `prisma/schema.prisma`

## Notes
- The debate room infrastructure was already in place using Stream Video
- This feature wires up the pairing system to the video calling system
- Makes the tournament system feel more complete and user-friendly
- Provides clear call-to-action for participants to join their debates
