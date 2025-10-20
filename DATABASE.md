# Debatera Database Setup

This guide covers setting up the Debatera database layer powered by Prisma and PostgreSQL.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ and npm

## Environment Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `DATABASE_URL` in `.env` with your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/debatera?schema=public"
   ```

## Installation

Install dependencies:
```bash
npm install
```

## Database Migrations

Generate the Prisma Client and run migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations to create database schema
npx prisma migrate dev --name init_db
```

## Seeding the Database

The seed script creates sample data including:
- 2 users (1 admin, 1 regular user)
- 2 tournaments (1 verified, 1 unverified)
- 2 teams with members
- 1 debate with participants, judges, and feedback

Run the seed script:
```bash
npx prisma db seed
```

Or manually:
```bash
npx tsx prisma/seed.ts
```

## Database Schema Overview

The database includes the following main models:

### Core Models

- **User**: Platform users linked to Clerk authentication
  - `appRole`: USER or ADMIN (platform-wide role)
  
- **Tournament**: Debate tournaments
  - `isVerified`: Only admins can verify tournaments

- **Team**: Teams of debaters
  - Can be tournament-specific or independent

- **TeamMember**: Many-to-many relationship between teams and users

- **Debate**: Individual debate matches
  - 1v1 team format (Proposition vs Opposition)
  - Tracks status, scheduled time, and winning side

- **DebateParticipant**: Call-level roles per debate
  - `role`: DEBATER, JUDGE, or SPECTATOR
  - `side`: PROP, OPP, or NEUTRAL
  - `speakOrder`: Speaking order for debaters

- **JudgeFeedback**: Judge feedback and votes
  - Stores notes and winner preference per judge

## API Endpoints

### Tournaments

- `POST /api/tournaments` - Create a tournament (authenticated)
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments/:id/verify` - Verify tournament (admin only)

### Teams

- `POST /api/teams` - Create a team (authenticated)
- `GET /api/teams` - List all teams with members
- `POST /api/teams/:id/members` - Add a member to a team (authenticated)

### Debates

- `POST /api/debates` - Create a debate (authenticated)
- `GET /api/debates` - List all debates
- `GET /api/debates/:id` - Get debate details with participants and feedback
- `POST /api/debates/:id/participants` - Add/update participant role (authenticated)
- `POST /api/debates/:id/feedback` - Submit judge feedback (judge only)
- `POST /api/debates/:id/decide` - Set final winning side (judge or admin only)

## Authorization

- **Authentication**: All POST endpoints require authentication via Clerk
- **Admin-only**: Tournament verification requires `appRole: ADMIN`
- **Judge-only**: Submitting feedback requires being a JUDGE participant in that debate
- **Decision**: Setting the final decision requires being a JUDGE in the debate or an ADMIN

## Development Tools

### Prisma Studio

View and edit your database visually:
```bash
npx prisma studio
```

### Reset Database

Warning: This will delete all data!
```bash
npx prisma migrate reset
```

## Database Validation Rules

- Tournament `isVerified` can only be set via admin API
- Debate `propTeamId` must differ from `oppTeamId`
- Each `(debateId, userId)` can only have one `DebateParticipant` entry
- `speakOrder` must be `null` unless role is DEBATER with side PROP or OPP
- `JudgeFeedback` requires the judge to be a JUDGE participant in that debate
- Final `winningSide` must be PROP or OPP

## Troubleshooting

### Connection Issues

If you can't connect to the database:
1. Ensure PostgreSQL is running
2. Verify your `DATABASE_URL` credentials
3. Check that the database exists (create it if needed)

### Migration Errors

If migrations fail:
1. Check PostgreSQL version compatibility (12+)
2. Ensure you have proper permissions
3. Try resetting: `npx prisma migrate reset`

### Seed Errors

If seeding fails:
1. Ensure migrations have run successfully
2. Check for unique constraint violations
3. Reset and re-run: `npx prisma migrate reset && npx prisma db seed`
