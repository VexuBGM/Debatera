# Onboarding Tour System

The tour system shows first-time tooltips on main pages. It is role-aware, skippable, replayable, and persisted across devices via the DB.

## The One File You Need to Edit

**`src/lib/tours/config.ts`** — all tour step content lives here. Adding, removing, or editing steps requires touching only this file (plus placing `data-tour` attributes on DOM elements).

```typescript
export const TOURS = {
  'my-tour-id': {
    id: 'my-tour-id',
    steps: [
      {
        id: 'step-1',
        title: 'Title shown in the card',
        description: 'Body text explaining this part of the UI.',
        target: 'my-data-tour-value', // matches data-tour="my-data-tour-value" on a DOM element
        position: 'bottom',           // top | bottom | left | right | center
      },
      {
        id: 'step-2',
        title: 'Centered step (no anchor)',
        description: 'Omitting target renders the card in the middle of the screen.',
        // no target → centered fallback
      },
    ],
  },
} satisfies Record<string, TourConfig>;

export type TourId = keyof typeof TOURS;
```

`position` defaults to `'bottom'`. Use `'center'` (or omit `target`) for a modal-style card.

---

## File Map

```
src/lib/tours/
  types.ts           — TourStep, TourConfig, TourStepPosition interfaces
  config.ts          — ALL tour content (the only file to edit for step changes)

src/components/tour/
  TourProvider.tsx   — Context, state machine, element-anchored positioning
  TourTooltip.tsx    — The floating card UI rendered via React portal

src/hooks/
  useTour.ts         — useTour() context hook + useTourTrigger(id) auto-start hook

src/app/api/me/tutorials/
  route.ts           — PATCH (mark seen), DELETE (reset one tour or all tours)
```

---

## How to Add a New Tour

1. **Define steps** — add a new entry to `TOURS` in `src/lib/tours/config.ts`.
2. **Mark DOM elements** — add `data-tour="<value>"` attributes to target elements on the page. Each value must match a step's `target` field.
3. **Trigger on first visit** — call `useTourTrigger('your-tour-id')` inside the page client component. It auto-starts the tour once, after a short paint delay, only if the user hasn't seen it.
4. **Replay support** — do not add page-level replay buttons. Users can open **Help** in the top navigation and choose **Reset all tours**. This clears tour history and lets the current page's `useTourTrigger` restart automatically if that page has a tour.

That's all. No changes to `TourProvider`, `TourTooltip`, or the API route are needed.

---

## How to Remove a Tour

1. Delete the entry from `TOURS` in `config.ts`.
2. Remove the `useTourTrigger(...)` call from the page.
3. Remove `data-tour` attributes from the affected elements.

The tour ID will remain in users' `seenTutorials` DB column harmlessly — it just won't ever be shown again.

---

## How to Edit Steps

Open `src/lib/tours/config.ts` and change the `title`, `description`, `target`, or `position` fields on the relevant step. No other file needs to change unless you're also adding or moving `data-tour` attributes on DOM elements.

---

## Tour IDs (v1)

| ID | Page | Audience |
|---|---|---|
| `dashboard` | `/` | All authenticated users |
| `tournaments-list` | `/tournaments` | All authenticated users |
| `institution-detail-admin` | `/institutions/[id]` | Institution admins |
| `institution-detail-member` | `/institutions/[id]` | Institution members |
| `tournament-overview-organizer` | `/tournaments/[id]` | ORGANIZER role only |
| `tournament-overview-participant` | `/tournaments/[id]` | DEBATER / JUDGE roles |

---

## Persistence

Progress is stored in two places, checked in this order:

1. **localStorage** (`debatera:seen-tours`) — instant, no server round-trip. Checked first on every page load.
2. **DB** (`User.seenTutorials String[]`) — synced when a tour is completed or skipped. Used as fallback (e.g. new device or cleared browser data).

`TourProvider` receives `initialSeenTutorials` from the server layout (`src/app/(main)/(home)/layout.tsx`) which reads `User.seenTutorials` at request time.

API endpoints:
- `PATCH /api/me/tutorials` — body `{ tourId }` — appends to `seenTutorials` (idempotent)
- `DELETE /api/me/tutorials?tourId=xxx` — removes one tour ID from `seenTutorials`
- `DELETE /api/me/tutorials?all=true` — clears `seenTutorials`

---

## Role-Aware Tours

The tournament overview page picks a tour ID based on `userRole` from `useTournament()`:

```typescript
const tourId =
  userRole === 'ORGANIZER'
    ? 'tournament-overview-organizer'
    : 'tournament-overview-participant';
useTourTrigger(tourId);
```

Use the same pattern on any page where the tour content should differ by role.

---

## Tooltip Positioning

`TourProvider` queries `document.querySelector('[data-tour="<value>"]')` and calls `getBoundingClientRect()` to compute the tooltip's `top`/`left`. It clamps to the viewport and re-computes on `window.resize`.

If the target element is not in the DOM (e.g. step targets a navbar button that is hidden on mobile), the tooltip falls back to a centered card — no crash.

A CSS class `tour-ring` (defined in `src/app/globals.css`) is applied to the currently highlighted element and removed when the step changes.

---

## Extending the Tooltip UI

The tooltip card is in `src/components/tour/TourTooltip.tsx`. It receives plain props (`title`, `description`, `stepIndex`, etc.) — no tour-specific logic lives there. To change the visual design (colors, size, animation), edit only `TourTooltip.tsx`.
