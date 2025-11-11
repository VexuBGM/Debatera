# Tournament Registration Flow

This document explains the step-by-step process for registering institutions and users for a tournament.

## Overview

The tournament registration system follows a hierarchical flow to ensure proper organization and tracking:

```
1. Institution Registration (by Coaches)
   ↓
2. User Registration (by Coaches)
   ↓
3. Team Creation (by Coaches)
   ↓
4. Team Member Assignment (by Coaches)
```

## Prerequisites

Before starting the registration process:

1. **Institution exists**: An institution must be created (any user can create one)
2. **Coach assigned**: The institution creator is automatically a coach, or coaches can be added by existing coaches
3. **Tournament exists**: A tournament must be created by a tournament administrator

## Step 1: Institution Registration

**Who can do this:** Only coaches of an institution

**Endpoint:** `POST /api/tournaments/{tournamentId}/register-institution`

**Purpose:** Registers the institution as a participant in the tournament. This is a **required first step** before any other actions can be taken.

### Example Request

```bash
curl -X POST https://your-app.com/api/tournaments/tournament_123/register-institution \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### What happens:
- Creates a `TournamentInstitutionRegistration` record
- Links the institution to the tournament
- Enables coaches to proceed with user and team registration

### Common Errors:
- **403 Forbidden**: "Only coaches can register institutions for tournaments"
  - Solution: Make sure you are a coach of the institution
- **409 Conflict**: "Institution is already registered for this tournament"
  - Solution: Your institution is already registered, proceed to the next step

## Step 2: User Registration

**Who can do this:** Only coaches of a registered institution

**Endpoint:** `POST /api/tournaments/{tournamentId}/register`

**Purpose:** Registers users from your institution to participate in the tournament as debaters or judges.

### Example Request

```bash
curl -X POST https://your-app.com/api/tournaments/tournament_123/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registrations": [
      {
        "userId": "user_abc123",
        "role": "DEBATER",
        "teamId": null
      },
      {
        "userId": "user_def456",
        "role": "JUDGE",
        "teamId": null
      }
    ]
  }'
```

### Request Fields:
- `userId`: The Clerk user ID of the person to register
- `role`: Either `"DEBATER"` or `"JUDGE"`
- `teamId`: (Optional) Can be `null` initially and assigned later

### What happens:
- Creates `TournamentParticipation` records for each user
- Validates that users belong to your institution
- Enforces the single appearance rule (user can only be in tournament once)

### Common Errors:
- **403 Forbidden**: "Your institution must be registered for this tournament first"
  - Solution: Complete Step 1 first
- **400 Bad Request**: "User must be a member of your institution"
  - Solution: Add the user to your institution first
- **409 Conflict**: "User is already registered in this tournament"
  - Solution: User is already participating, no action needed

## Step 3: Team Creation

**Who can do this:** Only coaches of a registered institution

**Endpoint:** `POST /api/tournaments/{tournamentId}/teams`

**Purpose:** Creates teams for your institution within the tournament.

### Example Request

```bash
curl -X POST https://your-app.com/api/tournaments/tournament_123/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "institution_xyz789"
  }'
```

### What happens:
- Creates a `TournamentTeam` with an auto-incremented team number
- Team name format: `<InstitutionName> <teamNumber>` (e.g., "Harvard 1", "Harvard 2")
- You can create multiple teams for your institution

### Common Errors:
- **403 Forbidden**: "Institution must be registered for this tournament first"
  - Solution: Complete Step 1 first
- **403 Forbidden**: "Only coaches can create teams for their institution"
  - Solution: Make sure you are a coach

## Step 4: Team Member Assignment

**Who can do this:** Only coaches of a registered institution

**Endpoint:** `POST /api/tournament-teams/{teamId}/members`

**Purpose:** Assigns debaters to specific teams.

### Example Request

```bash
curl -X POST https://your-app.com/api/tournament-teams/team_abc123/members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc123",
    "role": "DEBATER"
  }'
```

### Team Size Rules:
- **Minimum**: 3 debaters
- **Maximum**: 5 debaters
- Judges are not assigned to teams

### What happens:
- Updates the user's `TournamentParticipation` to link them to the team
- Validates team size constraints

### Common Errors:
- **400 Bad Request**: "Team has reached maximum size (5 debaters)"
  - Solution: Create a new team or reassign someone
- **409 Conflict**: "User is already participating in this tournament"
  - Solution: User can only be on one team

## Complete Example Flow

Here's a complete example showing the entire registration process:

```javascript
// Step 1: Register Institution
const institutionReg = await fetch('/api/tournaments/tourn_123/register-institution', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

// Step 2: Register Users
const userReg = await fetch('/api/tournaments/tourn_123/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    registrations: [
      { userId: 'user_1', role: 'DEBATER' },
      { userId: 'user_2', role: 'DEBATER' },
      { userId: 'user_3', role: 'DEBATER' },
      { userId: 'user_4', role: 'DEBATER' },
      { userId: 'user_5', role: 'JUDGE' }
    ]
  })
});

