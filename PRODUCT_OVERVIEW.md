# Product Overview

## What Debatera is

Debatera is a product for organizing and running debate tournaments. It combines tournament administration, participant and team flows, judge workflows, ballots, standings, and online debate rooms in one system.

The product is built around a simple idea: tournament operations should not be scattered across unrelated tools. The same system that stores registrations should also know the teams, pairings, judges, ballots, results, and public standings.

## Why Debatera exists

Debate communities often run events through a patchwork of tools:

- spreadsheets for participant tracking
- tabbing software for rounds and results
- chat tools for coordination
- separate call platforms for online debates
- separate timers, forms, or notes for judging

That fragmentation creates three recurring problems:

1. **Operational overhead** — organizers have to move information between tools and keep them in sync.
2. **Weak continuity** — participant, judge, and tournament history gets scattered or lost after the event.
3. **Poor user experience** — debaters and judges have to jump between places to find pairings, ballots, calls, standings, and feedback.

Debatera exists to make the tournament itself the source of truth.

## Why Excel, Tabbycat, and fragmented workflows are not enough

Excel is flexible, but it depends on manual structure and manual discipline. It can track data, but it does not enforce tournament flows, permissions, or consistent state.

Tabbycat and similar tabbing tools are strong at tab logic, but they still leave organizers stitching together the rest of the event experience: communication, links, calls, portal access, participant identity, and long-term profile continuity.

Fragmented workflows also make it harder to answer simple questions over time:

- Which tournaments has this debater played in?
- Which ballots has this judge submitted?
- What results and comments are still attached to a completed tournament?
- Which institution did a participant represent in a given event?

Debatera aims to keep those answers inside one product.

## What makes Debatera different

The key difference is not just feature count. It is the way the product treats accounts, tournaments, and records as connected over time.

### Accounts preserve cross-tournament history

In Debatera, authenticated users are not just temporary names in a single tournament. Their account can remain connected to tournaments they joined, roles they held, teams they were assigned to, and related records captured in the system.

In practice, this means the platform is designed around persistent identity rather than one-off tournament spreadsheets. A debater can accumulate participation history across events. A judge can have a record of assignments and ballots. An organizer can keep tournament data in a system that remains useful after the event ends.

Portal-only judge access still exists for convenience, but the broader product direction is account-based continuity.

## Who Debatera helps

### Organizers

Organizers need a reliable operating system for the tournament. Debatera helps them:

- create and configure tournaments
- control registration windows and public visibility
- approve institution registrations
- manage participants and teams
- create rounds and generate pairings
- assign judges and venues
- publish rounds and collect ballots
- generate judge portal links
- compute results and expose standings

### Judges

Judges need a simple way to see assignments and submit ballots without unnecessary friction. Debatera helps them:

- access ballots from the authenticated app or a token-based judge portal
- submit per-debate ballots with speech scores and votes
- request ballot reopening when a submitted ballot needs correction
- keep a record of judging activity inside the tournament system

### Debaters

Debaters need clarity during the event and continuity after it. Debatera helps them:

- register under an institution
- be assigned to teams
- see their debate assignments
- join online debate rooms when the event is online
- track standings and results
- keep participation history tied to their account

### Institutions

Institutions need structure, not just a list of names. Debatera helps them:

- manage institution membership and roles
- invite members into the institution
- register the institution for tournaments
- register judges and debaters under the institution
- create teams within the tournament
- preserve participation records at the institution level

## Most important user flows

The product is centered around a few core flows:

1. **Organizer creates and configures a tournament**
2. **Institution registers for that tournament and gets approved**
3. **Participants are registered as debaters or judges**
4. **Teams are created and populated**
5. **Organizer creates rounds, generates pairings, and assigns judges**
6. **Judges submit ballots through the app or portal**
7. **Results are computed and standings become visible**

Those flows are described in more detail in [USER_FLOWS.md](./USER_FLOWS.md).

## Current product boundary

Debatera already covers the core tournament loop. Some broader ideas from older product notes, such as advanced AI features or much wider league-style functionality, should be treated as future ideas rather than current product behavior.
