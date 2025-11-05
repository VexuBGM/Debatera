# Tournament System API Documentation

This document provides comprehensive documentation for the debate tournament system API endpoints.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [API Endpoints](#api-endpoints)
  - [Institution Management](#institution-management)
  - [Tournament Team Management](#tournament-team-management)
  - [Tournament Management](#tournament-management)
- [Error Codes](#error-codes)
- [Data Models](#data-models)

## Overview

The Tournament System allows institutions (schools/organizations) to register users (students) with specific roles (debater or judge) and manage their participation in debate tournaments.

## Core Concepts

### Institutions
- Any user can create an institution
- Institution creators are automatically assigned as **coaches**
- Users can only belong to **one institution** at a time
- Coaches manage users within their institution

### Teams
- Each institution can register **multiple teams** in a single tournament
- Team names follow the format: `<InstitutionName> <teamNumber>` (e.g., "Harvard 1", "Harvard 2")
- Teams must have **3-5 debaters** (minimum/maximum)
- **Single appearance rule**: A user cannot appear more than once in the same tournament

### Roles
- **DEBATER**: Competes on a team (3-5 per team)
- **JUDGE**: Judges debates in the tournament

### Roster Freeze
- Tournaments have an optional `rosterFreezeAt` timestamp
- After this time, no team creation, role changes, or user additions are allowed
- Only tournament **admins** can override the freeze

## API Endpoints

### Institution Management

#### Create Institution
```http
POST /api/institutions
```

**Request Body:**
```json
{
  "name": "Harvard University",
  "description": "Harvard Debate Society"
}
```

**Response:** `201 Created`
```json
{
  "id": "clx...",
  "name": "Harvard University",
  "description": "Harvard Debate Society",
  "createdById": "user_...",
  "createdAt": "2025-11-05T14:42:43.000Z",
  "updatedAt": "2025-11-05T14:42:43.000Z"
}
```

**Error Responses:**
- `409 Conflict` - You are already a member of an institution
- `409 Conflict` - An institution with this name already exists

---

#### Get All Institutions
```http
GET /api/institutions
```

**Response:** `200 OK`
```json
[
  {
    "id": "clx...",
    "name": "Harvard University",
    "description": "Harvard Debate Society",
    "createdAt": "2025-11-05T14:42:43.000Z",
    "_count": {
      "members": 12,
      "teams": 3
    }
  }
]
```

---

#### Get Institution Details
```http
GET /api/institutions/{institutionId}
```

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "name": "Harvard University",
  "description": "Harvard Debate Society",
  "createdById": "user_...",
  "createdBy": {
    "id": "user_...",
    "username": "john_doe",
    "email": "john@example.com",
    "imageUrl": "https://..."
  },
  "members": [
    {
      "id": "clx...",
      "userId": "user_...",
      "institutionId": "clx...",
      "isCoach": true,
      "joinedAt": "2025-11-05T14:42:43.000Z",
      "user": {
        "id": "user_...",
        "username": "john_doe",
        "email": "john@example.com",
        "imageUrl": "https://..."
      }
    }
  ],
  "teams": [...],
  "_count": {
    "members": 12,
    "teams": 3
  }
}
```

**Error Responses:**
- `404 Not Found` - Institution not found

---

#### Add Member to Institution
```http
POST /api/institutions/{institutionId}/members
```

**Request Body:**
```json
{
  "userId": "user_...",
  "isCoach": false
}
```

**Response:** `201 Created`
```json
{
  "id": "clx...",
  "userId": "user_...",
  "institutionId": "clx...",
  "isCoach": false,
  "joinedAt": "2025-11-05T14:42:43.000Z",
  "user": {
    "id": "user_...",
    "username": "jane_smith",
    "email": "jane@example.com",
    "imageUrl": "https://..."
  }
}
```

**Error Responses:**
- `403 Forbidden` - Only coaches can add members to the institution
- `404 Not Found` - Institution or user not found
- `409 Conflict` - User is already a member of this institution
- `409 Conflict` - User is already a member of another institution

---

#### Get Institution Members
```http
GET /api/institutions/{institutionId}/members
```

**Response:** `200 OK`
```json
[
  {
    "id": "clx...",
    "userId": "user_...",
    "institutionId": "clx...",
    "isCoach": true,
    "joinedAt": "2025-11-05T14:42:43.000Z",
    "user": {
      "id": "user_...",
      "username": "john_doe",
      "email": "john@example.com",
      "imageUrl": "https://..."
    }
  }
]
```

---

### Tournament Team Management

#### Create Tournament Team
```http
POST /api/tournaments/{tournamentId}/teams
```

**Request Body:**
```json
{
  "institutionId": "clx..."
}
```

**Response:** `201 Created`
```json
{
  "id": "clx...",
  "name": "Harvard University 1",
  "tournamentId": "clx...",
  "institutionId": "clx...",
  "teamNumber": 1,
  "createdAt": "2025-11-05T14:42:43.000Z",
  "updatedAt": "2025-11-05T14:42:43.000Z",
  "institution": {
    "id": "clx...",
    "name": "Harvard University"
  },
  "tournament": {
    "id": "clx...",
    "name": "National Championship 2025"
  }
}
```

**Error Responses:**
- `403 Forbidden` - Only coaches can create teams for their institution
- `404 Not Found` - Tournament or institution not found
- `423 Locked` - Tournament roster is frozen

---

#### Get Tournament Teams
```http
GET /api/tournaments/{tournamentId}/teams?institutionId={institutionId}
```

**Query Parameters:**
- `institutionId` (optional) - Filter teams by institution

**Response:** `200 OK`
```json
[
  {
    "id": "clx...",
    "name": "Harvard University 1",
    "tournamentId": "clx...",
    "institutionId": "clx...",
    "teamNumber": 1,
    "institution": {
      "id": "clx...",
      "name": "Harvard University"
    },
    "participations": [
      {
        "id": "clx...",
        "userId": "user_...",
        "role": "DEBATER",
        "user": {
          "id": "user_...",
          "username": "jane_smith",
          "email": "jane@example.com"
        }
      }
    ],
    "_count": {
      "participations": 4
    }
  }
]
```

---

#### Add Member to Tournament Team
```http
POST /api/tournament-teams/{teamId}/members
```

**Request Body:**
```json
{
  "userId": "user_...",
  "role": "DEBATER"
}
```

**Response:** `201 Created`
```json
{
  "id": "clx...",
  "userId": "user_...",
  "tournamentId": "clx...",
  "teamId": "clx...",
  "role": "DEBATER",
  "createdAt": "2025-11-05T14:42:43.000Z",
  "updatedAt": "2025-11-05T14:42:43.000Z",
  "user": {
    "id": "user_...",
    "username": "jane_smith",
    "email": "jane@example.com"
  },
  "team": {
    "id": "clx...",
    "name": "Harvard University 1"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Team has reached maximum size (5 debaters)
- `400 Bad Request` - User must be a member of the institution
- `403 Forbidden` - Only coaches can add members to teams
- `404 Not Found` - Team or user not found
- `409 Conflict` - User is already participating in this tournament
- `423 Locked` - Tournament roster is frozen

---

#### Change User Role in Team
```http
POST /api/tournament-teams/{teamId}/roles
```

**Request Body:**
```json
{
  "userId": "user_...",
  "role": "JUDGE"
}
```

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "userId": "user_...",
  "tournamentId": "clx...",
  "teamId": "clx...",
  "role": "JUDGE",
  "createdAt": "2025-11-05T14:42:43.000Z",
  "updatedAt": "2025-11-05T14:42:43.000Z",
  "user": {
    "id": "user_...",
    "username": "jane_smith",
    "email": "jane@example.com"
  },
  "team": {
    "id": "clx...",
    "name": "Harvard University 1"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Team has reached maximum size (5 debaters)
- `400 Bad Request` - Team must have at least 3 debaters
- `400 Bad Request` - User is not in this team
- `403 Forbidden` - Only coaches can change roles
- `404 Not Found` - User is not in this tournament
- `423 Locked` - Tournament roster is frozen

---

#### Get Team Members
```http
GET /api/tournament-teams/{teamId}/members
```

**Response:** `200 OK`
```json
[
  {
    "id": "clx...",
    "userId": "user_...",
    "tournamentId": "clx...",
    "teamId": "clx...",
    "role": "DEBATER",
    "createdAt": "2025-11-05T14:42:43.000Z",
    "updatedAt": "2025-11-05T14:42:43.000Z",
    "user": {
      "id": "user_...",
      "username": "jane_smith",
      "email": "jane@example.com",
      "imageUrl": "https://..."
    }
  }
]
```

---

### Tournament Management

#### Get Tournament Details
```http
GET /api/tournaments/{tournamentId}
```

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "name": "National Championship 2025",
  "description": "Annual national debate championship",
  "ownerId": "user_...",
  "rosterFreezeAt": "2025-12-01T00:00:00.000Z",
  "frozenById": "user_...",
  "createdAt": "2025-11-05T14:42:43.000Z",
  "updatedAt": "2025-11-05T14:42:43.000Z",
  "isRosterFrozen": false,
  "frozenBy": {
    "id": "user_...",
    "username": "admin_user",
    "email": "admin@example.com"
  },
  "_count": {
    "teams": 12,
    "participations": 48
  }
}
```

**Error Responses:**
- `404 Not Found` - Tournament not found

---

#### Freeze Tournament Roster
```http
POST /api/tournaments/{tournamentId}/freeze
```

**Request Body:**
```json
{
  "rosterFreezeAt": "2025-12-01T00:00:00.000Z"
}
```

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "name": "National Championship 2025",
  "rosterFreezeAt": "2025-12-01T00:00:00.000Z",
  "frozenById": "user_...",
  "frozenBy": {
    "id": "user_...",
    "username": "admin_user",
    "email": "admin@example.com"
  }
}
```

**Error Responses:**
- `403 Forbidden` - Only tournament admins can freeze the roster
- `404 Not Found` - Tournament not found

---

#### Get Tournament Participations
```http
GET /api/tournaments/{tournamentId}/participations?role={role}
```

**Query Parameters:**
- `role` (optional) - Filter by role: `DEBATER` or `JUDGE`

**Response:** `200 OK`
```json
{
  "debaters": [
    {
      "id": "clx...",
      "userId": "user_...",
      "tournamentId": "clx...",
      "teamId": "clx...",
      "role": "DEBATER",
      "user": {
        "id": "user_...",
        "username": "jane_smith",
        "email": "jane@example.com"
      },
      "team": {
        "id": "clx...",
        "name": "Harvard University 1",
        "institutionId": "clx...",
        "institution": {
          "id": "clx...",
          "name": "Harvard University"
        }
      }
    }
  ],
  "judges": [...],
  "total": 48
}
```

---

#### Override Roster Freeze
```http
POST /api/tournaments/{tournamentId}/override
```

**Response:** `200 OK`
```json
{
  "message": "Roster freeze has been removed. Changes can now be made.",
  "tournament": {
    "id": "clx...",
    "name": "National Championship 2025",
    "rosterFreezeAt": null,
    "frozenById": null
  }
}
```

**Error Responses:**
- `403 Forbidden` - Only tournament admins can override the roster freeze
- `404 Not Found` - Tournament not found

---

## Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid parameters or business rule violation |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource does not exist |
| `409` | Conflict - Resource conflict (e.g., duplicate, already exists) |
| `423` | Locked - Resource is locked (roster is frozen) |
| `500` | Internal Server Error - Unexpected error |

---

## Data Models

### RoleType (Enum)
- `DEBATER`
- `JUDGE`

### Institution
```typescript
{
  id: string
  name: string
  description?: string
  createdById: string
  createdAt: Date
  updatedAt: Date
  members: InstitutionMember[]
  teams: TournamentTeam[]
}
```

### InstitutionMember
```typescript
{
  id: string
  userId: string
  institutionId: string
  isCoach: boolean
  joinedAt: Date
}
```

### TournamentTeam
```typescript
{
  id: string
  name: string
  tournamentId: string
  institutionId: string
  teamNumber: number
  createdAt: Date
  updatedAt: Date
  participations: TournamentParticipation[]
}
```

### TournamentParticipation
```typescript
{
  id: string
  userId: string
  tournamentId: string
  teamId?: string
  role: RoleType
  createdAt: Date
  updatedAt: Date
}
```

### Tournament
```typescript
{
  id: string
  name: string
  description?: string
  ownerId: string
  rosterFreezeAt?: Date
  frozenById?: string
  createdAt: Date
  updatedAt: Date
}
```

---

## Business Rules Summary

1. **Institution Membership**
   - A user can only belong to one institution at a time
   - Institution creators are automatically coaches
   - Only coaches can add members or create teams

2. **Team Composition**
   - Teams must have 3-5 debaters (enforced when adding/removing members)
   - Team names follow format: `<InstitutionName> <teamNumber>`
   - An institution can have multiple teams in a tournament

3. **Single Appearance Rule**
   - A user cannot participate in the same tournament more than once
   - Enforced via unique constraint on `(userId, tournamentId)`

4. **Roster Freeze**
   - After `rosterFreezeAt` timestamp, modifications are blocked
   - Only tournament admins (owners) can make changes after freeze
   - Admins can override the freeze using the override endpoint

5. **Permissions**
   - Coaches can manage their institution's members and teams
   - Tournament admins can freeze/unfreeze rosters
   - Regular members cannot make administrative changes
