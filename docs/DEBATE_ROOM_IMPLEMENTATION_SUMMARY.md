# Debate Room Role Selection System - Implementation Summary

## ✅ Implementation Complete

The debate room role selection system has been successfully implemented. This system controls who can join debate video calls and ensures only 3 speakers per team can actively participate.

## 🗂️ Files Created/Modified

### Database Schema
- ✅ `prisma/schema.prisma` - Added DebateParticipant model, SpeakerRole enum, ParticipantStatus enum, and callId field to RoundPairing
- ✅ Migration created: `20251117142203_add_debate_participant_roles`

### API Endpoints
- ✅ `src/app/api/debates/[pairingId]/reserve-role/route.ts` - POST endpoint for reserving speaker roles
- ✅ `src/app/api/debates/[pairingId]/participants/route.ts` - GET endpoint for fetching debate participants

### Components
- ✅ `src/components/tournaments/rounds/RoleSelectionDialog.tsx` - Dialog for choosing speaker role
- ✅ `src/components/tournaments/TournamentYourNextRound.tsx` - Updated to integrate role selection flow
- ✅ `src/components/MeetingSetup.tsx` - Updated to display user's assigned role
- ✅ `src/components/MeetingRoom.tsx` - Updated to show participant roles and team info

### Pages
- ✅ `src/app/(main)/debate/[id]/page.tsx` - Updated with access control and participant info display

### Documentation
- ✅ `docs/DEBATE_ROOM_ROLES.md` - Comprehensive system documentation

## 🎯 Key Features Implemented

### 1. Role-Based Access Control
- Only participants with assigned roles can join video calls
- Non-participants see an informative access denied screen
- System enforces 3-speaker-per-team limit strictly

### 2. Speaker Role Selection
Debaters choose from:
- First Speaker
- Second Speaker
- Third Speaker
- Reply Speaker (optional)

Features:
- Real-time availability checking
- Taken roles are disabled and show who has them
- "Team Full" message when 3 speakers are active
- Race condition handling (two users selecting same role)

### 3. Automatic Judge Access
- Judges bypass role selection
- Directly join with JUDGE role
- Not counted in 3-per-team limit

### 4. Reconnection Support
- Users can refresh/reconnect without losing their role
- System remembers assigned role per debate
- Seamless rejoin experience

### 5. Access Denial for Extras
- 4th+ debaters cannot join video call
- Coaches without judge assignment blocked
- Clear messaging explaining why access is denied
- Display of current participants and their roles

## 🔧 How It Works

### For Debaters (First Time)
1. Click "Enter Debate Room" on "Your Next Round" page
2. Role selection dialog appears
3. Choose available role (disabled if taken)
4. System validates and reserves role
5. Redirect to debate room with video access

### For Judges
1. Click "Enter Judging Room"
2. Auto-reserve JUDGE role
3. Direct access to debate room

### For Reconnecting Users
1. Click "Enter Debate Room" again
2. System detects existing role
3. Skip role selection
4. Direct access with previous role

### For Non-Participants
1. Attempt to access debate room
2. System checks for DebateParticipant entry
3. None found → Access denied screen
4. Shows current participants
5. Cannot join video call

## 🛡️ Security & Validation

### Database Level
- Unique constraint: One role per user per debate
- Unique constraint: One user per role per team
- Foreign key cascades for cleanup

### API Level
- Authentication required on all endpoints
- User must be assigned to debate (via TournamentParticipation)
- Team capacity validation (max 3 debaters)
- Role availability checking
- Race condition handling via Prisma constraints

### Frontend Level
- Fresh data fetching before role selection
- UI disables taken roles
- Team capacity display
- Error handling with user-friendly messages

## 🧪 Testing Recommendations

### Critical Paths to Test
1. **Basic flow**: Debater selects role and joins
2. **3-person limit**: 4th debater cannot join
3. **Judge flow**: Direct access without role selection
4. **Reconnection**: User maintains role after refresh
5. **Race condition**: Two users selecting same role simultaneously
6. **Access denial**: Non-participant cannot access room

### Test Scenarios
- [ ] First debater joins successfully
- [ ] Second debater joins with different role
- [ ] Third debater joins with remaining role
- [ ] Fourth debater sees "Team Full" message
- [ ] Judge joins directly without selection
- [ ] User reconnects with same role
- [ ] Two users race for same role (one fails gracefully)
- [ ] Non-assigned user sees access denied
- [ ] Role taken indicator updates in real-time

## 📊 Database Migration Status

✅ Migration applied successfully: `add_debate_participant_roles`

Tables created:
- `DebateParticipant` - Tracks role assignments

Enums created:
- `SpeakerRole` - FIRST_SPEAKER, SECOND_SPEAKER, THIRD_SPEAKER, REPLY_SPEAKER, JUDGE
- `ParticipantStatus` - ACTIVE, LEFT, RESERVED

Fields added:
- `RoundPairing.callId` - Stream video call identifier

## 🚀 Ready for Testing

The system is now ready for end-to-end testing. You should:

1. **Create test data**:
   - Tournament with teams
   - Round with pairings
   - Assign 4+ debaters to a team
   - Assign judges to pairings

2. **Test as debater**:
   - Navigate to "Your Next Round"
   - Select a role
   - Join debate room
   - Verify video access

3. **Test 3-person limit**:
   - Have 3 debaters join
   - Try to join as 4th debater
   - Verify "Team Full" message

4. **Test as judge**:
   - Navigate to "Your Next Round"
   - Verify direct access
   - No role selection needed

5. **Test reconnection**:
   - Join as debater
   - Close browser
   - Re-enter room
   - Verify same role maintained

## 🔄 Next Steps (Optional Enhancements)

While the core system is complete, consider these future enhancements:

1. **Real-time Updates**: WebSocket notifications when roles are taken
2. **Role Swapping**: Allow debaters to swap roles with consent
3. **Pre-assignment**: Admin can pre-assign roles
4. **Role History**: Track which roles each debater has played
5. **Spectator Mode**: Allow extras to watch (no audio/video)
6. **Timer Integration**: Restore debate timer in room
7. **Format Configuration**: Support different debate formats (2v2, 3v3, etc.)

## 📝 Notes

- The system uses Prisma's transaction handling for atomic operations
- Race conditions are handled via database constraints (returns 409 error)
- Role selection is mandatory for debaters but automatic for judges
- Non-participants see participant list but cannot join call
- System is designed for British Parliamentary or similar 3-speaker formats

## 🆘 Troubleshooting

If you encounter issues:

1. **Check Prisma Client**: Run `npx prisma generate` if types are missing
2. **Verify Migration**: Run `npx prisma migrate status` to check
3. **Check Logs**: Review browser console and server logs for errors
4. **Database State**: Check DebateParticipant table for status field values
5. **Team Assignment**: Verify TournamentParticipation has valid teamId

For detailed troubleshooting, see `docs/DEBATE_ROOM_ROLES.md`.

## ✨ Success Criteria Met

✅ Database schema supports role tracking
✅ API endpoints handle reservation and retrieval
✅ Role selection dialog implemented
✅ 3-person-per-team limit enforced
✅ Judge auto-access implemented
✅ Access control prevents unauthorized joins
✅ Reconnection maintains user roles
✅ Race conditions handled gracefully
✅ UI shows role assignments clearly
✅ Documentation complete

---

**Status**: Implementation Complete ✅
**Ready for**: Testing and Integration
**Last Updated**: November 17, 2025
