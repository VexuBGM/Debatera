# Online Tournament Readiness Audit

> **Date:** February 16, 2026
>
> **Purpose:** Identify everything that needs to be worked on or implemented before hosting the first online tournament.

---

## Summary

The core tournament loop is functional: create tournament → register institutions → approve → register participants → form teams → create rounds → generate/edit pairings → publish → submit ballots → auto-compute results → view standings.

Online video calls via Stream are wired up. The gaps below range from **critical blockers** to **nice-to-haves**. They are ordered by priority.

---

## CRITICAL — Must fix before the tournament

### 1. No "Join Call" link on My Debates page ✅
- **Where:** `src/app/(main)/(home)/tournaments/[id]/my-debates/page.tsx`
- **Problem:** Debaters and judges see their debate assignments but have **no button to join the video call**. The "Join Call" button only exists inside the round editor's `DebateCard.tsx`, which is the admin pairings view. Participants have no obvious way to enter their debate room.
- **Fix:** Add a "Join Call" link/button on each debate card in the My Debates page that navigates to `/tournaments/[id]/rounds/[roundId]/debates/[debateId]/call`.

### 2. No motion/topic support ✅
- **Where:** `prisma/schema.prisma` (TournamentRound model), round editor UI
- **Problem:** There is no `motion` field on `TournamentRound` and no UI to set or display the debate topic. Debaters won't know what they're debating.
- **Fix:** Add a `motion` (and optionally `infoSlide`) text field to `TournamentRound`. Add input in the round editor for the organizer. Display the motion in the debate call room header and on the My Debates page.

### 3. Debate room shows only video — no context ✅
- **Where:** `src/app/tournaments/[id]/rounds/[roundId]/debates/[dId]/call/DebateCallRoom.tsx`
- **Problem:** The call room only renders the Stream video layout + a small header with tournament/round name. **Missing:** team names and members, judges list, motion/topic, timer, side assignments (Prop/Opp).
- **Fix:** Add a sidebar or header panel showing: debate motion, Proposition team + members, Opposition team + members, judges, and side assignment clearly.

### 4. No debate timer ✅
- **Where:** No timer component exists anywhere in the codebase
- **Problem:** WSDC format has strict speech times (8 min constructive, 4 min reply). Without a timer, participants must use external tools — defeating the purpose of the platform.
- **Fix:** Implement at minimum a **client-side countdown timer** in the debate room with configurable WSDC speech presets (8:00 constructive, 4:00 reply). Nice-to-have: synced timer via Stream custom events or SSE.

### 5. No participant notifications when round is published
- **Where:** `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts` (PATCH handler)
- **Problem:** When an organizer publishes a round, participants are **not notified**. They have no way to know a new round is live unless they manually refresh the app.
- **Fix:** Create a `Notification` record for each participant in the tournament when a round status transitions to `PUBLISHED`. Consider adding notification types like `ROUND_PUBLISHED`.

### 6. Ballot and result locking
- **Where:** `src/lib/ballots/computeResult.ts`, ballot API routes
- **Problem:** After all judges submit and the debate result is computed, there is **no lock mechanism**. A judge could theoretically re-submit and overwrite the result. The `DebateResult` model has no `locked`/`finalized` flag.
- **Fix:** Add a guard in the ballot submit endpoint that prevents re-submission once a `DebateResult` exists (or once the round is `COMPLETED`). Consider adding a `lockedAt` timestamp to `DebateResult`.

---

## HIGH PRIORITY — Should fix for a smooth experience

### 7. Tournament navigation is cumbersome
- **Where:** `src/app/(main)/(home)/tournaments/[id]/TournamentLayoutNavigation.tsx`
- **Problem:** The tournament layout navigation only has a "Back to Dashboard" button. All section links (Rounds, Teams, Standings, etc.) are on the tournament detail page as action buttons. Users have to go back to the detail page every time they want to switch sections.
- **Fix:** Add a tournament sub-navigation bar (tabs or sidebar) in the tournament layout that always shows links to: Overview, Rounds, Teams, My Debates, My Ballots, Standings, Settings.

### 8. Round status can go backwards
- **Where:** `src/lib/tournamentRounds/validation.ts` — `isValidStatusTransition()` always returns `true`
- **Problem:** Any status transition is allowed (e.g., COMPLETED → DRAFT). This could cause chaos if the organizer accidentally reverts a published round.
- **Fix:** Enforce forward-only transitions: `DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED`. Remove the status dropdown that allows arbitrary jumps. Only show the next valid transition button.

### 9. Dashboard is not useful for participants
- **Where:** `src/app/(main)/(home)/page.tsx`
- **Problem:** The home page shows hardcoded zeros for "Upcoming Debates" and "Pending Notifications", an always-empty upcoming tournaments section, and a placeholder activity feed.
- **Fix:** Show the user's actual upcoming debates (debates in PUBLISHED/IN_PROGRESS rounds), unread notification count, and recent tournament activity.

