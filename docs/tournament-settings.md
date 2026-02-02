# Tournament Customization Implementation

This document details the minimal tournament customization settings implementation.

## 1. Schema Changes

Added `TournamentSettings` model/table to Prisma schema:

```prisma
model TournamentSettings {
  id                   String    @id @default(cuid())
  tournamentId         String    @unique @db.VarChar(128)
  registrationOpensAt  DateTime?
  registrationClosesAt DateTime?
  teamSizeMin          Int       @default(2)
  teamSizeMax          Int       @default(5)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  tournament Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
}
```

Updated `Tournament` model to include `settings` relation.
Legacy fields (`teamMinSize`, `teamMaxSize`, `registrationClosesAt`) on `Tournament` are considered deprecated but retained for safety until full data migration.

## 2. Validation & Guards

### Zod Schema
Located in `src/lib/validations/tournamentSettings.ts`.
- Validates logical consistency (opens < closes, min <= max).
- Used for `PATCH` endpoint validation.

### Domain Guards
Located in `src/lib/guards/tournamentSettingsGuards.ts`.
- `isRegistrationOpen(settings, now)`: Boolean check.
- `assertRegistrationOpen(settings, now)`: Throws `REGISTRATION_CLOSED` if invalid.
- `assertValidTeamSize(settings, count, checkMin?)`: Throws `TEAM_SIZE_INVALID`. `checkMin` defaults to true but can be disabled for incremental team building.

## 3. API Endpoints

### `GET /api/tournaments/:id/settings`
- Returns settings object.
- **Auto-creates** default settings if they don't exist for the tournament.

### `PATCH /api/tournaments/:id/settings`
- Updates settings.
- Requires tournament creator permissions (Admin).
- Validates input using Zod schema.

## 4. Enforcement Points

### Institution Registration
- File: `src/app/api/tournaments/[id]/institution-registrations/route.ts`
- Fetches tournament settings (auto-falling back to defaults if null).
- Calls `assertRegistrationOpen`.

### Team Creation
- File: `src/actions/teams.actions.ts` (`createTeam`)
- Calls `assertRegistrationOpen`.
- Creates team (initially empty).

### Adding Members to Team
- File: `src/actions/teams.actions.ts` (`moveParticipant`)
- Calls `assertRegistrationOpen`.
- Calls `assertValidTeamSize(settings, count, false)` (checking MAX only) to allow incremental team building. Minimum size is not enforced during drag-and-drop operations to allow starting a team from 0 members.

## 5. Migration Notes
- Run `npx prisma migrate dev` to apply the schema changes.
- Existing tournaments will have settings auto-created upon first access to the settings endpoint or can be lazily created.
- The system defaults to "Open Registration" and "2-5 members" if no settings record is found.
