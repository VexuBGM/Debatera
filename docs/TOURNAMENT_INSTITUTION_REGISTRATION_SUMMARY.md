# Tournament Institution Registration - Implementation Summary

## Overview

This implementation adds a required institution registration step to the tournament system. Institutions must now register for tournaments before coaches can register users or create teams.

## Changes Made

### 1. Database Schema Updates

**File:** `prisma/schema.prisma`

Added new model `TournamentInstitutionRegistration`:
```prisma
model TournamentInstitutionRegistration {
  id            String      @id @default(cuid())
  tournamentId  String      @db.VarChar(128)
  institutionId String
  registeredAt  DateTime    @default(now())
  registeredById String     @db.VarChar(128)
  
  tournament    Tournament  @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  institution   Institution @relation(fields: [institutionId], references: [id], onDelete: Cascade)
  
  @@unique([tournamentId, institutionId])
  @@index([tournamentId])
  @@index([institutionId])
}
```

**Migration:** `20251109102347_add_institution_tournament_registration`

### 2. Validation Helper Functions

**File:** `src/lib/tournament-validation.ts`

Added new helper function:
```typescript
export async function isInstitutionRegisteredForTournament(
  institutionId: string,
  tournamentId: string
): Promise<boolean>
```

### 3. New API Endpoints

#### Institution Registration Endpoint
**File:** `src/app/api/tournaments/[id]/register-institution/route.ts`

- **POST**: Register institution for tournament (coaches only)
- **DELETE**: Unregister institution from tournament (coaches only, requires no teams)

#### Get Registered Institutions
**File:** `src/app/api/tournaments/[id]/institutions/route.ts`

- **GET**: List all institutions registered for a tournament

### 4. Updated Existing Endpoints

#### User Registration Endpoint
**File:** `src/app/api/tournaments/[id]/register/route.ts`

Added validation to check if institution is registered before allowing user registration:
```typescript
const institutionRegistered = await isInstitutionRegisteredForTournament(
  institutionId,
  tournamentId
);

if (!institutionRegistered) {
  return NextResponse.json(
    { error: 'Your institution must be registered for this tournament first' },
    { status: 403 }
  );
}
```

#### Team Creation Endpoint
**File:** `src/app/api/tournaments/[id]/teams/route.ts`

Added validation to check if institution is registered before allowing team creation:
```typescript
const institutionRegistered = await isInstitutionRegisteredForTournament(
  parsed.institutionId,
  tournamentId
);

if (!institutionRegistered) {
  return NextResponse.json(
    { error: 'Institution must be registered for this tournament first' },
    { status: 403 }
  );
}
```

### 5. Documentation

Created/Updated documentation files:

1. **TOURNAMENT_API.md** - Updated with:
   - New "Tournament Registration Flow" section
   - API documentation for institution registration endpoints
   - Updated business rules
   - New data model for TournamentInstitutionRegistration

2. **TOURNAMENT_REGISTRATION_FLOW.md** (NEW) - Comprehensive guide including:
   - Step-by-step registration process
   - Example requests for each step
   - Common errors and solutions
   - Complete flow example
   - Troubleshooting guide

## Registration Flow

The new registration flow enforces this order:

```
1. Coach registers institution for tournament
   ↓
2. Coach registers users (debaters/judges)
   ↓
3. Coach creates teams
   ↓
4. Coach assigns debaters to teams
```

## Key Features

### Institution Registration
- **Who:** Only coaches can register their institution
- **When:** Must be done before any user or team registration
- **What:** Creates a link between institution and tournament
- **Restrictions:** Respects roster freeze rules

### Validation
- All existing endpoints now validate institution registration
- Clear error messages guide users through the correct flow
- Prevents orphaned teams or participations

### Unregistration
- Coaches can unregister their institution
- **Automatic cascading deletion** of all related data:
  - All teams created by the institution
  - All user participations from institution members
  - The institution registration record
- Transaction-based for data consistency
- Returns counts of deleted items

### Visibility
- Anyone can view which institutions are registered for a tournament
- Includes team and member counts for each institution

## API Summary

### New Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/tournaments/{id}/register-institution` | Register institution | Coach |
| DELETE | `/api/tournaments/{id}/register-institution` | Unregister institution | Coach |
| GET | `/api/tournaments/{id}/institutions` | List registered institutions | Authenticated |

