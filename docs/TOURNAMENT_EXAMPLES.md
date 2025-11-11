# Tournament System Usage Examples

This file contains example API calls for testing the tournament system.

## Setup

All examples assume you're authenticated with Clerk and have a valid session.

## Example Flow: Creating and Managing a Tournament

### 1. Create an Institution

```bash
POST /api/institutions
Content-Type: application/json

{
  "name": "Harvard University",
  "description": "Harvard Debate Society"
}
```

Response: Institution created, creator is now a coach.

### 2. Add Members to Institution

```bash
POST /api/institutions/{institutionId}/members
Content-Type: application/json

{
  "userId": "user_abc123",
  "isCoach": false
}
```

Add multiple members (students) to your institution.

### 3. Create a Tournament Team

```bash
POST /api/tournaments/{tournamentId}/teams
Content-Type: application/json

{
  "institutionId": "clx..."
}
```

This creates "Harvard University 1". Create more teams as needed ("Harvard University 2", etc.).

### 4. Add Debaters to Team

```bash
POST /api/tournament-teams/{teamId}/members
Content-Type: application/json

{
  "userId": "user_abc123",
  "role": "DEBATER"
}
```

Add 3-5 debaters to each team. The system will enforce:
- Minimum 3 debaters
- Maximum 5 debaters
- Single appearance rule (user can't join multiple teams in same tournament)

### 5. Add Judges

```bash
POST /api/tournament-teams/{teamId}/members
Content-Type: application/json

{
  "userId": "user_xyz789",
  "role": "JUDGE"
}
```

Judges don't count toward team size limits.

### 6. Change a User's Role

```bash
POST /api/tournament-teams/{teamId}/roles
Content-Type: application/json

{
  "userId": "user_abc123",
  "role": "JUDGE"
}
```

Convert a debater to a judge (or vice versa). The system will check team size constraints.

### 7. Freeze the Roster (Admin Only)

```bash
POST /api/tournaments/{tournamentId}/freeze
Content-Type: application/json

{
  "rosterFreezeAt": "2025-12-01T00:00:00.000Z"
}
```

After this timestamp, no changes can be made unless you're a tournament admin.

### 8. View All Participants

```bash
GET /api/tournaments/{tournamentId}/participations
```

Returns all debaters and judges grouped by role.

### 9. Override Freeze (Admin Only)

```bash
POST /api/tournaments/{tournamentId}/override
```

Removes the roster freeze to allow changes.

## Common Validation Scenarios

### Scenario 1: User Tries to Join Two Institutions

```bash
# User creates/joins Institution A
POST /api/institutions
{ "name": "Institution A" }

# User tries to join Institution B
POST /api/institutions/{institutionB}/members
{ "userId": "same_user" }

# Response: 409 Conflict
# "User is already a member of another institution"
```

### Scenario 2: User Tries to Join Multiple Teams in Same Tournament

```bash
# Add user to Team 1
POST /api/tournament-teams/{team1}/members
{ "userId": "user_abc", "role": "DEBATER" }

# Try to add same user to Team 2 in same tournament
POST /api/tournament-teams/{team2}/members
{ "userId": "user_abc", "role": "JUDGE" }

# Response: 409 Conflict
# "User is already participating in this tournament"
```

### Scenario 3: Team Size Limits

```bash
# Team already has 5 debaters
POST /api/tournament-teams/{teamId}/members
{ "userId": "user_6th", "role": "DEBATER" }

# Response: 400 Bad Request
# "Team has reached maximum size (5 debaters)"
```

### Scenario 4: Modifications After Freeze

```bash
# Tournament roster is frozen
POST /api/tournament-teams/{teamId}/members
{ "userId": "user_late", "role": "DEBATER" }

# Response: 423 Locked
# "Tournament roster is frozen. Only admins can make changes."
```

### Scenario 5: Coach Permissions

```bash
# Non-coach tries to add a member
POST /api/institutions/{institutionId}/members
{ "userId": "new_user", "isCoach": false }

# Response: 403 Forbidden
# "Only coaches can add members to the institution"
```

## Testing Workflow

### As a Coach:

1. ✅ Create an institution
2. ✅ Add students to your institution
3. ✅ Create teams for tournaments
4. ✅ Assign students to teams with roles
5. ✅ Change roles as needed (before freeze)
6. ❌ Cannot modify after roster freeze (unless admin)

### As a Tournament Admin:

1. ✅ Create tournaments
2. ✅ Set roster freeze dates
3. ✅ Override freeze when necessary
4. ✅ View all participants

### As a Student/Member:

1. ✅ View institution details
2. ✅ View tournament details
3. ❌ Cannot create teams
4. ❌ Cannot add members
5. ❌ Cannot change roles

## Query Examples

### Get all teams for an institution in a tournament

```bash
GET /api/tournaments/{tournamentId}/teams?institutionId={institutionId}
```

### Get only debaters in a tournament

```bash
GET /api/tournaments/{tournamentId}/participations?role=DEBATER
```

### Get only judges in a tournament

```bash
GET /api/tournaments/{tournamentId}/participations?role=JUDGE
```

### Get institution with all members and teams

```bash
GET /api/institutions/{institutionId}
```

### Get team roster

```bash
GET /api/tournament-teams/{teamId}/members
```

## Database Constraints Enforced

1. **Unique Institution Names**: Two institutions cannot have the same name
2. **Single Institution Membership**: Unique constraint on `InstitutionMember.userId`
3. **Single Appearance Rule**: Unique constraint on `(userId, tournamentId)` in `TournamentParticipation`
4. **Unique Team Numbers**: Unique constraint on `(tournamentId, institutionId, teamNumber)` in `TournamentTeam`

## Notes

- All `POST` endpoints require authentication
- Most modification endpoints check for coach/admin permissions
- Roster freeze is checked automatically for all modification operations
- Team size validation happens on both add and role change operations
- The system automatically generates team names based on institution name and team number
