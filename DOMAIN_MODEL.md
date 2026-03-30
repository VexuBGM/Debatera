# Domain Model

Debatera has a specific domain: it is not just a generic event platform, but a system for debate tournaments with institution-based participation, adjudication, results, and standings.

This document defines the main concepts in plain language and explains how they connect.

## Tournament

A **Tournament** is the top-level container for an event.

It represents one debate competition and holds its settings, institution registrations, participants, teams, rounds, venues, portal links, and related results.

### Connected concepts

- Tournament Settings
- Tournament Institution registration
- Tournament Participants
- Teams
- Rounds and Debates
- Venues
- Standings

### Important rules

- A tournament has a creator, who acts as organizer in the current model.
- A tournament may be public or private.
- Tournament visibility and public tab access are controlled through settings.

## Tournament Settings

**Tournament Settings** are the configurable operating rules for a tournament.

They define things such as:

- registration window
- team size minimum and maximum
- debate format
- event mode (`ONLINE` or `IRL`)
- pairing system (`SWISS`, `RANDOM`, `MANUAL`)
- standings visibility options
- which tabs are publicly visible

### Important rules

- Team-size rules are enforced when teams are managed.
- Registration windows affect whether participant and institution registration actions can proceed.

## Institution

An **Institution** is a school, club, university, or similar organization that groups users together.

Institutions are important because tournaments often register and organize people under institution identity rather than as unrelated individuals.

### Connected concepts

- Institution Members
- Institution Invitations
- Tournament Institution registration
- Tournament Participants
- Tournament Teams

### Important rules

- Institution membership is persistent across tournaments.
- Institutions have internal roles, including admins and members.

## Institution Invitation

An **Institution Invitation** is the mechanism for bringing a user into an institution.

### Connected concepts

- Institution
- User
- Notification

### Important rules

- Invitations have a lifecycle such as pending, accepted, declined, or revoked.
- Accepting an invitation creates institution membership.

## Tournament Institution registration

A **Tournament Institution** record connects an institution to a specific tournament.

It represents the institution's request to participate in that tournament.

### Connected concepts

- Tournament
- Institution
- Tournament Participants

### Important rules

- Registration is approved or rejected by the organizer.
- Participant registration under an institution depends on that institution being approved for the tournament.

## User

A **User** is the platform identity tied to authentication.

Debatera uses persistent users so tournament participation is connected to an account rather than existing only inside one event.

### Connected concepts

- Institution Membership
- Tournament creation
- Tournament Participants
- Notifications
- Ballot reopen/resolve actions

### Important rules

- Authenticated users are mirrored from Clerk into the app database.
- A user may belong to multiple institutions and multiple tournaments.

## Guest or portal-only participant

Debatera also supports lighter-weight participation paths.

### Guest participants

Guest participant support exists for cases where names are added without full account-based onboarding.

### Portal-only judges

Judges can also access ballots through a token-based portal link without a standard authenticated session.

### Important rules

- Portal access is scoped to the specific participant and tournament token.
- Portal convenience does not replace the broader account-based data model.

## Tournament Participant

A **Tournament Participant** is a user's role inside one specific tournament.

This is where the system records whether someone is participating in that event as a **Debater** or a **Judge**.

### Connected concepts

- Tournament
- User
- Institution
- Team membership
- Judge assignments
- Portal links

### Important rules

- Participant role is tournament-scoped, not global.
- A user can only have one participant record in a given tournament.
- The role is either debater or judge for that tournament record.

## Team

A **Team** is the debating unit that competes in a tournament.

Teams belong to both a tournament and an institution.

### Connected concepts

- Tournament
- Institution
- Team Members
- Debates
- Standings

### Important rules

- Teams are populated with tournament participants who are debaters.
- Team-size limits come from tournament settings.
- A participant cannot belong to more than one team in the same tournament.

## Speaker

A **Speaker** is not a separate top-level account type. In Debatera, speaker participation is represented through a team member taking speech roles inside ballots.

### Connected concepts

- Team membership
- Ballot Speech
- Speaker standings

### Important rules

- Speech scores are attached to ballot speech slots.
- Speaker standings are computed from recorded scoring data.

## Round

A **Round** is one stage of the tournament in which debates are paired and run.

### Connected concepts

