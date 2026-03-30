# User Flows

This document describes how Debatera is used in practice today. It focuses on the current product flow rather than older roadmap ideas.

## 1. Organizer creates a tournament

1. An authenticated user creates a new tournament.
2. The system creates the tournament and its settings record.
3. The creator becomes the organizer for that tournament.
4. The organizer configures the event mode, pairing system, registration window, visibility, and team-size rules.

**Why this flow matters:** Every tournament starts with one accountable organizer and one consistent ruleset.

## 2. Institution joins a tournament

1. An institution admin opens a tournament.
2. The institution submits a tournament registration request.
3. The organizer reviews the request.
4. The organizer approves or rejects the institution.
5. Only approved institutions can continue with participant registration under that institution.

**Why this flow matters:** Debatera treats institution approval as a distinct step before participant registration.

## 3. Institution manages members

1. An institution admin creates or manages an institution.
2. The admin invites users to join the institution.
3. Invited users receive an in-app notification.
4. They accept or decline the invitation.
5. Accepted users become institution members and can later be registered into tournaments by the institution admin.

**Why this flow matters:** Institution membership is persistent and reusable across tournaments.

## 4. Organizer or institution registers participants

1. After institution approval, eligible users are registered into the tournament.
2. Each participant is added with a tournament role: **Debater** or **Judge**.
3. Registration is constrained by the tournament's registration window.
4. A participant can only hold one tournament participant record in that event.

**Why this flow matters:** Tournament participation is explicit and role-based, not inferred from institution membership alone.

## 5. Teams are created and filled

1. An organizer or institution admin creates a team inside the tournament.
2. Registered debaters are assigned to that team.
3. Team-size rules are enforced using the tournament settings.
4. A participant cannot belong to multiple teams in the same tournament.

**Why this flow matters:** Team composition is part of the tournament state and directly affects pairings, ballots, and standings.

## 6. Organizer creates and prepares a round

1. The organizer creates a round in **Draft** status.
2. The organizer sets the round name, motion, and optional info slide.
3. The organizer generates pairings using the configured pairing system or prepares them manually.
4. The organizer assigns judges to debates.
5. For IRL tournaments, the organizer may also assign or auto-allocate venues.

**Why this flow matters:** Draft status lets the organizer prepare the operational state of the round before exposing it.

## 7. Organizer publishes and runs the round

1. The organizer publishes the round.
2. Ballots are created for the assigned judges.
3. Participants can see their pairings.
4. For online events, debate room access becomes available through the call flow.
5. The organizer moves the round into **In Progress** and later to **Completed**.

**Why this flow matters:** Round publication is the handoff from setup to live tournament execution.

## 8. Debater joins a debate

### Online tournament flow

1. A debater opens their assigned debate from the tournament experience.
2. The system checks whether that user is eligible to join the debate room.
3. The app ensures the Stream call exists and generates the required access token.
4. The debater joins the online debate room and can use the shared stopwatch.

### IRL tournament flow

1. A debater opens their assignment.
2. The debate entry shows the relevant debate and venue information.
3. The debate itself happens in the assigned physical room rather than in the built-in video room.

**Why this flow matters:** Debatera supports both online and IRL tournament operation without treating them as separate products.

## 9. Judge opens ballots and submits a decision

### Authenticated judge flow

1. A judge opens their ballot from the authenticated app.
2. They enter speech scores and choose the winning side.
3. They may save progress while the ballot remains in draft state.
4. They submit the ballot once it is complete.

### Judge portal flow

1. The organizer generates a portal link for the judge.
2. The judge opens the token-based portal link.
3. The portal authenticates the token and loads that judge's assignments.
4. The judge opens the ballot and submits it without needing a full account-based session.

**Why this flow matters:** Debatera supports both account-based and low-friction portal judging.

## 10. Judge requests a ballot correction

1. A judge notices that a submitted ballot needs a correction.
2. The judge creates a ballot modification request.
3. The organizer reviews the request.
4. If approved, the ballot is reopened and can be edited again.
5. The judge resubmits the corrected ballot.
6. The result for that debate is recomputed from the updated ballots after resubmission.

**Why this flow matters:** Correction is possible without removing organizer control over official results.

## 11. Standings become available

1. Once ballots are submitted and results exist, the tournament standings can be computed.
2. Team standings and speaker standings are derived from completed tournament data.
3. Public visibility depends on tournament settings and tab visibility rules.

**Why this flow matters:** Standings are a computed output of the tournament workflow, not a manually maintained side document.

## 12. Accounts keep tournament history

1. A user participates in one or more tournaments under their account.
2. Their tournament records remain associated with that identity.
3. Over time, the platform can preserve a connected record of institutions, tournament roles, debate participation, ballots, results, and related feedback data that exists in the system.

**Why this flow matters:** Debatera is designed for continuity across events, not just one-off tournament administration.

## Flows that should not be assumed as current behavior

The current codebase does **not** justify documenting the following as active standard flows:

- CSV import workflows
- screenshot import workflows
- AI opponent flows
- advanced POI interaction flows
- full-featured team-private communication during debates

These may exist as product ideas elsewhere, but they are not part of the current documented product flow.