// Step 3: Create Team
const teamReg = await fetch('/api/tournaments/tourn_123/teams', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    institutionId: 'inst_123'
  })
});
const team = await teamReg.json();

// Step 4: Assign Debaters to Team
for (const userId of ['user_1', 'user_2', 'user_3']) {
  await fetch(`/api/tournament-teams/${team.id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      role: 'DEBATER'
    })
  });
}
```

## Viewing Registered Institutions

Anyone can view which institutions are registered for a tournament:

**Endpoint:** `GET /api/tournaments/{tournamentId}/institutions`

```bash
curl https://your-app.com/api/tournaments/tournament_123/institutions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response:
```json
[
  {
    "id": "reg_123",
    "tournamentId": "tournament_123",
    "institutionId": "inst_456",
    "registeredAt": "2025-11-09T10:23:47.000Z",
    "institution": {
      "id": "inst_456",
      "name": "Harvard University",
      "description": "Harvard Debate Society",
      "_count": {
        "members": 12,
        "teams": 2
      }
    }
  }
]
```

## Unregistering an Institution

If you need to unregister your institution:

**Endpoint:** `DELETE /api/tournaments/{tournamentId}/register-institution`

```bash
curl -X DELETE https://your-app.com/api/tournaments/tournament_123/register-institution \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Important:** This action will automatically delete:
- All teams created by your institution in this tournament
- All user participations (debaters and judges) from your institution
- The institution registration record

This is a cascading deletion that cleans up all related data. **This action cannot be undone.**

**Response:**
```json
{
  "message": "Institution successfully unregistered from tournament",
  "deleted": {
    "teams": 2,
    "participations": 8
  }
}
```

## Roster Freeze

After a tournament's roster is frozen:
- **Institution Registration**: Completely blocked. Coaches cannot register new institutions.
- **Institution Unregistration**: Blocked. Coaches cannot unregister institutions.
- **User Registration**: Blocked via the roster freeze mechanism.
- **Team Creation**: Blocked via the roster freeze mechanism.
- **Team Changes**: No modifications can be made.

This ensures the tournament roster remains locked at all levels once frozen. Only tournament administrators can make modifications after the freeze.

Check the tournament details to see if the roster is frozen:

```bash
curl https://your-app.com/api/tournaments/tournament_123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Summary Checklist

For coaches registering their institution for a tournament:

- [ ] Verify you are a coach of your institution
- [ ] Register your institution for the tournament (Step 1)
- [ ] Register users from your institution (Step 2)
- [ ] Create teams for your institution (Step 3)
- [ ] Assign debaters to teams (Step 4)
- [ ] Ensure each team has 3-5 debaters
- [ ] Complete registration before roster freeze deadline

## Troubleshooting

### "Your institution must be registered for this tournament first"
**Problem:** Trying to register users or create teams before institution registration  
**Solution:** Complete Step 1 (Institution Registration) first

### "Only coaches can register institutions for tournaments"
**Problem:** You are not a coach of your institution  
**Solution:** Contact your institution's creator or an existing coach to add you as a coach

### "Institution is already registered for this tournament"
**Problem:** Trying to register an already-registered institution  
**Solution:** This is not an error - proceed to Step 2

### "User must be a member of your institution"
**Problem:** Trying to register a user who doesn't belong to your institution  
**Solution:** Add the user to your institution first using `/api/institutions/{id}/members`

### "Team has reached maximum size (5 debaters)"
**Problem:** Trying to add more than 5 debaters to a team  
**Solution:** Create a new team or move someone to a different team

### "Cannot unregister: Institution has existing data"
**Problem:** This error should not occur anymore - unregistration now cascades automatically  
**Solution:** The system will automatically remove all teams and participations when you unregister

### "Tournament roster is frozen"
**Problem:** Trying to make changes (register/unregister institutions, add users, create teams) after the freeze deadline  
**Solution:** Contact the tournament administrator to request changes or unfreeze the roster

## Additional Resources

- [Tournament API Documentation](./TOURNAMENT_API.md)
- [Tournament System Examples](./TOURNAMENT_EXAMPLES.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