- Tournament
- Debates
- Motion and info slide
- Round status

### Important rules

- Rounds move through a lifecycle: `DRAFT` -> `PUBLISHED` -> `IN_PROGRESS` -> `COMPLETED`.
- Draft rounds are the preparation stage for pairings, assignments, and round metadata.

## Debate

A **Debate** is a single matchup inside a round.

It links proposition and opposition teams, assigned judges, optional venue, ballots, result data, and for online events, call-related records.

### Connected concepts

- Round
- Prop team
- Opp team
- Judges
- Ballots
- Debate Result
- Venue
- Video Call
- Debate Stopwatch

### Important rules

- A debate may be a bye when no opponent exists.
- Debate ordering inside a round is stable and stored explicitly.

## Judge

A **Judge** is a tournament participant with the judge role.

Judges become operationally relevant when assigned to a debate.

### Connected concepts

- Tournament Participant
- Tournament Debate Judge assignment
- Ballot
- Judge portal access

### Important rules

- Debate assignments distinguish between **Chair** and **Panelist**.
- Published rounds require proper judge assignment structure before ballots are created.

## Ballot

A **Ballot** is a judge's scoring and decision record for one debate.

It is the central judging artifact in the system.

### Connected concepts

- Debate
- Judge assignment
- Ballot Speech
- Debate Result
- Ballot Modification Request

### Important rules

- Ballots move from `DRAFT` to `SUBMITTED`.
- Submitted ballots drive result computation.
- A submitted ballot can be reopened through the modification request flow.

## Ballot Speech

A **Ballot Speech** is a scored speech slot inside a ballot.

It stores score data and may also contain written comments.

### Connected concepts

- Ballot
- Team member / speaker
- Speaker standings

### Important rules

- Speech roles are fixed by debate format.
- Speech totals contribute to ballot totals and standings calculations.

## Feedback

In the current product, **feedback** is not modeled as a standalone domain entity.

Instead, feedback-related information lives inside ballot data, such as comments on ballot speeches or note fields attached to ballots.

### Important rules

- Feedback exists as part of judging records rather than as a separate feedback module.
- Documentation should not describe a richer standalone feedback system than the code currently supports.

## Debate Result

A **Debate Result** is the computed outcome of a debate once the required ballots have been submitted.

### Connected concepts

- Debate
- Ballots
- Teams
- Standings

### Important rules

- Results are computed from ballots.
- Majority vote decides the winner, with chair-based tie behavior in supported cases.
- Reopening a ballot returns it to draft, but the existing result may remain stale until the corrected ballot is resubmitted and the result is recomputed.

## Standings

**Standings** are computed rankings derived from tournament data rather than manually maintained records.

Debatera supports both team standings and speaker standings.

### Connected concepts

- Debate Results
- Ballot Speeches
- Tournament Settings display options

### Important rules

- Standings depend on completed and computed tournament data.
- Public visibility depends on tournament settings and public tab policy.

## Registration, invite, and join

Debatera has several related but different entry concepts:

- **Institution invitation** — a user is invited into an institution
- **Tournament institution registration** — an institution requests participation in a tournament
- **Tournament participant registration** — a person is added to that tournament as a debater or judge
- **Judge portal join** — a judge accesses assignments through a token link

These should not be collapsed into one generic “join” concept because they solve different domain problems.

## Video Call

A **Video Call** record represents an online debate room for tournaments that run in online mode.

### Connected concepts

- Debate
- Tournament event mode
- Stream integration

### Important rules

- Video calls are relevant only for online tournaments.
- Call creation and access are tied to debate eligibility.

## Debate Stopwatch

A **Debate Stopwatch** stores shared timer state for a debate.

### Connected concepts

- Debate
- Video Call / online debate experience

### Important rules

- Timer state is synchronized for the debate context rather than being a purely local UI timer.

## Notification

A **Notification** is an in-app message tied to a user.

### Connected concepts

- User
- Institution invitations
- other product events

### Important rules

- Notifications are currently delivered through polling rather than a push channel.

## Practical summary

The core domain chain in Debatera is:

**Institution -> Tournament registration -> Participant registration -> Team formation -> Round -> Debate -> Ballot -> Result -> Standings**

That chain is what makes the product more than a generic event app. The domain model is built around the operational reality of debate tournaments.
