# Architecture

This document explains how Debatera is built at a high level. It is meant to help a developer, reviewer, or agent understand the structure of the system without going into every low-level implementation detail.

## System shape

Debatera is a Next.js monolith. It does not have a separate backend service. The frontend, server-rendered application logic, API routes, and database access all live in the same repository.

At a high level, the system looks like this:

```text
Browser
  -> Next.js application
     -> App pages and components
     -> API routes and server actions
        -> domain libraries
           -> Prisma
              -> PostgreSQL

External services:
  - Clerk for authentication
  - Stream for online debate video rooms
  - Svix for webhook verification
```

## Tech stack

| Area            | Technology                          |
| --------------- | ----------------------------------- |
| Framework       | Next.js 16 with App Router          |
| UI              | React 19                            |
| Language        | TypeScript 5                        |
| Styling         | Tailwind CSS 4, shadcn/ui, Radix UI |
| Database access | Prisma 7 with native `pg` adapter   |
| Database        | PostgreSQL                          |
| Authentication  | Clerk                               |
| Video           | Stream                              |
| Validation      | Zod                                 |
| Testing         | Vitest                              |

## Main application surfaces

### 1. Authenticated app shell

Most product functionality lives in the authenticated application under the main app routes. This is where organizers, institution admins, debaters, and signed-in judges manage tournaments, institutions, teams, rounds, ballots, and standings.

### 2. Judge portal

Debatera also has a separate token-gated portal for judges. This is intentionally distinct from the main authenticated app. It lets a judge open assignments and submit ballots without going through a normal Clerk sign-in flow.

### 3. API routes

The main backend behavior is exposed through Next.js API routes. These routes handle request validation, authorization, database writes, and JSON responses.

### 4. Server actions

The codebase also contains server actions for some mutations. They are still part of the working product, but the architecture guidance in the repository prefers API routes for newer mutation work.

## Main modules

### `src/app/`

This contains route groups, pages, layouts, and API routes.

Important partitions include:

- authenticated app routes
- portal routes for token-based judge access
- API routes for tournaments, ballots, portal actions, notifications, stream access, and debate stopwatch state

### `src/components/`

This contains reusable UI primitives and domain-facing UI pieces such as tournament navigation, ballot interfaces, and debate room components.

### `src/lib/`

This is the main business-logic layer of the application. It includes:

- ballot logic
- debate queries
- domain reporting and standings logic
- tournament guards
- portal token handling and encryption
- pairing logic
- stream integration
- venue allocation
- validations
- higher-level services

### `src/actions/`

This contains server actions used by some parts of the product, including institutions, participants, teams, profiles, and venues.

### `prisma/`

This contains the database schema and migration history. The Prisma schema is the source of truth for persistent domain structure.

## How the parts communicate

## Page and read flows

For server-rendered pages, the app can read directly from Prisma-backed server logic. The application does not need a separate remote backend call for its own server-side reads.

## Mutation flows

For mutations, the common pattern is:

1. client submits data
2. API route or server action validates it
3. authorization is checked
4. domain logic runs
5. Prisma writes to PostgreSQL
6. the UI is refreshed or revalidated

## Portal flows

Portal routes use token-based authentication logic instead of Clerk session checks. This is an important architectural boundary because the judge portal is intentionally designed for low-friction access.

## Where data lives

### PostgreSQL

The main source of application data is PostgreSQL. It stores users, institutions, tournaments, rounds, debates, participants, teams, ballots, results, access links, stopwatch state, and notifications.

### Clerk

Clerk is the authentication provider. Debatera keeps a local user mirror so product data can consistently reference internal user records.

### Stream

Stream is used for online debate rooms. Debatera controls eligibility and call setup, while Stream provides the underlying video infrastructure.

## Core design decisions

### One repository, one application boundary

Debatera is intentionally built as one application rather than separate frontend and backend services. That keeps domain logic, route handling, and UI flows close together.

### Server-side business rules

Business rules live on the server side. UI components may reflect those rules, but they are not the source of truth for registration windows, permissions, ballot state, standings logic, or pairing constraints.

### Product-specific domain modules

Important tournament behavior is not buried only inside pages. It is separated into reusable libraries for ballots, standings, portal access, pairings, guards, and debate operations. That makes the system easier to reason about than if all logic lived inside route handlers.

### Dual access model for judges

Judges can work through either the normal authenticated app or a token-based portal. This is a deliberate product and architecture decision because external judges are common in debate tournaments.

### Computed results and standings

Results and standings are derived from stored ballot and debate data instead of being maintained as disconnected manual records.

### Polling-based notifications

In-app notifications currently use polling rather than a real-time push channel. That keeps the architecture simpler while still providing lightweight event awareness.

## Important constraints

- Prisma access is centralized through the app's Prisma setup rather than ad hoc client creation across the codebase.
- API routes run on the Node.js runtime because of the Prisma `pg` adapter requirement.
- New mutation work is expected to prefer API routes over adding more server-action-first patterns.
- Online debate functionality is only relevant for tournaments configured for online mode.

## What this architecture is optimized for

Debatera is optimized for shipping a coherent tournament product quickly while keeping the core domain model centralized. It favors a pragmatic monolith with strong domain boundaries over a more distributed system.

That makes sense for this project because the hardest part is not infrastructure scale in isolation. It is keeping tournament rules, roles, pairings, judging, and results consistent across the product.
