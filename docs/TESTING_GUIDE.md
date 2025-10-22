# Tournament System Testing Guide

This guide walks through the complete tournament workflow from both the tournament organizer and debater perspectives.

## Prerequisites

- Application is running locally or deployed
- Database is set up and migrated
- At least 2 user accounts created (1 organizer, 1+ debaters)

## Part 1: Tournament Organizer Workflow

### Step 1: Create a Tournament

1. **Navigate to Tournaments**
   - Go to `/tournaments` or click "Tournaments" in the navbar
   - You should see a tournaments list page

2. **Create New Tournament**
   - Click "Create Tournament" button (cyan, top right)
   - Enter tournament name: "Spring Championship 2025"
   - Enter description: "Annual spring debate tournament"
   - Click "Create Tournament"
   - You should be redirected to the tournament detail page

**Expected Result:** New tournament created and displayed

### Step 2: Wait for Team Registration

At this point, you need teams to register for the tournament. Teams need to set their `tournamentId` when creating. For testing:

1. Create a team via API or use existing teams
2. Update team's `tournamentId` to point to your tournament

Or proceed to Part 2 first to create teams, then return here.

### Step 3: View Registered Teams

1. **Navigate to Tournament Detail**
   - Go to `/tournaments/[id]` (your tournament)
   - You should see tabs: Rounds, Teams, Standings, Settings

2. **Click Teams Tab**
   - Click "Teams" tab
   - You should see all teams registered for your tournament
   - Each team shows name, member count, and member avatars

**Expected Result:** List of registered teams displayed

### Step 4: Create Round 1

1. **Click Create Round**
   - On the tournament detail page, click "Create Round" (top right)
   - A new round is created and you're redirected to the round detail page

**Expected Result:** Round 1 created in draft state

### Step 5: Generate Draw (Round 1)

1. **Navigate to Round Detail**
   - You should be at `/tournaments/[id]/rounds/[roundId]`
   - Round shows "Draft" badge (yellow)
   - No debates listed yet

2. **Generate Draw**
   - Click "Generate Draw" button
   - Wait for generation to complete (shows spinner)
   - Debates appear in a 2-column grid

**Expected Result:** 
- Random pairings generated for Round 1
- Each debate shows Prop team (cyan) vs Opp team (red)
- No judges allocated yet

### Step 6: Allocate Judges

1. **Click Allocate Judges**
   - Click "Allocate Judges" button
   - Wait for allocation to complete (shows spinner)
   - Judges appear under each debate

**Expected Result:**
- Judges automatically allocated based on cost function
- Each debate shows allocated judge(s)
- Stronger judges on higher-bracket debates (later rounds)

### Step 7: Review Draw

1. **Review Pairings**
   - Check each debate card
   - Verify teams are correctly paired
   - Verify judges are allocated
   - Note any conflicts or issues

**Expected Result:** Draw looks correct and ready to publish

### Step 8: Publish Round

1. **Click Publish Round**
   - Click "Publish Round" button
   - Confirm if prompted
   - Status changes to "Published" (green)

**Expected Result:**
- Round is now published
- Status badge changes from "Draft" to "Published"
- Round is now visible to all participants

### Step 9: Record Results

For testing, you can manually set debate results via API:

```bash
# Update debate winningSide
PATCH /api/debates/[debateId]
{
  "winningSide": "PROP"  # or "OPP"
}
```

Or use the debate UI if available.

**Expected Result:** Debate results recorded

### Step 10: View Standings

1. **Navigate to Tournament**
   - Go back to tournament detail page
   - Click "Standings" tab

2. **View Standings**
   - Standings table shows all teams
   - Teams sorted by wins (descending)
   - Tie-breaker: Opponent strength (Buchholz)
   - Shows: Rank, Team, Wins, Losses, Prop/Opp counts, Opponent Strength

**Expected Result:** Standings displayed with correct rankings

### Step 11: Create Round 2

1. **Create Next Round**
   - Click "Create Round" button
   - New round created

