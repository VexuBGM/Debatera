# Features

This document lists the major Debatera capabilities by module. Status values are:

- **Implemented** — present in the current codebase and part of the active product flow
- **Partial** — present in a meaningful way but still limited in scope, UX, or completeness
- **Planned** — idea exists in product notes, but should not be treated as active functionality

## Authentication and identity

### Clerk-backed user accounts

- **What it does:** Authenticates users and keeps a local app user record synchronized with Clerk identity.
- **Who uses it:** Organizers, debaters, judges, institution members.
- **Why it exists:** The platform needs persistent user identity across tournaments and institutions.
- **Status:** Implemented.

### Persistent profiles

- **What it does:** Stores profile fields such as display name, bio, pronouns, and public email preferences.
- **Who uses it:** Authenticated users.
- **Why it exists:** Tournament participation is tied to real user identity instead of one-off records.
- **Status:** Implemented.

## Roles and access

### Tournament organizer access

- **What it does:** Gives the tournament creator control over settings, rounds, registrations, participants, portal links, and results.
- **Who uses it:** Tournament organizers.
- **Why it exists:** A tournament needs a clear administrative owner.
- **Status:** Implemented.

### Institution roles

- **What it does:** Supports institution admins and members, with admin-only management actions.
- **Who uses it:** Institutions.
- **Why it exists:** Institutions need their own authority structure separate from tournament administration.
- **Status:** Implemented.

### Token-based judge portal access

- **What it does:** Lets judges access assignments and ballots through secure portal links without requiring a Clerk account.
- **Who uses it:** Judges, especially external adjudicators.
- **Why it exists:** Organizers often work with judges who should not need full platform onboarding.
- **Status:** Implemented.

## Tournament setup and visibility

### Tournament creation

- **What it does:** Creates a tournament with initial settings and organizer ownership.
- **Who uses it:** Organizers.
- **Why it exists:** This is the entry point for every tournament workflow.
- **Status:** Implemented.

### Tournament settings

- **What it does:** Configures registration windows, team size limits, event mode, pairing system, visibility, and standings-related display options.
- **Who uses it:** Organizers.
- **Why it exists:** Different tournaments need different operating rules and visibility settings.
- **Status:** Implemented.

### Public and private visibility controls

- **What it does:** Controls whether a tournament is public and which tabs can be visible to unauthenticated viewers.
- **Who uses it:** Organizers, spectators.
- **Why it exists:** Some tournaments need public standings and visibility, while others need tighter control.
- **Status:** Implemented.

## Institutions, invitations, and join flows

### Institution management

- **What it does:** Creates institutions and manages their metadata and visibility.
- **Who uses it:** Institution admins.
- **Why it exists:** Schools, clubs, and universities often participate as groups rather than isolated individuals.
- **Status:** Implemented.

### Institution invitations

- **What it does:** Invites users into institutions and lets them accept or decline.
- **Who uses it:** Institution admins and invited members.
- **Why it exists:** Membership needs a controlled join flow.
- **Status:** Implemented.

### Tournament institution registration

- **What it does:** Lets an institution request access to a tournament, then lets the organizer approve or reject that request.
- **Who uses it:** Institution admins and organizers.
- **Why it exists:** Tournament registration happens at institution level before participant-level entry.
- **Status:** Implemented.

## Participants and teams

### Tournament participant registration

- **What it does:** Registers users in a tournament as either debaters or judges.
- **Who uses it:** Institution admins and organizers.
- **Why it exists:** Tournament role assignment must be explicit and scoped to a specific event.
- **Status:** Implemented.

### Guest participant support

- **What it does:** Supports guest-name based participant flows for cases where full user accounts are not used.
- **Who uses it:** Organizers and institutions.
- **Why it exists:** Some tournaments need operational flexibility for participants outside normal account flows.
- **Status:** Implemented.

### Team creation and team membership

- **What it does:** Creates tournament teams and assigns registered debaters to them.
- **Who uses it:** Institution admins and organizers.
- **Why it exists:** Debate tournaments operate on teams, not just individual participants.
- **Status:** Implemented.

### Team-size enforcement

- **What it does:** Enforces minimum and maximum team size based on tournament settings.
- **Who uses it:** Organizers and institution admins indirectly through team management.
- **Why it exists:** The tournament format needs consistent roster rules.
- **Status:** Implemented.

