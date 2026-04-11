# Debatera Master Plan

> **Created:** 2026-04-05
>
> **Context:** Solo developer, day job. Target: November 2026 tournament (IRL, WSDC, Bulgaria).
> Secondary: September/October online tournament. Long-term: BP format, international expansion, freemium model.
>
> **Supersedes:** This document is the authoritative product plan. It incorporates and replaces the roadmap sections of [`forward_plan.md`](forward_plan.md) and [`mvp_plan.md`](mvp_plan.md). Those documents remain useful for architectural patterns and technical details.

---

## Table of Contents

1. [Strategic Position](#1-strategic-position)
2. [The Three-Phase Model](#2-the-three-phase-model)
3. [Current State Assessment](#3-current-state-assessment)
4. [UX Foundation (Fix First)](#4-ux-foundation-fix-first)
5. [Phase 1: Pre-Tournament (The Wedge)](#5-phase-1-pre-tournament-the-wedge)
6. [Phase 2: Active Tournament (Good Enough, Then Great)](#6-phase-2-active-tournament-good-enough-then-great)
7. [Phase 3: Post-Tournament / Archive](#7-phase-3-post-tournament--archive)
8. [Timeline to November 2026](#8-timeline-to-november-2026)
9. [Far Future (Post-November)](#9-far-future-post-november)
10. [Database Changes Required](#10-database-changes-required)
11. [Key Risks](#11-key-risks)
12. [Decision Log](#12-decision-log)

---

## 1. Strategic Position

### 1.1 The competitive landscape

| Tool | Strengths | Weaknesses | Market |
|---|---|---|---|
| **Tabbycat** | Battle-tested tab engine. Swiss/power pairing, BP+WSDC+AP support, judge allocation algorithm, feedback system, elimination rounds. Open source, 15+ years of iteration. | **No registration, no payments, no communication, no video, no timer.** Self-hosting is complex. UI is dated Django admin. 4-8 hours setup for a 100-team tournament. Steep learning curve. | Global university BP, WSDC |
| **Tabroom.com** | Integrated registration + payment. Covers 20+ US formats. Mutual preference judging. Massive NSDA ecosystem. | Infamously bad UI (unchanged since ~2008). US-centric. No video, no timer, no real-time features. Not designed for BP/WSDC. | US high school/college |
| **SpeechWire** | Registration + payment. Cleaner UI than Tabroom. | Smaller market share. US-only. Limited BP/WSDC. | US regional |
| **Spreadsheets** | Free, flexible, familiar. | Error-prone, no automation, doesn't scale. | Small/local everywhere |

### 1.2 Where Debatera wins

Tabbycat is excellent at Phase 2 (active tournament tabulation). Trying to out-feature it on pairing algorithms or judge allocation in 7 months is unrealistic and unnecessary.

**The winning strategy:**

> Make Phase 1 (pre-tournament) so good that organizers adopt Debatera for registration and admin alone. Because they're already in the system, Phase 2 is a natural continuation — no CSV export/import, no data re-entry, no juggling between tools.

This is a "whole product" strategy. Tabbycat requires organizers to:
1. Collect registrations via Google Forms
2. Track payments via spreadsheet + bank
3. Collect documents via email
4. Wrangle all data into CSV format
5. Import into Tabbycat (error-prone)
6. Communicate via Discord/WhatsApp separately
7. Manage timers and video via separate tools

Debatera eliminates steps 1-5 entirely and improves 6-7.

### 1.3 The pitch to organizers

*"You already spend 4-8 hours on registration spreadsheets and CSV formatting before Tabbycat even opens. With Debatera, participants register themselves, you track fees with one click, documents are collected automatically, and when tournament day arrives — the data is already in the system. No export, no import, no spreadsheet."*

---

## 2. The Three-Phase Model

Every tournament has three distinct phases. Each phase has different users, different needs, and different competitive gaps.

### Phase 1: Pre-Tournament
**Timeline:** 2-4 months before → tournament day
**Primary user:** Organizer (tournament director, tab director)
**Secondary users:** Institution admins, individual debaters/judges

| What happens | Current tool | Debatera opportunity |
|---|---|---|
| Tournament announced | Social media, email lists | Tournament listing + sharing |
| Registration opens | Google Forms | Self-service registration |
| Institutions register teams | Email, spreadsheet | Institution approval flow (exists) |
| Individual participants register | Google Forms | Self-registration through institution |
| Fees collected | Bank transfer + manual tracking | Fee tracking (manual first, Stripe later) |
| Documents collected (consent, ID) | Email, Google Drive | Per-tournament document upload |
| Registration confirmed | Manual email | Status dashboard + notifications |
| Judge recruitment | Email, personal contacts | Judge registration + obligation tracking |
| Teams formed | Spreadsheet | Team builder (exists) |
| Venue/room setup (IRL) | Spreadsheet, building maps | Venue management (exists) |
| Communication with participants | Discord, WhatsApp, email | In-app announcements |

### Phase 2: Active Tournament
**Timeline:** Tournament day(s)
**Primary user:** Organizer (tab team)
**Secondary users:** Debaters, judges, spectators

| What happens | Current tool | Debatera opportunity |
|---|---|---|
| Check-in (who showed up) | Paper list, spreadsheet | Check-in toggle per participant |
| Motion/topic announced | Projector, WhatsApp | In-app motion display + notification |
| Draw/pairings generated | Tabbycat | Pairing generator (exists) |
| Draw published to participants | Tabbycat public page, WhatsApp | In-app draw view + push notification |
| Participants find their room | Whiteboards, printouts | Room assignment in app |
| Debates happen (IRL) | Physical rooms | Venue info display |
| Debates happen (online) | Zoom/Discord + external timer | Stream video + built-in timer (exists) |
| Ballots submitted | Paper → Tabbycat entry, or Tabbycat e-ballot | In-app ballot (exists) |
| Results computed | Tabbycat | Auto-computation (exists) |
| Standings updated | Tabbycat | Standings page (exists) |
| Next round generated | Tabbycat | Swiss pairing (exists) |
| Emergency changes (drops, room swaps) | Manual Tabbycat edits | Round editing (exists) |
| Break announcement | Projector, live ceremony | Break generation (future) |
| Elimination rounds | Tabbycat | Future |

### Phase 3: Post-Tournament
**Timeline:** After final round → indefinitely
**Primary user:** Debaters (consuming feedback), organizer (archiving)
**Secondary users:** Coaches, debate community

| What happens | Current tool | Debatera opportunity |
|---|---|---|
| Full tab released | Tabbycat public page | Public tournament view |
| Speaker/team awards | Live ceremony | Awards display + export |
| Judge feedback to debaters | Tabbycat (basic), often missing | Structured feedback access per debater |
| Tournament archived | Tabbycat instance stays up (or doesn't) | Permanent archive view |
| Results exported | Tabbycat CSV (limited) | CSV/PDF export |
| Historical record | Scattered across websites | Debater profiles across tournaments (future) |
| Organization report | Manual | Auto-generated summary (future) |

---

## 3. Current State Assessment

### 3.1 What's built and working

- **Auth**: Clerk integration, DB sync, institution memberships
- **Institutions**: Create, invite members, manage roles
- **Tournament creation**: 4-step wizard, settings (format, mode, registration window, pairing system)
- **Tournament setup**: Guided post-creation wizard (venues, judges, participants, teams)
- **Registration**: Institution approval flow (request → approve/reject), participant registration by institution admin
- **Teams**: Team creation, member assignment, DnD interface
- **Rounds**: Create, rename, delete, status transitions (DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED)
- **Pairings**: Random + Swiss generation with best-effort constraints, DnD editor, manual editing
- **Venues**: CRUD, categories, auto-allocation, assignment to debates
- **Ballots**: Per-judge ballots with speech scores, draft/submit flow, modification requests, reopen by organizer
- **Results**: Auto-computation from ballots (majority vote, chair tiebreak, point averages)
- **Standings**: Team standings (wins, points) and speaker standings (average scores)
- **Video**: Stream SDK integration, debate call rooms
- **Stopwatch**: Server-synced debate timer
- **Judge portal**: Token-based access links for judges without accounts
- **Notifications**: Basic in-app notifications
- **Sidebar navigation**: Role-aware, with recent tournaments

### 3.2 What's broken or missing (from UX audit)

**Critical UX issues** (these are why users "don't know what to do"):

1. **No self-service institution join flow.** The `/institutions` page shows only YOUR institutions. There is no search, no browse, no "request to join." A debater who doesn't admin an institution sees an empty page with only "Create Institution" — a dead end.

2. **Registration requires institution admin mediation with zero visibility for debaters.** The "Register" tab on a tournament looks like self-registration but is actually an admin tool. A regular debater who clicks it sees "You don't administer any institutions yet" and no guidance on what to do instead. The actual flow requires 4 steps across 3 different actors with no progress indicator.

3. **No role-based onboarding.** The dashboard shows the same content to organizers, institution admins, and debaters. A first-time debater might click "Create Tournament" thinking they need to create something to participate.

4. **Empty states are misleading.** Stats showing all zeros, "No institutions yet — Create the first institution" when the user should be joining one, not creating one.

5. **Invitations buried in notification bell.** No dedicated pending invitations page. If users miss the bell badge, they never find their invitation.

6. **Tournament overview stats broken.** Institutions and participants counts are hardcoded to 0.

7. **Search non-functional.** Shows "Search coming soon!" — kills discoverability.

8. **Setup page not accessible after dismissal.** If organizer dismisses the "Need to revisit setup?" card, the only way back is a small button easy to miss.

9. **No lifecycle checklist for organizers.** No at-a-glance view of: "Registration open, 3/5 institutions approved, 12 participants registered, 0 rounds created — next: approve remaining institutions."

---

## 4. UX Foundation (Fix First)

Before adding any new features, fix the fundamental UX problems that make the app unusable for non-experts. These changes affect everything downstream and must come first.

### 4.1 Role-based onboarding (new user experience)

**Problem:** Users don't know what they are or what to do.

**Solution:** After first login, show a role selection screen:

```
Welcome to Debatera! What brings you here?

[ I'm organizing a tournament ]  → guide to Create Tournament
[ I'm a debater ]                → guide to Join Institution → Register for Tournament
[ I'm a judge ]                  → guide to Join Institution → Register as Judge
[ I'm an institution admin ]     → guide to Create/Manage Institution
```

This doesn't lock users into a role — it just directs them to the right first step. Store the selection to customize the dashboard.

**Implementation:** Single new component, conditional rendering on dashboard. No schema change needed (store in localStorage or a `User.onboardingRole` field).

### 4.2 Institution discovery and joining

**Problem:** Debaters have no way to find or join institutions.

**Solution:**
- Make institutions browsable/searchable (those marked `isPublic` or within the same tournament context)
- Add "Request to Join" button on institution pages → creates a pending request for the institution admin
- Add dedicated "Pending Invitations" section on dashboard (not just the bell icon)
- In tournament context: when viewing a tournament, show "Your institution hasn't registered yet — ask your institution admin [Name] to register, or request to join [Institution Name]"

**Implementation:** New `InstitutionJoinRequest` model (or reuse invitation with a `REQUESTED` direction). New API endpoint. UI changes to institution list page and tournament registration page.

### 4.3 Fix empty states everywhere

**Problem:** Empty states say "Create X" when the user should be joining X.

**Solution:** Context-aware empty states:
- Institutions page (non-admin): "You're not a member of any institution yet. **Browse institutions** to request to join, or ask your institution admin to invite you."
- Dashboard (debater): "No upcoming debates yet. **Browse tournaments** to find one your institution is registered for."
- Tournament overview (organizer): Replace zeros with a progress checklist (see 4.5).

### 4.4 Fix broken functionality

- Fix tournament overview stats (institutions and participants showing 0)
- Remove or implement search (showing "coming soon" is worse than not having it)
- Make setup page always accessible from tournament nav (add "Setup" tab for organizers)

### 4.5 Organizer lifecycle checklist

**Problem:** Organizers don't know what step they're on or what to do next.

**Solution:** A persistent checklist on the tournament overview page:

```
Tournament Setup Progress:
[x] Tournament created
[x] Settings configured
[ ] Registration open (opens May 1)
    → 3 institutions registered (2 approved, 1 pending)
    → 15 participants registered
    → 8 of 12 fees paid
    → 3 missing consent forms
[ ] Teams formed (6 of target 8)
[ ] Venues configured (0 rooms)
[ ] Round 1 created
[ ] Round 1 pairings generated
[ ] Round 1 published
...
```

Each incomplete step links directly to the relevant page. This replaces the current placeholder "Tournament Details" card.

**Implementation:** Server component that queries tournament state and renders progress. No schema change — derived from existing data.

---

## 5. Phase 1: Pre-Tournament (The Wedge)

This is where Debatera differentiates. Every feature here is something Tabbycat cannot do.

### 5.1 Self-service registration flow

**Current state:** Institution admin must manually register each participant. Regular debaters/judges cannot register themselves.

**Target state:** A complete self-service flow:

1. **Organizer creates tournament** → sets registration window, team size rules, judge obligations
2. **Organizer shares tournament link** (or tournament appears in public browse)
3. **Institution admin** clicks "Register Institution" → status: PENDING
4. **Organizer approves** institution → notification sent to institution admin
5. **Institution members register themselves** for the tournament (select role: debater or judge) → institution admin can also register members on their behalf (current flow, kept as fallback)
6. **Institution admin forms teams** from registered debaters
7. **Organizer sees** real-time registration dashboard

**Key changes needed:**
- Allow institution members (not just admins) to self-register for tournaments their institution is approved for
- Add a "Register for this tournament" button visible to members of approved institutions
- Keep the admin registration flow as a bulk/management tool
- Add registration status per participant: REGISTERED → CONFIRMED (fees + docs complete)

### 5.2 Fee tracking

**For November (manual tracking):**

Organizers need to know: who has paid, who hasn't, how much is outstanding.

**Data model:**
- `TournamentFeeConfig` on `TournamentSettings`: amount, currency, payment instructions, deadline
- `TournamentFeePayment` per institution or per team:
  - `status`: UNPAID / PENDING_VERIFICATION / PAID / WAIVED
  - `amount`, `method` (bank transfer / cash / other)
  - `reference` (transfer reference, receipt number)
  - `notes` (organizer notes)
  - `verifiedAt`, `verifiedByUserId`

**Organizer UI:**
- Fees dashboard: table of all institutions/teams with payment status
- Filter: unpaid, pending, paid
- Bulk action: mark multiple as paid
- Summary: "24/30 teams paid. Outstanding: 1,800 BGN"
- Per-institution view showing payment details

**Participant UI:**
- Tournament registration page shows: "Entry fee: 50 BGN per team. Payment: bank transfer to [details]. Your status: UNPAID"
- After paying, participant or institution admin can submit payment reference
- Status updates when organizer verifies

**Future (post-November):** Stripe integration for direct payment. This is a significant project (Stripe Connect for platform fees, handling refunds, multiple currencies) — explicitly defer.

### 5.3 Document collection

**For November:**

Organizers need to collect consent forms, ID copies, or other documents per participant.

**Data model:**
- `TournamentDocumentRequirement`: per tournament, configurable
  - `name` (e.g., "Parental Consent Form")
  - `description` / instructions
  - `required`: boolean
  - `appliesToRole`: DEBATER / JUDGE / ALL
  - `templateUrl`: optional downloadable template
- `TournamentDocumentSubmission`: per participant per requirement
  - `fileUrl` (uploaded to cloud storage — e.g., Vercel Blob, S3, or Uploadthing)
  - `status`: PENDING_REVIEW / APPROVED / REJECTED
  - `reviewNote`
  - `reviewedByUserId`, `reviewedAt`

**Organizer UI:**
- Configure required documents in tournament settings
- Document dashboard: matrix of participants x required documents, showing status
- Click to view/download submitted documents
- Approve/reject with optional note
- Filter: "Show participants with missing documents"

**Participant UI:**
- Tournament registration page shows required documents with status
- Upload button per document
- Status indicator: "Submitted — awaiting review" / "Approved" / "Rejected: [reason]"

**File storage:** Use Vercel Blob (simplest for a Next.js app) or Uploadthing. Files should be private (not publicly accessible URLs) — generate signed URLs for download.

### 5.4 Registration dashboard (organizer view)

The single most important organizer screen. At a glance:

```
Registration Status                    Deadline: November 15, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Institutions:  8 approved  |  2 pending  |  1 rejected
Participants:  42 debaters |  12 judges  |  total: 54
Teams:         16 formed   |  target: 16 (from settings)
Fees:          12/16 paid  |  outstanding: 200 BGN
Documents:     38/42 complete  |  4 missing consent forms

[Approve pending institutions]  [View fee status]  [View documents]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━
Recent Activity:
• Sofia Debate Club registered 3 debaters (2 hours ago)
• Payment received from Plovdiv Academy — verified (yesterday)
• Consent form missing: Ivan Petrov (Sofia DC) — reminder sent
```

### 5.5 Communication / Announcements

**For November (simple):**

- `TournamentAnnouncement` model: `tournamentId`, `title`, `body`, `createdByUserId`, `createdAt`, `audience` (ALL / DEBATERS / JUDGES / INSTITUTION_ADMINS)
- Organizer can post announcements from tournament overview
- Announcements appear in a feed on the tournament page and generate `Notification` records
- Participants see announcements when they open the tournament

**Future:** Email delivery, push notifications. For now, in-app only is sufficient.

### 5.6 Judge obligation tracking

**Problem:** Tournaments require institutions to provide judges (typically 1 judge per 2-3 teams). Organizers manually track who owes judges.

**Solution:**
- Add `judgeObligationRatio` to `TournamentSettings` (e.g., 0.5 = 1 judge per 2 teams)
- Auto-compute obligation per institution based on team count
- Registration dashboard shows: "Sofia DC: 4 teams, obligation: 2 judges, registered: 1 judge — 1 short"
- Highlight institutions that haven't met their obligation

---

## 6. Phase 2: Active Tournament (Good Enough, Then Great)

The core tournament loop already works. Focus is on reliability, usability, and the few missing pieces for a real IRL tournament.

### 6.1 Check-in system (tournament day)

**Problem:** On tournament morning, some teams don't show up. Pairings must only include teams that are present.

**Solution:**
- Add `checkedIn` boolean to `TournamentTeam` (or a `TournamentCheckIn` model for audit trail)
- Add `checkedIn` to `TournamentParticipant` (for judges)
- Organizer check-in page: list of all teams and judges with toggle switches
- QR code check-in option (future): each participant has a QR code; scan to check in
- Pairing generator respects check-in: only checked-in teams are paired
- Visual indicator on teams page: "14/16 teams checked in"

### 6.2 Motion display and announcement

**Current state:** Motion field exists on `TournamentRound` but there's no prominent display or notification when it's set.

**Improvements:**
- When organizer publishes a round with a motion, the motion is displayed prominently at the top of the round view
- Notification sent to all participants: "Round 1 motion released: [motion text]"
- In the debate room view: motion displayed in a prominent banner
- Info slide (prep material) displayed below the motion when provided
- Countdown to debate start (if `startsAt` is set on the round)

### 6.3 Participant draw view

**Current state:** Published rounds show pairings, but the participant experience could be clearer.

**Improvements:**
- "My assignment" card on the tournament overview: "Round 2: You are Proposition in Room 3 vs. [Team Name]. Judge: [Judge Name]. Venue: Room 101, Building A."
- For judges: "Round 2: You are judging Room 3. Proposition: [Team]. Opposition: [Team]. Venue: Room 101."
- Direct link to the debate room / venue information
- For IRL: show venue location details (building, floor, directions if available)

### 6.4 Swiss pairing hardening

**Current constraints (best-effort):**
- Avoid same-institution matchup
- Avoid repeat matchups across rounds

**Additional for November:**
- Power-pairing within win brackets (teams with same record face each other)
- Side history balance (alternate Prop/Opp where possible)
- Display pairing constraint violations clearly to the organizer before publishing
- Allow organizer to manually swap teams after generation to resolve issues

### 6.5 Judge allocation improvements

**Current state:** Random distribution with odd-panel preference.

**For November:**
- Institution conflict avoidance: judges should not adjudicate debates involving their own institution (hard constraint)
- Manual judge assignment UI improvements (the DnD interface exists but can be clearer)
- Chair designation: organizer can designate which judge is chair of each panel
- Show warnings clearly: "Judge X is from the same institution as Prop team"

### 6.6 Round management improvements

- Add "Start Round" button that sends notifications to all participants
- Show ballot completion progress per round: "Ballots: 6/8 submitted"
- Show which debates are still waiting for ballots
- "Complete Round" validation: all ballots submitted, all results computed
- Prevent round completion if any debate is missing ballots (with override option)

### 6.7 IRL-specific features (for November)

Since the November tournament is IRL:
- Venue information display: room name, building, capacity
- Printable draw sheet: a clean, printable view of the round's pairings (for posting on boards)
- Printable ballot template: PDF ballot that can be printed for judges without devices (with manual data entry later)

---

## 7. Phase 3: Post-Tournament / Archive

### 7.1 Feedback access for debaters

**Problem:** Judges write feedback on ballots (scores + comments per speech), but debaters can't easily access their feedback after the tournament.

**Solution:**
- "My Feedback" page per participant: list of all debates they participated in, with:
  - Their speech role and score from each judge
  - Judge's comment for their speech
  - Overall result of the debate
- Access controlled by tournament settings: `feedbackReleasedAt` timestamp
- Organizer controls when feedback becomes visible (can be per-round or all-at-once after the tournament)

**Alternative access via judge portal (existing):** The judge portal already exists with token-based access links. Consider adding a similar "debater feedback portal" using the team's `feedbackCode` (already exists on `TournamentTeam`) for debaters who don't have accounts.

### 7.2 Tournament archive mode

**When a tournament is completed:**
- Tournament status transitions to COMPLETED → ARCHIVED
- All data becomes read-only (no more edits to pairings, ballots, teams)
- Public-facing archive page showing:
  - Final team standings
  - Final speaker standings
  - Round-by-round results
  - Motion list
- Archive is permanently accessible (the Tabbycat problem: instances get taken down)

### 7.3 Export

**For November:**
- CSV export for team standings
- CSV export for speaker standings
- CSV export for all results (round-by-round)
- Print-friendly standings page

**Future:**
- PDF tournament report (summary, standings, motion statistics)
- Tabbycat-compatible import/export (if organizers want to cross-reference)

---

## 8. Timeline to November 2026

> You have ~7 months. As a solo developer with a day job, assume ~15-20 hours/week of development. That's roughly 400-550 hours of total development time. Each phase below is sized accordingly.

### Block 1: UX Foundation (April – mid-May) — ~6 weeks

**Goal:** Make the existing app usable by non-experts.

| Week | Focus | Deliverable |
|---|---|---|
| 1-2 | Role-based onboarding + fix empty states | New users know what to do after signup |
| 3 | Institution discovery + "Request to Join" | Debaters can find and request to join institutions |
| 4 | Fix broken stats + add Setup tab to tournament nav + improve invitations visibility | Organizer dashboard shows real data; setup always accessible |
| 5 | Organizer lifecycle checklist on tournament overview | Organizers see progress and next steps at a glance |
| 6 | Navigation polish + fix dead ends + contextual help | No more "I don't know what to do" moments |

**Validation:** Have your partner organization walk through the app. They should be able to register their institution and participants without your help.

### Block 2: Phase 1 Features (mid-May – July) — ~8 weeks

**Goal:** Registration is self-service. Organizers can track fees and documents.

| Week | Focus | Deliverable |
|---|---|---|
| 7-8 | Self-service participant registration (members register themselves for tournaments) | Debaters and judges can register without admin doing it manually |
| 9-10 | Fee tracking (manual: UNPAID/PENDING/PAID) + organizer fee dashboard | Organizer knows who has and hasn't paid |
| 11-12 | Document collection (configurable requirements, file upload, review flow) | Consent forms collected in-app |
| 13 | Registration dashboard (the single-view summary) | Organizer sees everything at once |
| 14 | Announcements + judge obligation tracking | Organizer can communicate and track judge quotas |

**Validation:** Set up a fake tournament. Register 4 institutions, 16 teams, track fees, collect a test document. The entire flow should work without touching the database.

### Block 3: Phase 2 Hardening (July – September) — ~8 weeks

**Goal:** The active tournament loop is reliable for a real IRL tournament.

| Week | Focus | Deliverable |
|---|---|---|
| 15-16 | Check-in system + pairing generation respects check-in | Tournament day: mark who showed up, only pair checked-in teams |
| 17-18 | Swiss pairing hardening (power-pairing, side balance, institution conflicts for judges) | Pairings are correct and fair |
| 19 | Motion display + round notifications | Participants get notified, see their assignments clearly |
| 20 | Participant draw view ("My Assignment" card) + IRL venue info | Every participant knows where to go |
| 21 | Round management (ballot progress, round completion validation) | Organizer has full control and visibility |
| 22 | Printable draw sheets + ballot templates | IRL backup for tech failures |

**Validation:** Run a simulated tournament with 8 teams, 2 rounds. Do everything in the app — check-in, pair, publish, submit ballots, compute results, view standings.

### Block 4: Phase 3 + Polish (September – October) — ~6 weeks

**Goal:** Feedback works. Export works. Everything is polished.

| Week | Focus | Deliverable |
|---|---|---|
| 23-24 | Feedback access for debaters (My Feedback page, feedback release control) | Debaters can see their scores and judge comments |
| 25 | CSV export (standings, results, participant list) | Organizer can export data for records |
| 26 | Tournament archive mode (COMPLETED status, read-only, public view) | Completed tournaments are browsable and permanent |
| 27-28 | Bug fixes, performance, edge cases, overall polish | App feels solid and reliable |

### Block 5: Testing and Launch Prep (October – November) — ~4 weeks

**Goal:** Battle-tested for the November tournament.

| Week | Focus | Deliverable |
|---|---|---|
| 29-30 | Run 2-3 test tournaments (with partner organization and friends) | Find and fix real-world issues |
| 31 | Fix everything that broke during testing | Stable app |
| 32 | Deploy to production, pre-tournament setup for November event | Ready for the real tournament |

### What to cut if behind schedule

Cut in this order (last = cut first):

1. **Printable ballot templates** — judges can use their phones
2. **Tournament archive mode** — can add post-tournament
3. **Judge obligation tracking** — track manually
4. **Announcement system** — use WhatsApp alongside the app
5. **Document collection** — collect via email, just add manual checkboxes
6. **CSV export** — can do post-tournament

**Never cut:**
- UX foundation (Block 1) — without this, nothing else matters
- Self-service registration — this is the core value proposition
- Fee tracking — organizers need this
- Check-in system — essential for tournament day
- Pairing reliability — tournament integrity depends on it
- Feedback access — debaters expect this

---

## 9. Far Future (Post-November)

Ordered by strategic impact, not by difficulty.

### 9.1 BP Format Support (highest impact for growth)

British Parliamentary is the dominant university format worldwide. Supporting it is the single biggest market expansion move.

**What it requires:**
- 4 teams per debate (OG, OO, CG, CO) instead of 2
- Ranking-based results (1st through 4th) instead of binary win/loss
- Position allocation across rounds (ensure teams get variety of positions)
- Different scoring: points system (3/2/1/0) instead of win/loss
- Different standings computation
- Different pairing: 4 teams per bracket instead of 2
- Swing teams: if team count isn't divisible by 4
- Separate ballot model: rank teams 1st-4th plus individual speaker scores

**Estimated effort:** Major — probably 2-3 months of focused work. This is the kind of feature that should be planned and built in one focused push, not incrementally.

**Approach:** Make the existing schema format-aware. Add a `format` discriminator. Use polymorphic patterns where the debate model, ballot model, and standings computation vary by format.

### 9.2 Payment Processing (Stripe)

After manual fee tracking is validated at November tournament:
- Stripe Connect integration (platform model — Debatera takes a small fee per transaction)
- Multiple currencies (BGN, EUR, USD, GBP)
- Automatic receipt generation
- Refund handling
- Invoicing for institutions

### 9.3 Multi-Admin Tournaments

Currently only the creator can manage a tournament. Real tournaments have:
- **Tournament Director**: overall authority
- **Tab Director**: manages pairings, results, standings
- **Chief Adjudicator (CA)**: manages judges, feedback, adjudicator scores
- **Equity Officer**: handles complaints, accessibility
- **Logistics Coordinator**: venues, catering, transportation

Add `TournamentRoleAssignment` model with role-based permissions.

### 9.4 Advanced Pairing Algorithms

- Power-matching within brackets (already planned for November in basic form)
- Side history tracking and enforcement
- Pull-up/pull-down rules for odd bracket sizes
- Elimination round bracket generation (quarters, semis, finals)
- Break calculation and announcement

### 9.5 Elimination / Break Rounds

- Configure break size (top 8, 16, 32 teams)
- Automatic break calculation from preliminary standings
- Bracket seeding (1st vs 16th, 2nd vs 15th, etc.)
- Elimination round draw generation
- Single-elimination or custom bracket formats

### 9.6 Cross-Tournament Debater Profiles

- Debater profile page showing all tournaments, all results, all feedback
- Institution performance across tournaments
- Speaker score trends over time
- This is a major retention and differentiation feature — no other platform does this well

### 9.7 Freemium Model

- **Free tier:** up to N teams per tournament (8?), basic features, limited storage
- **Pro tier:** unlimited teams, document collection, payment processing, advanced analytics, priority support
- **Implementation:** feature flags per tournament based on the organization's plan
- **Pricing research needed:** survey actual organizers about willingness to pay

### 9.8 Advanced Features (12+ months)

- Mutual preference judging (like Tabroom — teams rank judges)
- AI-assisted judge allocation (optimize panels based on quality, conflicts, diversity)
- Motion statistics and analysis
- Real-time synced timers via SSE/WebSocket
- POI (Point of Information) tracking system
- Debate recording and playback (for online tournaments)
- Mobile app (React Native or PWA)
- Multi-language support (Bulgarian, English, others)
- Elo/league system for casual competitive debating
- AI sparring opponent (practice mode)

---

## 10. Database Changes Required

### 10.1 For UX Foundation (Block 1)

```
// Optional: store onboarding role selection
User {
  + onboardingRole  String?  // "organizer" | "debater" | "judge" | "institution_admin"
}

// Institution join requests (for "Request to Join" flow)
model InstitutionJoinRequest {
  id              String   @id @default(cuid())
  institutionId   String
  userId          String
  status          RequestStatus  // PENDING | APPROVED | REJECTED
  message         String?        // Optional message from requester
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
  
  @@unique([institutionId, userId, status])
}
```

### 10.2 For Phase 1 Features (Block 2)

```
// Fee configuration per tournament
TournamentSettings {
  + feeAmount       Decimal?    // Fee per team (or per participant)
  + feeCurrency     String?     // "BGN", "EUR", etc.
  + feePerUnit      String?     // "TEAM" or "PARTICIPANT"
  + feeInstructions String?     // Payment instructions text
  + feeDeadline     DateTime?
}

// Fee payment tracking
model TournamentFeePayment {
  id                String   @id @default(cuid())
  tournamentId      String
  teamId            String?          // Per-team fee
  institutionId     String?          // Or per-institution
  status            FeePaymentStatus // UNPAID | PENDING_VERIFICATION | PAID | WAIVED
  amount            Decimal?
  method            String?          // "bank_transfer" | "cash" | "card" | "other"
  reference         String?          // Payment reference number
  notes             String?
  verifiedByUserId  String?
  verifiedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tournamentId, teamId])
}

// Document requirements per tournament
model TournamentDocumentRequirement {
  id             String   @id @default(cuid())
  tournamentId   String
  name           String           // "Parental Consent Form"
  description    String?
  required       Boolean @default(true)
  appliesToRole  TournamentParticipantRole?  // null = ALL
  templateUrl    String?          // Downloadable template
  createdAt      DateTime @default(now())
  
  @@unique([tournamentId, name])
}

// Document submissions by participants
model TournamentDocumentSubmission {
  id               String   @id @default(cuid())
  requirementId    String
  participantId    String
  fileUrl          String
  fileName         String
  status           DocumentStatus  // PENDING_REVIEW | APPROVED | REJECTED
  reviewNote       String?
  reviewedByUserId String?
  reviewedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([requirementId, participantId])
}

// Tournament announcements
model TournamentAnnouncement {
  id               String   @id @default(cuid())
  tournamentId     String
  title            String
  body             String   @db.Text
  audience         AnnouncementAudience  // ALL | DEBATERS | JUDGES | INSTITUTION_ADMINS
  createdByUserId  String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

// Enums
enum FeePaymentStatus { UNPAID  PENDING_VERIFICATION  PAID  WAIVED }
enum DocumentStatus { PENDING_REVIEW  APPROVED  REJECTED }
enum AnnouncementAudience { ALL  DEBATERS  JUDGES  INSTITUTION_ADMINS }
enum RequestStatus { PENDING  APPROVED  REJECTED }
```

### 10.3 For Phase 2 Hardening (Block 3)

```
// Check-in tracking
TournamentTeam {
  + checkedIn    Boolean  @default(false)
  + checkedInAt  DateTime?
}

TournamentParticipant {
  + checkedIn    Boolean  @default(false)
  + checkedInAt  DateTime?
}

// Judge obligation config
TournamentSettings {
  + judgeObligationRatio  Float?  // e.g., 0.5 = 1 judge per 2 teams
}

// Tournament lifecycle
Tournament {
  + status  TournamentStatus  @default(DRAFT)
  // DRAFT | REGISTRATION | ACTIVE | COMPLETED | ARCHIVED
}
```

### 10.4 For Phase 3 (Block 4)

```
// Feedback release control
TournamentSettings {
  + feedbackReleasedAt  DateTime?  // null = not released yet
}

// Tournament status already covers archive mode (ARCHIVED status)
```

---

## 11. Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Solo dev burnout** | Everything stops | Protect Block 1 + Block 2 ruthlessly. Cut scope from the bottom of the priority list. Ship less but ship well. |
| **November tournament falls through** | Loss of validation opportunity | Have backup: offer the platform to your partner organization for their training tournaments. Any real usage is validation. |
| **UX fixes take longer than expected** | Delays Phase 1 features | Time-box UX work to 6 weeks. Focus on the top 3 issues (onboarding, institution join, lifecycle checklist). Defer polish. |
| **File upload complexity** | Document collection is harder than expected | Start with Vercel Blob (simplest). If it's too complex, fall back to "link to Google Drive" instead of native upload. |
| **Pairing algorithm bugs** | Tournament integrity at risk | Test with fixtures: 8, 16, 24, 32 teams. Edge cases: odd teams (BYE), single institution, all teams same record. Manual override must always work as fallback. |
| **Scope creep** | Nothing ships | This document is the scope. If it's not in Block 1-5 for November, it doesn't exist yet. Say no to yourself. |
| **BP format demand before ready** | Limits adoption at university level | Be transparent: "WSDC support now, BP coming in 2027." Focus on being the best WSDC platform first. |

---

## 12. Decision Log

Decisions made during planning. Update this as decisions change.

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-05 | Phase 1 (pre-tournament) is the primary differentiator, not Phase 2 | Tabbycat's Phase 2 is battle-tested. We win by owning the whole flow. |
| 2026-04-05 | Manual fee tracking for November, no Stripe | Stripe Connect is complex. Manual tracking solves 80% of the pain. |
| 2026-04-05 | WSDC only for November, defer BP | BP requires fundamental schema changes (4 teams/debate, ranking). Not feasible as a solo dev in 7 months alongside everything else. |
| 2026-04-05 | Fix UX before adding features | Partner org can't use the app. No feature matters if users can't navigate. |
| 2026-04-05 | Self-service registration is the core value proposition | Eliminates the biggest pain point (Google Forms → CSV → Tabbycat import). |
| 2026-04-05 | No real-time features (SSE/WS) for November | IRL tournament doesn't need synced timers. Notifications via page refresh + polling is sufficient. |
| 2026-04-05 | Vercel Blob for document storage | Simplest option for Next.js. Reassess if needs change. |
