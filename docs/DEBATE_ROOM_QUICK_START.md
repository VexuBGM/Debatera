# Quick Start: Testing the Debate Room Role Selection System

## Prerequisites

1. ✅ Database migration applied (`add_debate_participant_roles`)
2. ✅ Prisma client generated
3. ✅ Development server running
4. ✅ Test tournament with teams and rounds created

## Quick Test Steps

### Setup Test Data (If Not Already Done)

```bash
# 1. Ensure database is up-to-date
npx prisma migrate dev

# 2. Generate Prisma client
npx prisma generate

# 3. (Optional) Seed test data
npx prisma db seed
```

### Test Scenario 1: Debater Joining (Success)

1. **Login as a debater** assigned to a team in an upcoming round
2. Navigate to the tournament page
3. Click on **"Your Next Round"** tab
4. You should see:
   - Round information
   - Motion (if set)
   - Your team and opponent team
   - "Enter Debate Room" button
5. Click **"Enter Debate Room"**
6. **Role Selection Dialog** should appear with:
   - 4 speaker roles available
   - Each role shows its description
   - All roles should be selectable (green on hover)
7. Select **"First Speaker"**
8. Click **"Continue to Room"**
9. You should be redirected to `/debate/[pairingId]`
10. **Meeting Setup** screen shows with your role displayed
11. Click **"Join Meeting"**
12. You're now in the debate room ✅

### Test Scenario 2: Second Debater Joins

1. **Login as another debater** on the same team
2. Navigate to "Your Next Round"
3. Click **"Enter Debate Room"**
4. Role Selection Dialog appears
5. Notice:
   - "First Speaker" is now disabled
   - Shows "Taken by [Username]"
6. Select **"Second Speaker"**
7. Click "Continue to Room"
8. Successfully join the debate ✅

### Test Scenario 3: Third Debater Joins

1. **Login as a third debater** on the same team
2. Navigate to "Your Next Round"
3. Click "Enter Debate Room"
4. Role Selection Dialog shows:
   - First Speaker - Taken
   - Second Speaker - Taken
   - Third Speaker - Available ✅
   - Reply Speaker - Available
5. Select **"Third Speaker"**
6. Successfully join ✅

### Test Scenario 4: Fourth Debater (Team Full)

1. **Login as a fourth debater** on the same team
2. Navigate to "Your Next Round"
3. Click "Enter Debate Room"
4. Role Selection Dialog shows:
   - **"Team Full"** message
   - List of 3 speakers already joined
   - No selectable roles
   - "Close" button only
5. Cannot proceed to room ✅

### Test Scenario 5: Judge Direct Access

1. **Login as a user assigned as judge** to the pairing
2. Navigate to "Your Next Round"
3. Click **"Enter Judging Room"** (purple button)
4. **No role selection dialog** appears
5. Directly redirected to debate room
6. Meeting setup shows
7. Can join immediately ✅

### Test Scenario 6: Reconnection

1. **While still logged in** from Scenario 1 (First Speaker)
2. Close the browser tab
3. Navigate back to "Your Next Round"
4. Click "Enter Debate Room"
5. **No role selection** appears
6. Directly enters room with existing "First Speaker" role ✅

### Test Scenario 7: Non-Participant Access

1. **Login as a user NOT assigned** to this debate
2. Directly navigate to `/debate/[pairingId]` (copy URL from another session)
3. Should see:
   - ⚠️ "Access Restricted" message
   - Explanation of why access is denied
   - List of current participants with roles
   - Cannot join video call ✅

### Test Scenario 8: Race Condition

1. **Have two debaters ready** on different browsers/devices
2. Both on "Your Next Round" page
3. Both click "Enter Debate Room" **at the same time**
4. Both select **"Third Speaker"**
5. Both click "Continue" simultaneously
6. **Result**:
   - One succeeds ✅
   - Other gets error: "That role was just taken by another user"
   - Failed user's dialog refreshes
   - Failed user can select different role ✅

## Expected UI Elements

### Role Selection Dialog
- **Title**: "Choose Your Speaker Role"
- **Description**: "Select your role for this debate. Only 3 debaters per team can join."
- **Role Cards**: 4 cards showing First, Second, Third, Reply speakers
- **Taken Roles**: Grayed out with "Taken by [Name]"
- **Team Status**: "Team capacity: X / 3 speakers joined"
- **Buttons**: "Cancel" and "Continue to Room"

### Access Denied Screen
- **Icon**: Orange alert circle
- **Title**: "Access Restricted"
- **Message**: Clear explanation
- **Participant List**: Shows all current participants with roles
- **Team Badges**: Green for PROP, Orange for OPP, Purple for JUDGES

### Debate Room (When Allowed)
- **Top Bar**: Shows your role
- **Side Panels**: Team names displayed
- **Video Grid**: 3 slots per team + judges panel
- **Controls**: Standard meeting controls

## Debugging Tips

### Role Selection Not Appearing
- Check browser console for errors
- Verify `/api/debates/[pairingId]/participants` returns 200
- Check user is assigned to a team in TournamentParticipation

### "Debate not found" Error
- Verify pairingId exists in database
- Check RoundPairing has propTeamId or oppTeamId
- Ensure round status is not PLANNING (unless admin)

### Can't Reserve Role
- Check browser console for API response
- Common errors:
  - 400: Invalid role or team full
  - 403: User not assigned to debate
  - 409: Role just taken (race condition)

### Access Denied Incorrectly
- Check DebateParticipant table for entry
- Verify userId matches logged-in user
- Check status is ACTIVE or RESERVED

## Quick Database Checks

```sql
-- See all debate participants
SELECT * FROM "DebateParticipant" WHERE "pairingId" = 'your_pairing_id';

-- See available roles for a team
SELECT role, status, "User".username
FROM "DebateParticipant"
JOIN "User" ON "DebateParticipant"."userId" = "User".id
WHERE "pairingId" = 'your_pairing_id' AND "teamId" = 'your_team_id';

-- Count debaters per team
SELECT "teamId", COUNT(*)
FROM "DebateParticipant"
WHERE "pairingId" = 'your_pairing_id' AND "teamId" IS NOT NULL
GROUP BY "teamId";
```

## Common Test Data Setup

If you need to create test data manually:

1. **Create a tournament** (via UI or API)
2. **Register institutions** to the tournament
3. **Create teams** for institutions (at least 2 teams)
4. **Add 4+ debaters** to one team (for testing limits)
5. **Create a round** with pairings
6. **Assign teams** to a pairing (prop vs opp)
7. **Assign judges** to the pairing (optional)
8. **Publish the round** (set status to PUBLISHED)

Now you're ready to test!

## Success Checklist

After testing all scenarios, verify:

- [ ] First debater can select and join
- [ ] Second debater sees first role as taken
- [ ] Third debater joins successfully
- [ ] Fourth debater sees "Team Full"
- [ ] Judge joins without role selection
- [ ] User can reconnect with same role
- [ ] Non-participant sees access denied
- [ ] Race condition handled gracefully
- [ ] UI shows team names and roles
- [ ] Video call only accessible to participants

## Next Steps After Testing

Once all tests pass:

1. ✅ Test with real users in production-like environment
2. ✅ Monitor for edge cases or bugs
3. ✅ Consider adding telemetry/analytics
4. ✅ Plan for future enhancements (see main docs)
5. ✅ Update user training materials

---

**Happy Testing! 🎉**

For detailed documentation, see `DEBATE_ROOM_ROLES.md`
For implementation details, see `DEBATE_ROOM_IMPLEMENTATION_SUMMARY.md`