2. **Generate Draw (Round 2)**
   - Click "Generate Draw"
   - This time, power pairing is used
   - Teams grouped by win brackets
   - Pull-ups applied for odd brackets
   - Rematch avoidance enforced
   - Side balancing attempted

**Expected Result:** 
- Teams with same win record paired together
- No rematches from Round 1
- Sides attempt to balance Prop/Opp counts

3. **Allocate Judges**
   - Click "Allocate Judges"
   - Stronger judges allocated to higher-bracket debates

4. **Publish Round**
   - Click "Publish Round"

**Expected Result:** Round 2 published with power-paired draw

### Step 12: Repeat for Additional Rounds

Continue creating rounds, generating draws, allocating judges, publishing, and recording results.

**Expected Behavior:**
- Each subsequent round uses power pairing
- Teams move up/down brackets based on wins
- Side balancing improves over rounds
- No rematches throughout tournament

---

## Part 2: Debater Workflow

### Step 1: Create or Join a Team

#### Option A: Create New Team

1. **Navigate to Teams**
   - Click "Teams" in navbar
   - Go to `/teams`

2. **Create Team**
   - Click "Create Team" button
   - Enter team name: "Team Awesome"
   - Click "Create"
   - Modal closes, team appears in grid

3. **View Team Details**
   - Click on your team card
   - You're redirected to `/teams/[id]`
   - You see team name, members list (just you)

**Expected Result:** New team created with you as member

#### Option B: Join Existing Team

1. **Navigate to Teams**
   - Go to `/teams`
   - Search for a team using the search box

2. **Join Team**
   - Click on a team card
   - Click "Join Team" button
   - Confirm in modal
   - You're added to members list

**Expected Result:** You're now a member of the team

### Step 2: Register Team for Tournament

Currently, team registration requires setting `tournamentId` when creating the team, or updating it via API:

```bash
# Update team to register for tournament
PATCH /api/teams/[teamId]
{
  "tournamentId": "tournament-uuid-here"
}
```

**Future Enhancement:** Add "Register for Tournament" button on team page.

**Expected Result:** Team is registered for tournament

### Step 3: View Your Tournament

1. **Navigate to Tournaments**
   - Click "Tournaments" in navbar
   - Find your tournament in the list
   - Click on the tournament card

2. **View Tournament Details**
   - You see the tournament detail page
   - Click "Teams" tab to see your team listed
   - Click "Rounds" tab to see upcoming rounds

**Expected Result:** Tournament details displayed

### Step 4: View Your Round Pairing

1. **After Round is Published**
   - Navigate to tournament
   - Click "Rounds" tab
   - Click on a published round

2. **Find Your Debate**
   - Scroll through debates to find your team
   - You'll see: "Your Team" vs "Opponent Team"
   - You'll see your side (Prop or Opp)
   - You'll see the assigned judge(s)

**Expected Result:** Your debate pairing displayed

### Step 5: Participate in Debate

1. **Join Debate Room** (if video feature enabled)
   - Click on debate to enter room
   - Video call starts with your team, opponent, and judge(s)

2. **Debate Proceeds**
   - Present your arguments
   - Respond to opponent
   - Judge provides feedback

**Expected Result:** Debate completed

### Step 6: Check Results

After organizer records results:

1. **View Round Results**
   - Navigate back to round detail page
   - Your debate shows winning side
   - Green checkmark on winning team

**Expected Result:** Debate result displayed

### Step 7: View Your Team's Standings

1. **Navigate to Tournament**
   - Go to tournament detail page
   - Click "Standings" tab

2. **Find Your Team**
   - Your team shows in the standings table
   - Shows your wins, losses, and opponent strength
   - Shows your rank in tournament

**Expected Result:** Your team's standing displayed

### Step 8: Continue Through Tournament

1. **Check for Next Round**
   - When organizer creates next round
   - You'll see it in Rounds tab

2. **View New Pairing**
   - After draw is published
   - Find your new debate pairing
   - Note your new opponent and side

3. **Track Progress**
   - After each round, check standings
   - See your team move up or down

**Expected Result:** Continue through all tournament rounds

---