### Modified Endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/api/tournaments/{id}/register` | Now requires institution registration |
| POST | `/api/tournaments/{id}/teams` | Now requires institution registration |

## Error Codes

### New Error Responses

- **403 Forbidden**: "Your institution must be registered for this tournament first"
  - Returned when trying to register users without institution registration
  
- **403 Forbidden**: "Institution must be registered for this tournament first"
  - Returned when trying to create teams without institution registration

- **409 Conflict**: "Institution is already registered for this tournament"
  - Returned when trying to register an already-registered institution

### Changed Error Responses

- **400 Bad Request**: "Cannot unregister institution with existing teams" - **REMOVED**
  - This error no longer occurs as unregistration now cascades automatically

## Testing Checklist

To test the implementation:

1. [ ] Create an institution
2. [ ] Become a coach (automatic if you created it)
3. [ ] Try to register users without institution registration (should fail)
4. [ ] Try to create teams without institution registration (should fail)
5. [ ] Register institution for tournament (should succeed)
6. [ ] Register users (should now succeed)
7. [ ] Create teams (should now succeed)
8. [ ] View registered institutions list
9. [ ] Try to register institution again (should fail with 409)
10. [ ] Create a team
11. [ ] Try to unregister institution (should fail while teams exist)
12. [ ] Delete teams
13. [ ] Unregister institution (should succeed)

## Backward Compatibility

### Breaking Changes
⚠️ **This is a breaking change** for existing tournament workflows.

Existing systems that:
- Register users directly without institution registration
- Create teams directly without institution registration

Will now receive **403 Forbidden** errors.

### Migration Path

For existing tournaments with teams/participants:

1. Create `TournamentInstitutionRegistration` records for all institutions that already have teams or participants in tournaments
2. Run a data migration script:

```typescript
// Migration script (not included - run manually if needed)
const existingParticipations = await prisma.tournamentTeam.findMany({
  select: {
    tournamentId: true,
    institutionId: true,
  },
  distinct: ['tournamentId', 'institutionId'],
});

for (const { tournamentId, institutionId } of existingParticipations) {
  await prisma.tournamentInstitutionRegistration.upsert({
    where: {
      tournamentId_institutionId: { tournamentId, institutionId }
    },
    create: {
      tournamentId,
      institutionId,
      registeredById: 'system', // or appropriate user ID
    },
    update: {},
  });
}
```

## Benefits

1. **Better Organization**: Clear hierarchy of registration steps
2. **Data Integrity**: Prevents orphaned teams or participants
3. **Visibility**: Easy to see which institutions are participating
4. **Control**: Tournament admins can see registration status at a glance
5. **Flexibility**: Institutions can unregister if needed (when no teams exist)
6. **Clear Errors**: Users get helpful error messages guiding them through the process

## Future Enhancements

Potential improvements for future iterations:

1. **Registration Limits**: Add maximum number of institutions per tournament
2. **Registration Approval**: Require tournament admin approval for institution registration
3. **Registration Fees**: Track registration fees per institution
4. **Registration Deadlines**: Separate deadline for institution vs. user registration
5. **Waitlist**: Allow institutions to register on a waitlist when tournament is full
6. **Bulk Registration**: Register multiple institutions at once (for tournament admins)

## Files Changed

```
Modified:
- prisma/schema.prisma
- src/lib/tournament-validation.ts
- src/app/api/tournaments/[id]/register/route.ts
- src/app/api/tournaments/[id]/teams/route.ts
- docs/TOURNAMENT_API.md

Created:
- src/app/api/tournaments/[id]/register-institution/route.ts
- src/app/api/tournaments/[id]/institutions/route.ts
- docs/TOURNAMENT_REGISTRATION_FLOW.md
- docs/TOURNAMENT_INSTITUTION_REGISTRATION_SUMMARY.md (this file)

Migrations:
- prisma/migrations/20251109102347_add_institution_tournament_registration/
```

## Support

For questions or issues:
1. Check the [Tournament Registration Flow Guide](./TOURNAMENT_REGISTRATION_FLOW.md)
2. Review the [Tournament API Documentation](./TOURNAMENT_API.md)
3. Check the troubleshooting section in the registration flow guide
