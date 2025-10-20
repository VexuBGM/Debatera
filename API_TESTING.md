# API Testing Guide

This guide shows how to test the Debatera API endpoints using curl or any HTTP client.

## Prerequisites

1. Ensure the database is set up and seeded:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Set up authentication (you'll need a valid Clerk session token)

## Example API Calls

### Tournaments

#### Create Tournament
```bash
curl -X POST http://localhost:3000/api/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "name": "Test Tournament",
    "description": "A test tournament"
  }'
```

#### List Tournaments
```bash
curl http://localhost:3000/api/tournaments
```

#### Verify Tournament (Admin Only)
```bash
curl -X POST http://localhost:3000/api/tournaments/{TOURNAMENT_ID}/verify \
  -H "Authorization: Bearer YOUR_ADMIN_CLERK_TOKEN"
```

### Teams

#### Create Team
```bash
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "name": "Test Team",
    "tournamentId": "TOURNAMENT_ID_OR_NULL"
  }'
```

#### List Teams
```bash
curl http://localhost:3000/api/teams
```

#### Add Team Member
```bash
curl -X POST http://localhost:3000/api/teams/{TEAM_ID}/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "userId": "USER_UUID"
  }'
```

### Debates

#### Create Debate
```bash
curl -X POST http://localhost:3000/api/debates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "propTeamId": "PROP_TEAM_UUID",
    "oppTeamId": "OPP_TEAM_UUID",
    "tournamentId": "TOURNAMENT_UUID_OR_NULL",
    "scheduledAt": "2025-11-01T18:00:00Z"
  }'
```

#### List Debates
```bash
curl http://localhost:3000/api/debates
```

#### Get Debate Details
```bash
curl http://localhost:3000/api/debates/{DEBATE_ID}
```

#### Add/Update Participant
```bash
# Add a debater
curl -X POST http://localhost:3000/api/debates/{DEBATE_ID}/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "userId": "USER_UUID",
    "role": "DEBATER",
    "side": "PROP",
    "speakOrder": 1
  }'

# Add a judge
curl -X POST http://localhost:3000/api/debates/{DEBATE_ID}/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "userId": "USER_UUID",
    "role": "JUDGE",
    "side": "NEUTRAL"
  }'

# Add a spectator
curl -X POST http://localhost:3000/api/debates/{DEBATE_ID}/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "userId": "USER_UUID",
    "role": "SPECTATOR",
    "side": "NEUTRAL"
  }'
```

#### Submit Judge Feedback
```bash
curl -X POST http://localhost:3000/api/debates/{DEBATE_ID}/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JUDGE_CLERK_TOKEN" \
  -d '{
    "notes": "Strong arguments from both sides",
    "winnerSide": "PROP"
  }'
```

#### Set Final Decision
```bash
curl -X POST http://localhost:3000/api/debates/{DEBATE_ID}/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JUDGE_OR_ADMIN_TOKEN" \
  -d '{
    "winningSide": "PROP"
  }'
```

## Testing Workflow

1. **Create a tournament** (as a regular user)
2. **Verify the tournament** (as an admin using `clerk_admin_mock_123` from seed data)
3. **Create two teams** and add members
4. **Create a debate** between the two teams
5. **Add participants**: debaters, judges, and spectators
6. **Judges submit feedback** with their notes and votes
7. **Set final decision** based on judge votes

## Validation Examples

### Test Admin Authorization

Try to verify a tournament as a regular user (should fail with 403):
```bash
curl -X POST http://localhost:3000/api/tournaments/{TOURNAMENT_ID}/verify \
  -H "Authorization: Bearer REGULAR_USER_TOKEN"
# Expected: {"error": "Forbidden: Admin access required"}
```

### Test Judge-Only Feedback

Try to submit feedback as a non-judge (should fail with 403):
```bash
curl -X POST http://localhost:3000/api/debates/{DEBATE_ID}/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer NON_JUDGE_TOKEN" \
  -d '{"notes": "Test"}'
# Expected: {"error": "Only judges in this debate can submit feedback"}
```

### Test Validation Rules

Try to create a debate with same team as prop and opp (should fail with 400):
```bash
curl -X POST http://localhost:3000/api/debates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{
    "propTeamId": "SAME_TEAM_UUID",
    "oppTeamId": "SAME_TEAM_UUID"
  }'
# Expected: {"error": "propTeamId and oppTeamId must be different"}
```

## Using Prisma Studio

For a visual interface to test the database:

```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555 where you can:
- View all records
- Create/edit/delete records
- Test relationships
- Verify data integrity
