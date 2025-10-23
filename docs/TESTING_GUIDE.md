# Testing Guide - Tournament System

This guide provides manual testing steps to validate the Tabbycat-style tournament system implementation.

## Prerequisites

1. Database is set up and migrated
2. Application is running (`npm run dev`)
3. You have at least one user account created

## Test Scenario: Complete Tournament Lifecycle

### Phase 1: Tournament Creation

1. **Navigate to Browse Tournaments**
   - Go to `/tournaments`
   - Verify page loads with empty or existing tournaments

2. **Create New Tournament**
   - Click "Create Tournament" button
   - **Expected**: Should redirect to tournament creation form
   - Fill in:
     - Name: "Test Tournament 2025"
     - Description: "A test tournament"
     - Start Date: Future date
   - Submit form
   - **Expected**: Tournament created with DRAFT status

3. **Access Tournament Admin**
   - View tournament detail page
   - Click "Manage Tournament"
   - **Expected**: Admin page loads with venue/round/motion forms

### Phase 2: Tournament Setup

4. **Add Venues**
   - In admin page, add venue:
     - Name: "Room 101"
     - URL: "https://meet.example.com/room101"
   - Click "Add Venue"
   - **Expected**: Venue appears in list below

5. **Create Rounds**
   - Add round:
     - Name: "Preliminary 1"
     - Stage: "Preliminary"
   - Click "Add Round"
   - **Expected**: Round appears with seq=1

6. **Add Motions**
   - Add motion:
     - Text: "This house believes that AI will benefit humanity"
     - Info Slide: "Focus on long-term impacts"
   - Click "Add Motion"
   - **Expected**: Success message

7. **Change Tournament Status to REGISTRATION**
   - Go back to tournament detail page
   - In admin controls, click "REGISTRATION" button
   - **Expected**: Status changes, registration becomes available

### Phase 3: Registration

8. **Register a Team**
   - Navigate to `/tournaments/[id]/register/team`
   - Fill in:
     - Team Name: "Alpha Debaters"
     - Speaker Names: "John Doe, Jane Smith"
   - Submit
   - **Expected**: Redirects to tournament page, team appears in list

9. **Register Another Team**
   - Repeat for "Beta Speakers"
   - **Expected**: Second team appears

10. **Register as Adjudicator**
    - Navigate to `/tournaments/[id]/register/adjudicator`
    - Fill in:
      - Rating: 7.5
      - Independent: Checked
    - Submit
    - **Expected**: Redirects back, adjudicator count increases

### Phase 4: Check-in

11. **Open Check-in Page**
    - Navigate to `/tournaments/[id]/checkin`
    - Select "Preliminary 1" round
    - **Expected**: Teams and adjudicators listed

12. **Check In Teams**
    - Click "Available" for both teams
    - **Expected**: Buttons turn green indicating checked in

13. **Check In Adjudicators**
    - Click "Available" for adjudicator
    - **Expected**: Button turns green

### Phase 5: Create Debates (API Test)

14. **Create Debate via API**
    ```bash
    curl -X POST http://localhost:3000/api/debates \
      -H "Content-Type: application/json" \
      -d '{
        "propTeamId": "[alpha-team-id]",
        "oppTeamId": "[beta-team-id]",
        "roundId": "[round-id]",
        "venueId": "[venue-id]",
        "tournamentId": "[tournament-id]"
      }'
    ```
    - **Expected**: Debate created successfully

15. **View Round Details**
    - Navigate to `/tournaments/[id]/rounds/[roundId]`
    - **Expected**: Debate appears in draw
    - Shows prop vs opp teams
    - Shows venue assignment

### Phase 6: Running Debates

16. **Update Debate Status to LIVE (API)**
    ```bash
    curl -X PATCH http://localhost:3000/api/debates/[debate-id] \
      -H "Content-Type: application/json" \
      -d '{"status": "LIVE"}'
    ```
    - **Note**: You may need to add this endpoint or update via Prisma Studio

17. **Join Debate**
    - From round page, click "Join" on live debate
    - **Expected**: Redirects to `/debate/[id]`
    - Existing debate room interface loads
    - 3-panel layout: Prop | Center | Opp
    - Judge panel at bottom center

### Phase 7: Submit Ballots

18. **Submit Ballot via API**
    ```bash
    curl -X POST http://localhost:3000/api/debates/[debate-id]/ballots \
      -H "Content-Type: application/json" \
      -d '{
        "adjudicatorId": "[adjudicator-id]",
        "winningSide": "PROP",
        "propScore": 75,
        "oppScore": 72,
        "comments": "Strong arguments from proposition",
        "status": "CONFIRMED"
      }'
    ```
    - **Expected**: Ballot submitted successfully

19. **Set Final Decision**
    ```bash
    curl -X POST http://localhost:3000/api/debates/[debate-id]/decide \
      -H "Content-Type: application/json" \
      -d '{"winningSide": "PROP"}'
    ```
    - **Expected**: Winning side set

20. **Verify Winner in Round Page**
    - Refresh round detail page
    - **Expected**: "Winner" badge appears on PROP team

## Verification Checklist

### Database Schema
- [x] All new tables created (Adjudicator, Venue, Round, Motion, Ballot, etc.)
- [x] Foreign keys properly set up
- [x] Indexes created for performance

### API Endpoints
- [x] Tournament status management works
- [x] Adjudicator registration works
- [x] Venue creation works
- [x] Round creation works
- [x] Motion creation works
- [x] Check-in system works
- [x] Ballot submission works

### UI Pages
- [x] Tournament browse page loads
- [x] Tournament detail page shows stats
- [x] Tournament admin page functional
- [x] Registration forms work
- [x] Check-in interface functional
- [x] Round detail page shows draw

### Integration
- [x] Debates link to tournaments
- [x] Debates link to rounds
- [x] Debates link to venues
- [x] Debate room interface preserved
- [x] Navigation flows properly

## Common Issues and Solutions

### Issue: Migration Errors
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct in .env

### Issue: Authentication Errors
**Solution**: Verify Clerk keys are set in .env and webhook is configured

### Issue: Teams Not Appearing
**Solution**: Check that tournamentId is correctly passed when creating teams

### Issue: Check-in Not Working
**Solution**: Ensure rounds exist before attempting check-in

## Using Prisma Studio for Testing

For easier testing without curl commands:

```bash
npx prisma studio
```

This opens a GUI where you can:
- View all data
- Create/edit records directly
- Test relationships
- Update debate statuses

## Performance Testing

For larger tournaments:

1. Create 50+ teams
2. Create 10 rounds
3. Generate 100+ debates
4. Test check-in with many participants
5. Verify page load times remain reasonable

## Security Testing

1. **Unauthorized Access**
   - Try accessing admin endpoints without auth
   - **Expected**: 401/403 errors

2. **Tournament Creator Permissions**
   - Non-creator tries to manage tournament
   - **Expected**: 403 Forbidden

3. **Registration Validation**
   - Try registering team when registration closed
   - **Expected**: Error message

## Browser Compatibility

Test on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Next Steps

After manual testing passes:

1. **Automated Tests**: Add Jest/Vitest tests for API endpoints
2. **E2E Tests**: Add Playwright tests for UI flows
3. **Load Testing**: Use k6 or similar for performance testing
4. **Documentation**: Update API docs with real examples