## Rounds, pairings, and assignments

### Round lifecycle management

- **What it does:** Creates rounds and moves them through draft, published, in-progress, and completed states.
- **Who uses it:** Organizers.
- **Why it exists:** Tournament operations need a clear round lifecycle.
- **Status:** Implemented.

### Pairing generation

- **What it does:** Supports Swiss, random, and manual pairing workflows.
- **Who uses it:** Organizers.
- **Why it exists:** Pairings are central to running competitive rounds.
- **Status:** Implemented.

### Conflict-aware pairing and assignment checks

- **What it does:** Avoids or flags same-institution conflicts and judge-assignment conflicts where possible.
- **Who uses it:** Organizers.
- **Why it exists:** Debate tournaments need fairness and basic conflict protection.
- **Status:** Implemented.

### Judge assignment

- **What it does:** Assigns judges to debates as chair or panelist.
- **Who uses it:** Organizers, judges.
- **Why it exists:** Debate results and ballot flow depend on explicit adjudicator assignments.
- **Status:** Implemented.

### Venue assignment for IRL tournaments

- **What it does:** Stores venues and supports automatic venue allocation for in-person events.
- **Who uses it:** Organizers.
- **Why it exists:** IRL tournaments need room logistics in the same system as pairings.
- **Status:** Implemented.

## Ballots, judging, and results

### Ballot drafting and submission

- **What it does:** Lets judges score speeches, choose a winning side, save drafts, and submit ballots.
- **Who uses it:** Judges.
- **Why it exists:** Tournament results need structured judging input.
- **Status:** Implemented.

### Ballot result computation

- **What it does:** Computes debate results once the required ballots are submitted.
- **Who uses it:** Organizers, judges, debaters.
- **Why it exists:** Results should be derived from ballots rather than entered manually after the fact.
- **Status:** Implemented.

### Ballot modification requests

- **What it does:** Lets judges request reopening of submitted ballots and lets organizers resolve those requests.
- **Who uses it:** Judges and organizers.
- **Why it exists:** Ballot submission needs a correction path without bypassing organizer control.
- **Status:** Implemented.

### Written feedback on ballots

- **What it does:** Supports comment and note fields within ballots and ballot speeches.
- **Who uses it:** Judges, organizers, and indirectly debaters where surfaced.
- **Why it exists:** Debate events often need written comments in addition to scores and votes.
- **Status:** Partial.

## Standings and reporting

### Team standings

- **What it does:** Computes and displays team standings based on completed results.
- **Who uses it:** Organizers, debaters, spectators.
- **Why it exists:** Tournament progress needs a visible competitive ranking.
- **Status:** Implemented.

### Speaker standings

- **What it does:** Computes and displays speaker standings with options such as hiding points or limiting the leaderboard.
- **Who uses it:** Organizers, debaters, spectators.
- **Why it exists:** Individual speaker performance is part of debate tournament reporting.
- **Status:** Implemented.

## Debate experience

### Online debate rooms

- **What it does:** Creates and serves Stream-based video rooms for online debates.
- **Who uses it:** Debaters, judges, organizers.
- **Why it exists:** Online tournaments should not require a separate call platform.
- **Status:** Implemented.

### Shared debate stopwatch

- **What it does:** Keeps synchronized stopwatch state for debate rooms.
- **Who uses it:** Debaters and judges.
- **Why it exists:** Timing is part of the debate experience and should be consistent for everyone in the room.
- **Status:** Implemented.

## Notifications

### In-app notifications

- **What it does:** Shows notifications such as institution invitations and related product events.
- **Who uses it:** Authenticated users.
- **Why it exists:** Membership and tournament actions need lightweight in-app awareness.
- **Status:** Implemented.

### Real-time notification delivery

- **What it does:** Notification updates are currently polled by the client rather than pushed over a live channel.
- **Who uses it:** Authenticated users.
- **Why it exists:** It provides a simpler MVP notification mechanism.
- **Status:** Partial.

## Ideas present in older product notes but not current product behavior

These should not be treated as active features today:

- AI debate opponents
- league or Elo-style competitive ladder
- advanced POI-specific interaction tooling
- team-private live communication features
- broader travel and accommodation logistics
- CSV or screenshot import flows as a current supported workflow

Status for all items above: **Planned**.
