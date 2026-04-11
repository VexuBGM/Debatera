# Onboarding Tour System

The tour system shows first-time contextual tooltips on main pages to help new users understand the app. Tours are role-aware (organizer vs. participant), skippable, replayable, and persisted across devices via the database.

---

## The One File to Edit for Step Content

**`src/lib/tours/config.ts`**

All tour step content — titles, descriptions, target elements, and positioning — lives here. Adding, removing, or rewriting steps requires touching only this file (plus placing `data-tour` attributes on the relevant DOM elements).

```typescript
export const TOURS = {
  'my-tour-id': {
    id: 'my-tour-id',
    steps: [
      {
        id: 'step-1',                        // unique within this tour
        title: 'Card heading',
        description: 'Explanation shown in the tooltip body.',
        target: 'my-element',                // matches data-tour="my-element" in the DOM
        position: 'bottom',                  // top | bottom | left | right | center
      },
      {
        id: 'step-2',
        title: 'Centered step',
        description: 'No target = card appears centered on screen.',
        // omit target → centered fallback
      },
    ],
  },
} satisfies Record<string, TourConfig>;

export type TourId = keyof typeof TOURS;
```

`position` defaults to `'bottom'`. Steps without a `target` always render centered regardless of `position`.

---

## File Map

```
src/lib/tours/
  types.ts                  — TourStep, TourConfig, TourStepPosition interfaces
  config.ts                 — ALL tour content (single maintenance point)

src/components/tour/
  TourProvider.tsx           — React context, state machine, element-anchored positioning
  TourTooltip.tsx            — Floating card UI, rendered via React portal into document.body

src/hooks/
  useTour.ts                 — useTour() context accessor + useTourTrigger(id) auto-start hook

src/app/api/me/tutorials/
  route.ts                   — PATCH (mark seen), DELETE (reset a tour ID)
```

---

## Tour IDs (v1)

| Tour ID | Page | Audience |
|---|---|---|
| `dashboard` | `/` | All authenticated users |
| `tournaments-list` | `/tournaments` | All authenticated users |
| `tournament-overview-organizer` | `/tournaments/[id]` | ORGANIZER role only |
| `tournament-overview-participant` | `/tournaments/[id]` | DEBATER / JUDGE roles |

---

## How to Add a Tour to a New Page

### 1. Define the steps

Add an entry to `TOURS` in `src/lib/tours/config.ts`:

```typescript
'my-new-tour': {
  id: 'my-new-tour',
  steps: [
    {
      id: 'intro',
      title: 'Welcome',
      description: 'This page lets you ...',
      position: 'center',
    },
    {
      id: 'the-button',
      title: 'The Important Button',
      description: 'Click here to ...',
      target: 'my-button',
      position: 'bottom',
    },
  ],
},
```

### 2. Mark target elements

Add `data-tour` attributes to the elements the steps should anchor to:

```tsx
<button data-tour="my-button">Do the thing</button>
```

One `data-tour` attribute per unique target value. Each value must match a step's `target` field exactly.

### 3. Trigger the tour on first visit

In the page client component, call `useTourTrigger`. It fires once per user after a short paint delay, only if the tour hasn't been seen:

```tsx
'use client';
import { useTourTrigger } from '@/hooks/useTour';

export default function MyPage() {
  useTourTrigger('my-new-tour');
  // ...
}
```

If the page is a **Server Component**, create a thin client wrapper component alongside it (see `src/app/(main)/(home)/tournaments/_TournamentListTour.tsx` for the pattern).

### 4. Add a replay button (optional but recommended)

```tsx
const { resetTour, startTour } = useTour();

<button
  onClick={() => { resetTour('my-new-tour'); startTour('my-new-tour'); }}
  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
>
  Replay tour
</button>
```

---

## How to Edit Steps

Open `src/lib/tours/config.ts` and update the `title`, `description`, `target`, or `position` on the relevant step. No other file needs to change unless you are also adding or relocating `data-tour` attributes in the DOM.

---

## How to Remove a Tour

1. Delete the entry from `TOURS` in `src/lib/tours/config.ts`.
2. Remove the `useTourTrigger(...)` call and any replay button from the page.
3. Remove `data-tour` attributes from the affected elements.

Existing `seenTutorials` values in the DB that reference the deleted ID are harmless — the ID will simply never be shown again.

---

## How Role-Aware Tours Work

On the tournament overview page, the tour ID is derived from `userRole`:

```typescript
const { userRole } = useTournament();

const tourId =
  userRole === 'ORGANIZER'
    ? 'tournament-overview-organizer'
    : 'tournament-overview-participant';

useTourTrigger(tourId);
```

Use the same pattern on any page where step content should differ by role. Define a separate tour config entry for each role variant.

---

## Persistence

Progress is stored in two places and checked in this order on every page load:

1. **`localStorage`** (`debatera:seen-tours`) — checked first; no network round-trip.
2. **`User.seenTutorials` (DB)** — populated from the server at layout render time; used as fallback when localStorage is empty (new device, cleared browser data).

`TourProvider` receives `initialSeenTutorials: string[]` as a prop from `AppShell`, which receives it from the `(home)` layout. The layout queries `User.seenTutorials` from Prisma at request time.

When a tour is completed or skipped:
1. The tour ID is appended to `localStorage` immediately (no latency).
2. `PATCH /api/me/tutorials` is called fire-and-forget to sync to the DB.

### API endpoints

| Method | Path | Body / Query | Effect |
|---|---|---|---|
| `PATCH` | `/api/me/tutorials` | `{ tourId: string }` | Appends `tourId` to `User.seenTutorials` (idempotent) |
| `DELETE` | `/api/me/tutorials?tourId=xxx` | — | Removes `tourId` from `User.seenTutorials` |

Both require an authenticated Clerk session. Return `{ ok: true }` on success.

### DB field

```prisma
model User {
  // ...
  seenTutorials String[] @default([])
}
```

Migration: `prisma/migrations/20260411000000_add_seen_tutorials/migration.sql`

---

## Tooltip Positioning

`TourProvider` finds each step's target with:

```typescript
document.querySelector(`[data-tour="${step.target}"]`)
```

It then calls `getBoundingClientRect()` and computes `top`/`left` for the tooltip based on the step's `position` value, clamping the result to the viewport. Position is recomputed on `window.resize`.

**Fallback:** if the target element is not in the DOM (e.g. a navbar button hidden on mobile), the tooltip renders centered on screen. No error is thrown.

**Highlight ring:** the CSS class `tour-ring` (defined in `src/app/globals.css`) is applied to the currently targeted element and removed when the step advances.

---

## Changing the Visual Design

All tooltip markup and styling lives in `src/components/tour/TourTooltip.tsx`. It receives plain props (`title`, `description`, `stepIndex`, `totalSteps`, `position`, etc.) and has no tour-specific logic. To change colors, width, animation, or button layout — edit only `TourTooltip.tsx`.

`TourProvider.tsx` handles all state and positioning; `TourTooltip.tsx` handles only rendering. Keep them separate.