## Part 3: Testing Scenarios

### Scenario 1: Basic 4-Team Tournament

**Setup:**
- 1 tournament
- 4 teams (2 members each)
- 2 judges
- 2 rounds

**Test:**
1. Create tournament
2. Register 4 teams
3. Create Round 1, generate draw (random), allocate judges, publish
4. Record results (Teams A and C win)
5. Create Round 2, generate draw (power paired), publish
6. Verify: Teams A and C paired together (both 1-0)
7. Verify: Teams B and D paired together (both 0-1)
8. Check standings

**Expected Outcome:** Power pairing works correctly

### Scenario 2: 8-Team Tournament with Odd Bracket

**Setup:**
- 1 tournament
- 8 teams
- 3 judges
- 3 rounds

**Test:**
1. Round 1: All teams paired randomly
2. Record results: 3 teams win (3-0 bracket), 2 teams at 1-0, 3 teams at 0-1
3. Round 2: Generate draw
4. Verify: 3-team bracket needs pull-up (pull 1 from 1-win bracket)
5. Verify: 4 teams in top bracket (3 wins + 1 pulled up)
6. Verify: No rematches
7. Round 3: Generate draw after Round 2 results
8. Check final standings

**Expected Outcome:** Pull-up logic works, no rematches

### Scenario 3: Side Balancing

**Setup:**
- 1 tournament
- 6 teams
- 4 rounds

**Test:**
1. Track each team's Prop/Opp assignments through all rounds
2. After 4 rounds, check Standings tab
3. Verify each team has roughly equal Prop and Opp counts
4. Expected: Each team 2 Prop, 2 Opp (or 3-1 at most)

**Expected Outcome:** Side balancing works over multiple rounds

### Scenario 4: Judge Allocation

**Setup:**
- 1 tournament
- 8 teams
- 5 judges with varying strengths
- 2 rounds

**Test:**
1. Round 1: Allocate judges, note which judges get which debates
2. Record results creating clear bracket separation
3. Round 2: Allocate judges to power-paired draw
4. Verify: Stronger judges on high-bracket debates
5. Verify: No judge-team conflicts (judge hasn't judged team before)
6. Verify: Judges distributed relatively evenly

**Expected Outcome:** Judge allocation considers importance and conflicts

### Scenario 5: Team Management

**Setup:**
- Multiple users
- Multiple teams

**Test:**
1. User A creates Team X
2. User B joins Team X
3. User C joins Team X
4. Verify: Team X shows 3 members
5. User B leaves Team X
6. Verify: Team X shows 2 members
7. User A deletes Team X
8. Verify: Team X is deleted

**Expected Outcome:** Team CRUD operations work correctly

---

## Common Issues & Solutions

### Issue: Draw generation fails
**Solution:** 
- Check that tournament has at least 2 teams
- Verify round doesn't already have debates
- Check browser console for errors

### Issue: Judge allocation fails
**Solution:**
- Verify debates exist in round
- Check that there are available judges (not team members)
- Verify round is not already published

### Issue: Can't publish round
**Solution:**
- Verify round has at least one debate
- Check that you're logged in as tournament organizer
- Ensure round isn't already published

### Issue: Standings not updating
**Solution:**
- Verify debates have `winningSide` set
- Check that rounds are published
- Refresh the page

### Issue: Teams not showing on tournament
**Solution:**
- Verify teams have correct `tournamentId`
- Check that you're viewing the correct tournament
- Refresh the page

---

## Success Criteria

After completing both workflows, you should have:

✅ Created a tournament
✅ Created/joined teams
✅ Registered teams for tournament
✅ Created multiple rounds
✅ Generated random draw (Round 1)
✅ Generated power-paired draws (Round 2+)
✅ Allocated judges automatically
✅ Published rounds
✅ Recorded debate results
✅ Viewed real-time standings
✅ Verified no rematches
✅ Observed side balancing
✅ Confirmed pull-up logic for odd brackets
✅ Checked Buchholz tie-breaker

**If all criteria are met, the tournament system is working correctly! 🎉**
