# Your Next Round - API Examples

## Endpoint
```
GET /api/tournaments/:tournamentId/my-next-round
```

## Example Responses

### 1. Debater with Assignment (200 OK)

```json
{
  "round": {
    "id": "rnd_abc123",
    "number": 1,
    "name": "Round 1"
  },
  "pairing": {
    "id": "rpair_xyz789",
    "scheduledAt": "2025-11-20T14:00:00.000Z"
  },
  "role": "DEBATER",
  "side": "PROP",
  "yourTeam": {
    "id": "team_456",
    "name": "Oxford A",
    "teamNumber": 1,
    "institution": {
      "id": "inst_123",
      "name": "Oxford University"
    },
    "participations": [
      {
        "user": {
          "id": "user_001",
          "username": "john_doe",
          "email": "john@oxford.edu"
        }
      },
      {
        "user": {
          "id": "user_002",
          "username": "jane_smith",
          "email": "jane@oxford.edu"
        }
      }
    ]
  },
  "opponentTeam": {
    "id": "team_789",
    "name": "Cambridge A",
    "teamNumber": 1,
    "institution": {
      "id": "inst_456",
      "name": "Cambridge University"
    },
    "participations": [
      {
        "user": {
          "id": "user_003",
          "username": "bob_jones",
          "email": "bob@cambridge.edu"
        }
      }
    ]
  },
  "judges": [
    {
      "id": "rpj_001",
      "isChair": true,
      "user": {
        "id": "user_judge_001",
        "username": "judge_sarah",
        "email": "sarah@judge.com"
      },
      "institution": {
        "id": "inst_789",
        "name": "Harvard University"
      }
    },
    {
      "id": "rpj_002",
      "isChair": false,
      "user": {
        "id": "user_judge_002",
        "username": "judge_mike",
        "email": "mike@judge.com"
      },
      "institution": {
        "id": "inst_890",
        "name": "Yale University"
      }
    }
  ]
}
```

### 2. Judge with Assignment (200 OK)

```json
{
  "round": {
    "id": "rnd_abc123",
    "number": 2,
    "name": "Round 2"
  },
  "pairing": {
    "id": "rpair_xyz999",
    "scheduledAt": "2025-11-20T16:00:00.000Z"
  },
  "role": "JUDGE",
  "isChair": true,
  "propTeam": {
    "id": "team_111",
    "name": "MIT A",
    "teamNumber": 1,
    "institution": {
      "id": "inst_111",
      "name": "Massachusetts Institute of Technology"
    },
    "participations": [
      {
        "user": {
          "id": "user_011",
          "username": "alice_tech",
          "email": "alice@mit.edu"
        }
      }
    ]
  },
  "oppTeam": {
    "id": "team_222",
    "name": "Stanford A",
    "teamNumber": 1,
    "institution": {
      "id": "inst_222",
      "name": "Stanford University"
    },
    "participations": [
      {
        "user": {
          "id": "user_022",
          "username": "carol_stanford",
          "email": "carol@stanford.edu"
        }
      }
    ]
  },
  "judges": [
    {
      "id": "rpj_101",
      "isChair": true,
      "user": {
        "id": "user_judge_010",
        "username": "chief_judge",
        "email": "chief@tournament.org"
      },
      "institution": {
        "id": "inst_333",
        "name": "Columbia University"
      }
    },
    {
      "id": "rpj_102",
      "isChair": false,
      "user": {
        "id": "user_judge_020",
        "username": "panelist_judge",
        "email": "panelist@tournament.org"
      },
      "institution": null
    }
  ]
}
```

### 3. No Assignment Yet (200 OK)

```json
{
  "message": "No round assignment found yet",
  "participation": {
    "role": "DEBATER",
    "team": {
      "id": "team_555",
      "name": "Princeton A",
      "teamNumber": 1,
      "institution": {
        "id": "inst_555",
        "name": "Princeton University"
      }
    },
    "institution": {
      "id": "inst_555",
      "name": "Princeton University"
    }
  }
}
```

### 4. Not Registered for Tournament (404 Not Found)

```json
{
  "error": "You are not registered for this tournament"
}
```

### 5. Unauthorized (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

### 6. Tournament Not Found (404 Not Found)

```json
{
  "error": "Tournament not found"
}
```

## Usage in Frontend

```typescript
// In React component
const response = await fetch(`/api/tournaments/${tournamentId}/my-next-round`);

if (response.status === 404) {
  const error = await response.json();
  // Handle not registered error
  console.error(error.error);
  return;
}

if (!response.ok) {
  throw new Error('Failed to fetch next round');
}

const data = await response.json();

// Check if there's an assignment
if ('message' in data) {
  // No assignment yet - show waiting state
  showNoAssignmentMessage(data.message, data.participation);
} else if (data.role === 'DEBATER') {
  // Show debater view
  showDebaterView(data);
} else if (data.role === 'JUDGE') {
  // Show judge view
  showJudgeView(data);
}
```

## Key Fields

### Common Fields
- `round`: Round information (id, number, name)
- `pairing`: Pairing information (id, scheduledAt)
- `role`: User's role in this round ("DEBATER" or "JUDGE")

### Debater-Specific Fields
- `side`: Which side they're debating ("PROP" or "OPP")
- `yourTeam`: Full details of their team
- `opponentTeam`: Full details of opponent team (can be null)
- `judges`: Array of judges for this debate

### Judge-Specific Fields
- `isChair`: Whether this judge is the chair judge
- `propTeam`: Proposition team details (can be null)
- `oppTeam`: Opposition team details (can be null)
- `judges`: Array of all judges (including self)

## Notes
- The API returns the **first** round where the user is assigned (lowest round number)
- If a user is assigned to multiple rounds, only the earliest is returned
- Team and judge arrays include full user details for display
- Scheduled times are in ISO 8601 format (UTC)
- The pairing ID is used as the room identifier for video calls
