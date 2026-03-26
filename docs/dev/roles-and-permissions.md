# Roles and Permissions

Authorization in Debatera is manual — there is no RBAC library or middleware-level enforcement. Each API route and server action performs its own checks. This document maps who can do what and where the check lives in the code.

---

## Role Hierarchy

```
Platform:    authenticated user
Institution: MEMBER < ADMIN
Debate:      SPECTATOR < PANELIST (JUDGE) < CHAIR (JUDGE) < DEBATER
```

There is no platform-level admin role. "Admin" always refers to an institution or tournament context.

---

## Institution Permissions

| Action | Who | Where enforced |
|---|---|---|
| Create institution | Any authenticated user | `src/lib/services/mvp.ts` |
| View institution members | Institution MEMBER or ADMIN | `src/app/api/institutions/[id]/members/route.ts` |
| Invite a user | Institution ADMIN | `src/actions/invitation.actions.ts` → `createInstitutionInvitation()` |
| Accept/decline invite | Invited user | `src/actions/invitation.actions.ts` → `acceptInstitutionInvite()` / `declineInstitutionInvite()` |
| Revoke pending invite | Institution ADMIN | `src/actions/invitation.actions.ts` → `revokeInstitutionInvite()` |
| Remove a member | Institution ADMIN | `src/actions/invitation.actions.ts` → `removeMember()` |
| Promote member to admin | Institution ADMIN | `src/actions/invitation.actions.ts` → `promoteMemberToAdmin()` |
| Leave institution | Any member (not last admin) | `src/actions/invitation.actions.ts` → `leaveInstitution()` |
| Delete institution | Institution ADMIN (confirmed) | `src/actions/invitation.actions.ts` → `deleteInstitution()` |

**Last-admin protection:** `leaveInstitution()` and `removeMember()` both check that the institution will still have at least one admin after the operation. The check is done in application logic, not a DB constraint.

---

## Tournament Permissions

### Creation & Settings

| Action | Who | Where enforced |
|---|---|---|
| Create tournament | Any authenticated user | `src/lib/services/mvp.ts` → `createTournament()` |
| Update tournament settings | Tournament creator | `src/app/api/tournaments/[id]/settings/route.ts` |
| Update tournament (name, visibility) | Tournament creator | `src/app/api/tournaments/[id]/route.ts` |

### Institution Registrations

| Action | Who | Where enforced |
|---|---|---|
| Submit institution registration request | Any authenticated institution ADMIN | `src/app/api/tournaments/[id]/institution-registrations/route.ts` |
| Approve / reject institution registration | Tournament creator | `src/app/api/tournaments/[id]/institution-registrations/[id]/route.ts` |

### Participants & Teams

| Action | Who | Where enforced |
|---|---|---|
| Register a participant (debater/judge) | Institution ADMIN in an approved institution | `src/app/api/tournaments/[id]/participants/route.ts` |
| Create a team | Institution ADMIN | `src/actions/teams.actions.ts` → `createTeam()` |
| Add/remove debaters from a team | Institution ADMIN or tournament creator | `src/lib/domains/teams/teamManagementScope.ts` |

**Guard:** `assertRegistrationOpen()` is called before participant/team operations. Throws `'REGISTRATION_CLOSED'` if the registration window has ended. Lives in `src/lib/guards/tournamentSettingsGuards.ts`.

### Rounds & Pairings

| Action | Who | Where enforced |
|---|---|---|
| Create a round | Tournament creator | `src/lib/tournamentRounds/authorization.ts` → `assertIsAdmin()` |
| Generate pairings | Tournament creator | `src/lib/tournamentRounds/authorization.ts` |
| Publish / update round status | Tournament creator | `src/lib/tournamentRounds/authorization.ts` |
| Assign judges to debates | Tournament creator | `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts` |

### Venues

| Action | Who | Where enforced |
|---|---|---|
| Create / update / delete venue | Tournament creator | `src/actions/venues.actions.ts` |
| Auto-allocate debates to venues | Tournament creator | `src/actions/venues.actions.ts` |

---

## Ballot Permissions

| Action | Who | Where enforced |
|---|---|---|
| View own ballot (DRAFT) | Assigned judge | `src/lib/ballots/authorization.ts` |
| Edit own ballot | Assigned judge (ballot DRAFT) | `src/lib/ballots/authorization.ts` |
| Submit own ballot | Assigned judge (ballot DRAFT) | `src/app/api/ballots/[id]/submit/route.ts` |
| View submitted ballot | Assigned judge or tournament creator | `src/lib/ballots/authorization.ts` |
| Request ballot modification | Any tournament participant | `src/app/api/ballots/[id]/modification-request/route.ts` |
| Approve/reject modification request | Tournament creator | `src/app/api/tournaments/[id]/ballot-modification-requests/[id]/route.ts` |
| Reopen ballot (after approval) | Tournament creator | Applied in modification request resolution flow |

---

## Judge Portal Permissions

The portal (`src/app/(portal)/`) is **outside Clerk authentication**. Access is granted by a time-limited token embedded in the URL.

| Action | Who | Where enforced |
|---|---|---|
| Generate a portal link for a participant | Tournament creator | `src/app/api/tournaments/[id]/portal/generate-link/route.ts` |
| Generate all portal links | Tournament creator | `src/app/api/tournaments/[id]/portal/generate-all-links/route.ts` |
| Access portal and view ballots | Token holder (within TTL, not revoked) | `src/lib/portal/auth.ts` |
| Submit ballot via portal | Token holder, assigned to that ballot | `src/app/api/tournaments/[id]/portal/ballots/[id]/submit/route.ts` |

Token TTL defaults to 14 days. Tokens can be revoked by setting `revokedAt` in `TournamentParticipantAccessLink`.

---

## Public / Unauthenticated Access

Public tournaments expose read-only data based on `TournamentSettings.publicTabs`. Default public tabs: `overview`, `rounds`, `teams`, `standings`.

| Data | Condition |
|---|---|
| Tournament overview | `tournament.isPublic = true` |
| Rounds list | `tournament.isPublic` + `"rounds"` in `publicTabs` |
| Teams | `tournament.isPublic` + `"teams"` in `publicTabs` |
| Standings | `tournament.isPublic` + `"standings"` in `publicTabs` |
| Speaker points | Visible unless `hideSpeakerPoints = true` |
| Individual debater names | Visible only if `showDebaterNames = true` |

Visibility logic lives in `src/lib/domains/reporting/policy.ts` (`canViewTournamentStandings()`).

---

## Where Checks Are Missing / Gaps

- **No DB-level enforcement** on round-to-judge uniqueness. The constraint "a judge can only be in one debate per round" is documented in the schema comment but enforced only at application layer.
- **Rate limiting** is implemented in `src/lib/security/rateLimit.ts` but is **not currently wired** into any route.
- **Tournament creator = organizer.** There is currently no concept of co-organizers or delegating admin rights to another user for a tournament.
