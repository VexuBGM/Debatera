# Roles and Permissions

Authorization in Debatera is manual. There is no RBAC library or middleware-level enforcement. Each API route and server action performs its own checks.

---

## Role Hierarchy

```text
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
| Invite a user | Institution ADMIN | `src/actions/invitation.actions.ts` |
| Accept or decline invite | Invited user | `src/actions/invitation.actions.ts` |
| Revoke pending invite | Institution ADMIN | `src/actions/invitation.actions.ts` |
| Remove a member | Institution ADMIN | `src/actions/invitation.actions.ts` |
| Promote member to admin | Institution ADMIN | `src/actions/invitation.actions.ts` |
| Leave institution | Any member, unless they are the last admin | `src/actions/invitation.actions.ts` |
| Delete institution | Institution ADMIN | `src/actions/invitation.actions.ts` |

Last-admin protection is enforced in application logic, not by a DB constraint.

---

## Tournament Permissions

### Creation and Settings

| Action | Who | Where enforced |
|---|---|---|
| Create tournament | Any authenticated user | `src/lib/services/mvp.ts` |
| Update tournament settings | Tournament creator | `src/app/api/tournaments/[id]/settings/route.ts` |
| Update tournament metadata and visibility | Tournament creator | `src/app/api/tournaments/[id]/route.ts` |

### Institution Registrations

| Action | Who | Where enforced |
|---|---|---|
| Submit institution registration request | Institution ADMIN | `src/app/api/tournaments/[id]/institution-registrations/route.ts` |
| Approve or reject institution registration | Tournament creator | `src/app/api/tournaments/[id]/institution-registrations/[id]/route.ts` |

### Participants and Teams

| Action | Who | Where enforced |
|---|---|---|
| Register a participant | Institution ADMIN in an approved institution | `src/app/api/tournaments/[id]/participants/route.ts` |
| Create a team | Institution ADMIN or tournament creator with scope | `src/actions/teams.actions.ts` |
| Add or remove debaters from a team | Institution ADMIN or tournament creator with scope | `src/lib/domains/teams/teamManagementScope.ts` and `src/actions/teams.actions.ts` |

Relevant guards:
- `assertRegistrationOpen()` blocks team and participant changes outside the registration window
- `assertValidTeamSize()` enforces configured team-size bounds

### Rounds and Pairings

| Action | Who | Where enforced |
|---|---|---|
| Create a round | Tournament creator | `src/lib/tournamentRounds/authorization.ts` |
| Generate pairings | Tournament creator | `src/lib/tournamentRounds/authorization.ts` |
| Update round status | Tournament creator | `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts` |
| Save manual pairings | Tournament creator | `src/app/api/tournaments/[id]/rounds/[roundId]/pairings/route.ts` |

### Venues

| Action | Who | Where enforced |
|---|---|---|
| Create, update, or delete a venue | Tournament creator | `src/actions/venues.actions.ts` |
| Auto-allocate venues to a round | Tournament creator | `src/actions/venues.actions.ts` |

Venue actions are additionally blocked for `ONLINE` tournaments.

---

## Ballot Permissions

| Action | Who | Where enforced |
|---|---|---|
| View own ballot details | Assigned judge, once the round is in progress or completed | `src/lib/ballots/authorization.ts` |
| Edit own ballot | Assigned judge while the ballot is editable | `src/lib/ballots/authorization.ts` |
| Submit own ballot | Assigned judge while the ballot is editable | `src/app/api/ballots/[ballotId]/submit/route.ts` |
| View any ballot | Tournament creator | `src/lib/ballots/authorization.ts` |
| Request ballot modification | Assigned judge through the app or portal, subject to state checks | ballot routes plus `src/lib/ballots/modificationRequests.ts` |
| Approve or reject modification request | Tournament creator | ballot modification request routes |

---

## Judge Portal Permissions

The portal is outside Clerk authentication and uses time-limited tokens.

| Action | Who | Where enforced |
|---|---|---|
| Generate a portal link | Tournament creator | portal generation routes |
| Access portal judge context | Valid token holder for that tournament and judge participant | `src/lib/portal/auth.ts` and portal routes |
| Read, save, or submit a portal ballot | Valid token holder scoped to the owning ballot | `src/lib/portal/auth.ts` plus portal ballot routes |

Portal access is scoped to the owning judge and tournament.

---

## Public and Unauthenticated Access

Public tournaments expose read-only data based on `TournamentSettings.publicTabs`.

| Data | Condition |
|---|---|
| Tournament overview | `tournament.isPublic = true` |
| Rounds list | public tournament and `"rounds"` tab enabled |
| Teams | public tournament and `"teams"` tab enabled |
| Standings | public tournament; private tournaments require organizer, participant, or institution-member access |
| Speaker points | Visible unless `hideSpeakerPoints = true` |
| Individual debater names | Visible only if `showDebaterNames = true` |

Visibility logic lives in `src/lib/security/access.ts` and the consuming routes.

---

## Known Gaps

- No DB-level enforcement exists for "a judge can only be in one debate per round."
- Rate limiting is wired into several public and high-risk routes, but the current implementation is in-memory and should be upgraded before multi-instance production use.
- Tournament creator equals organizer. There is no co-organizer or delegated admin model yet.