### 10. Clerk webhook doesn't sync users to DB
- **Where:** `src/app/api/webhooks/clerk/route.ts`
- **Problem:** The webhook endpoint logs and acknowledges but **does not create/update User records**. The app relies on `ensureUserInDB()` on each API call instead, which works but means users don't exist in the DB until they make their first authenticated request.
- **Fix:** Implement proper `user.created` / `user.updated` / `user.deleted` event handling in the webhook to keep the `User` table in sync proactively. This is important for invitations — the invited user must exist in the DB.

### 11. No error boundaries or 404 pages
- **Where:** Missing `error.tsx` and `not-found.tsx` files throughout the app
- **Problem:** If a tournament/round/ballot isn't found, the user sees raw text or the default Next.js error page.
- **Fix:** Add `error.tsx` and `not-found.tsx` at least in `src/app/tournaments/[id]/` and `src/app/(main)/`.

---

## MEDIUM PRIORITY — Important for tournament quality

### 12. No participant-facing rounds/pairings view
- **Where:** The published rounds/pairings are visible to non-admins (API allows it), but need to verify the UI clearly shows pairings in read-only mode.
- **Problem:** Non-admin users viewing `/tournaments/[id]/rounds/[roundId]` should see a clean read-only view of the pairings (not the drag-and-drop editor).
- **Check:** Verify the round detail page renders a read-only pairings list for non-admin users.

### 13. No speaker standings / individual awards
- **Where:** `src/lib/domains/reporting/`
- **Problem:** Only team standings are computed (wins, total points). Individual speaker rankings (sum of speech scores across rounds) are not available. This is standard in WSDC tournaments.
- **Fix:** Add a speaker standings computation that aggregates `BallotSpeech.score` per speaker across all rounds.

### 14. No standings visibility control
- **Where:** Standings page is always accessible to anyone associated with the tournament
- **Problem:** In most tournaments, standings are hidden from participants until the organizer does a "tab release." Currently there's no way to control when standings become visible.
- **Fix:** Add a `tabReleased` boolean to `TournamentSettings` (or similar). Only show standings to non-organizers after the tab is released.

### 15. No export functionality
- **Problem:** No way to export standings, ballots, or results as CSV/PDF. Organizers often need this for record-keeping.
- **Fix:** Add at minimum a CSV export button on the standings page.

### 16. Search bar is non-functional
- **Where:** `src/components/Navbar.tsx`
- **Problem:** The search bar in the navbar has UI but no backend search endpoint. Users can type but nothing happens.
- **Fix:** Either implement search (tournaments, institutions, users) or remove the search bar UI to avoid confusion.

---

## LOW PRIORITY — Nice-to-haves for future tournaments

### 17. Judge feedback system
- Judges can currently add `privateNotes` on ballots, but there is no structured per-speaker feedback that debaters can review after the tournament.

### 18. Elimination/break rounds
- All rounds are treated as preliminary rounds. No support for quarterfinals/semifinals/finals bracket logic.

### 19. Advanced pairing algorithms
- Only random shuffle pairing is implemented. No power-matching (pair teams with similar win records) or Swiss-system.

### 20. Judge conflict avoidance in auto-generate
- The generator warns about judge-institution conflicts but does not avoid them. For a fair tournament, judges should not adjudicate debates involving their own institution.

### 21. Multiple tournament admins
- Only the tournament creator can manage the tournament. No support for tab directors, chief adjudicators, or other organizer roles.

### 22. Team communication channel
- No in-app chat or team preparation room for teams to strategize before/during debates.

### 23. POI (Point of Information) system
- No POI tracking or microphone control — a core feature in the product vision.

---

## Environment Checklist

Ensure these are configured in production:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Clerk auth (server) |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook verification |
| `NEXT_PUBLIC_STREAM_API_KEY` | Stream video (client) |
| `STREAM_API_SECRET` | Stream video (server) |

---

## Pre-Tournament Testing Checklist

- [ ] Create a test tournament with event mode = ONLINE
- [ ] Register at least 2 institutions, approve them
- [ ] Register participants (debaters + judges) from each institution
- [ ] Create teams and assign members
- [ ] Create a round and generate pairings
- [ ] Verify Stream video calls are created on round publish
- [ ] Join a debate call from two different accounts — verify video works
- [ ] Submit ballots from all judges in a debate
- [ ] Verify debate result is auto-computed correctly
- [ ] Check standings page shows correct team records
- [ ] Complete a second round and verify cumulative standings
- [ ] Test on mobile devices (responsive layout)
- [ ] Verify page load times are acceptable with real data
- [ ] Test with expected participant count (simulate concurrent users)
