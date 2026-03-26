# Debatera User Guide

> Last updated: March 2025

---

## Table of Contents

1. [What Is Debatera](#1-what-is-debatera)
2. [Getting Started](#2-getting-started)
   - [Creating Your Account](#creating-your-account)
   - [Your Dashboard](#your-dashboard)
   - [Your Profile](#your-profile)
   - [Navigating the App](#navigating-the-app)
3. [Roles in the System](#3-roles-in-the-system)
4. [For Organizers](#4-for-organizers)
   - [Creating a Tournament](#creating-a-tournament)
   - [Configuring Tournament Settings](#configuring-tournament-settings)
   - [Approving Institution Registrations](#approving-institution-registrations)
   - [Managing Participants](#managing-participants)
   - [Creating Rounds](#creating-rounds)
   - [Generating Pairings](#generating-pairings)
   - [Setting the Motion](#setting-the-motion)
   - [Publishing and Running a Round](#publishing-and-running-a-round)
   - [Managing Venues (IRL Tournaments)](#managing-venues-irl-tournaments)
   - [Judge Portal Links](#judge-portal-links)
   - [Handling Ballot Modification Requests](#handling-ballot-modification-requests)
   - [Viewing Standings](#viewing-standings)
   - [Tournament Settings Reference](#tournament-settings-reference)
   - [Deleting a Tournament](#deleting-a-tournament)
5. [For Institution Admins](#5-for-institution-admins)
   - [Creating an Institution](#creating-an-institution)
   - [Inviting Members](#inviting-members)
   - [Managing Members](#managing-members)
   - [Registering for a Tournament](#registering-for-a-tournament)
   - [Adding Participants to a Tournament](#adding-participants-to-a-tournament)
   - [Creating Teams](#creating-teams)
   - [Institution Visibility](#institution-visibility)
   - [Leaving or Deleting an Institution](#leaving-or-deleting-an-institution)
6. [For Judges](#6-for-judges)
   - [Viewing Your Debates](#viewing-your-debates)
   - [Entering a Ballot (WSDC Format)](#entering-a-ballot-wsdc-format)
   - [Submitting a Ballot](#submitting-a-ballot)
   - [Requesting a Ballot Modification](#requesting-a-ballot-modification)
   - [Using the Judge Portal](#using-the-judge-portal)
   - [Using the Debate Timer](#using-the-debate-timer)
7. [For Debaters](#7-for-debaters)
   - [Viewing Your Debates](#viewing-your-debates-1)
   - [Joining an Online Debate](#joining-an-online-debate)
   - [Checking Standings](#checking-standings)
8. [Tournament Lifecycle and Statuses](#8-tournament-lifecycle-and-statuses)
   - [Tournament Flow Overview](#tournament-flow-overview)
   - [Round Statuses](#round-statuses)
   - [Ballot Statuses](#ballot-statuses)
   - [Institution Registration Statuses](#institution-registration-statuses)
9. [Common Problems / FAQ](#9-common-problems--faq)
10. [Glossary](#10-glossary)

---

## 1. What Is Debatera

Debatera is a web platform for running debate tournaments. It handles the full tournament workflow: institution and team registration, round creation, automatic pairings, judge assignment, online debate rooms with video calls, ballot entry and scoring, and live standings.

Debatera currently supports the **WSDC (World Schools Debating Championship)** format with teams of 2–10 members debating in Proposition vs. Opposition matchups.

Tournaments can run **online** (with built-in video calls) or **in-person** (with venue management). The platform is designed for tournament organizers, institution administrators, judges, and debaters.

---

## 2. Getting Started

### Creating Your Account

1. Go to the Debatera homepage.
2. Click **Get Started** or **Sign Up**.
3. Create an account using your email address or a supported sign-in provider (Google, etc.).
4. After signing in, you are taken to your **Dashboard**.

You do not need an account to view public tournament standings. However, you need an account to participate in any tournament, manage an institution, or enter ballots.

### Your Dashboard

After signing in, the Dashboard shows:

- **Quick stats** — how many tournaments and institutions you are part of, and how many tournaments have registration closing soon.
- **Quick actions** — buttons to browse tournaments, manage institutions, or create a new tournament.
- **Closing soon** — tournaments whose registration window is about to close.
- **Recent activity** — a summary of pending approvals, live rounds, and upcoming deadlines.
- **Your tournaments** — recent tournaments you are involved in.
- **Your institutions** — institutions you belong to.

### Your Profile

To view or edit your profile:

1. Click your avatar in the top-right corner, or go to **My Profile** in the sidebar.
2. Your profile shows your name, pronouns, bio, email, and institution memberships.
3. Click **Edit** to update your display name, pronouns, bio, or choose whether your email is publicly visible.

Other users can see your public profile when they click your name in a tournament.

### Navigating the App

- **Sidebar** (left) — main navigation. Sections include:
  - **Home** — your dashboard
  - **My Profile** — view and edit your info
  - **Institutions** — browse and manage institutions
  - **Browse Tournaments** — find tournaments
  - **Create Tournament** — start a new tournament
  - **My Tournaments** — tournaments you participate in, organized by your role (organizer, judge, debater)
  - **My Assignments** — your judging assignments (visible if you are a judge in any tournament)
- **Top navigation bar** — includes a search bar, a **Create Tournament** button, a notifications bell, and your user menu.
- **Notifications** — the bell icon shows unread notifications, including institution invitations that you can accept or decline directly.
- **Keyboard shortcut** — press **Ctrl+K** (or **Cmd+K** on Mac) to open the command palette for quick navigation.

---

## 3. Roles in the System

Debatera has several roles that determine what you can do. You can hold different roles in different contexts.

| Role | Where It Applies | What You Can Do |
|------|-------------------|-----------------|
| **Organizer** | Per tournament | Full control: create rounds, generate pairings, approve registrations, manage participants, configure settings, generate judge portal links |
| **Institution Admin** | Per institution | Invite and manage members, register the institution for tournaments, add participants, create teams |
| **Institution Member** | Per institution | Belong to an institution, be added to tournaments and teams by an admin |
| **Judge** | Per tournament | View assigned debates, enter and submit ballots, request ballot modifications, use the debate timer |
| **Debater** | Per tournament | View assigned debates, join online debate rooms, check standings |
| **Spectator** | Per tournament | View public tournament information (overview, rounds, teams, standings) without being a participant |

**Who is the organizer?** The person who creates a tournament is automatically its organizer. There is one organizer per tournament.

**How do roles get assigned?** Judges and debaters are added to a tournament by the organizer or by institution admins. Your role is set when you are added as a participant (either as a JUDGE or DEBATER).

---

## 4. For Organizers

### Creating a Tournament

1. Click **Create Tournament** in the sidebar or top navigation.
2. Complete the 3-step form:
   - **Step 1 — Basics**: Enter a tournament name (required). Choose the event mode: **Online** (debates happen via video calls) or **IRL** (debates happen in physical venues). Optionally add a description.
   - **Step 2 — Registration**: Set when registration opens and closes. Set the minimum and maximum team size (how many debaters per team).
   - **Step 3 — Review**: Check your settings and confirm.
3. Click **Create Tournament**. You are now the organizer.

After creation, you land on the tournament's **Overview** page.

### Configuring Tournament Settings

Go to your tournament and click the **Settings** tab. You can change:

| Setting | Description |
|---------|-------------|
| Registration opens / closes | Date range when institutions can register and teams can be formed |
| Min / max team size | Allowed number of debaters per team (1–10) |
| Show debater names | Whether debater names appear in standings |
| Speaker top N | Limit speaker standings to the top N speakers (leave blank to show all) |
| Hide speaker points | Hide individual point totals from speaker standings |
| Public tournament | Toggle whether the tournament is visible to anyone (including non-signed-in visitors) |
| Public tabs | Choose which tabs are visible to unauthenticated visitors: Overview, Rounds, Teams, Standings |

The debate format is currently fixed to **WSDC**. The event mode (Online or IRL) is set at creation and cannot be changed later.

### Approving Institution Registrations

When an institution admin registers their institution for your tournament, the registration starts as **Pending**.

1. Go to your tournament's **Overview** tab.
2. Under **Pending Registrations**, you will see a list of institutions waiting for approval.
3. Click **Approve** to allow the institution to participate, or **Reject** to decline.

Once approved, the institution's admins can add their members as participants and create teams.

### Managing Participants

Go to the **Participants** tab. You will see two sub-tabs: **Judges** and **Debaters**.

**Adding a single judge or debater:**
1. Click **Add Judge** (or the equivalent for debaters).
2. Enter the person's display name.
3. Optionally associate them with an institution, or they will be added as an "Independent Adjudicator."

**Bulk-adding judges:**
1. Click **Bulk Add Judges**.
2. In the dialog, paste a list of names (one per line).
3. Confirm. All listed judges are added at once.

**Removing a participant:**
Click the remove button next to a participant's name. Removing a participant also removes them from any team they belong to.

> Note: Institution admins can also add their own members as participants. See [Adding Participants to a Tournament](#adding-participants-to-a-tournament).

### Creating Rounds

Go to the **Rounds** tab.

1. Click **Create Round**.
2. Enter a round name (e.g., "Round 1", "Grand Final"). The round number is assigned automatically.
3. The new round starts in **Draft** status, meaning it is only visible to you.

You can rename or delete a round while it is in Draft status. Once published, a round cannot be deleted.

### Generating Pairings

Open a round that is in **Draft** status.

1. Click **Auto-Generate** to automatically create random pairings. The system will:
   - Randomly match Proposition vs. Opposition teams.
   - Distribute judges across debates (preferring odd-numbered panels).
   - Flag warnings for same-institution matchups, judge-institution conflicts, or even panel sizes. These warnings are non-blocking — you can proceed despite them.
2. You can also manually drag and drop teams and judges to adjust pairings.
3. Click **Save Changes** to save your pairings.

If there is an odd number of teams, one team receives a **Bye** (an automatic win with no opponent).

### Setting the Motion

While editing a round in Draft status:

1. Find the **Motion** field.
2. Enter the debate motion (topic). For example: "This house would ban social media for minors."
3. Optionally add an **Info Slide** with background information that debaters will see.
4. Click **Save Changes**.

The motion becomes visible to participants once the round is published.

### Publishing and Running a Round

Rounds progress through four statuses, always moving forward:

1. **Draft** → Only you can see the round. Edit pairings, set the motion.
2. Click **Publish** → Round becomes **Published**. Participants can see their pairings, the motion, and the info slide. For online tournaments, debate rooms become available.
3. Click **Start Round** → Round becomes **In Progress**. Judges can now enter ballots. Debates are considered live.
4. Click **Complete Round** → Round becomes **Completed**. Results are finalized. Standings update.

Each transition is one-way. You cannot move a round back to a previous status.

### Managing Venues (IRL Tournaments)

If your tournament is set to **IRL** (in-person) mode, you can manage physical debate venues.

1. Go to the **Venues** tab.
2. Add venues with names, priority scores, and categories.
3. When editing a round, click **Allocate Venues** to automatically assign venues to debates based on priority.

Venues are not available for online tournaments.

### Judge Portal Links

The judge portal allows judges to access their ballots without needing a Debatera account. This is useful for external adjudicators.

1. Go to the **Participants** tab.
2. Click **Generate Portal Links** to create links for all judges, or generate a link for individual judges.
3. Copy the link and send it to the judge (e.g., via email or messaging app).

When a judge opens their portal link, they see:
- Their assigned debates grouped by round.
- Their ballot status for each debate.
- Direct buttons to enter or view ballots.

Portal links are token-based and do not require the judge to create an account.

### Handling Ballot Modification Requests

After a judge submits a ballot, they may request a modification (e.g., to fix a scoring error).

1. Open the round that contains the debate.
2. Look for the **Ballot Modification Requests** card.
3. Each request shows which judge is asking and a reason.
4. Click **Approve** to reopen the ballot for editing, or **Reject** to keep the ballot as submitted.

When you approve a modification request, the existing debate result for that matchup is invalidated and will be recomputed when the judge resubmits.

### Viewing Standings

Go to the **Standings** tab to see team and speaker rankings. Standings are also accessible at a public URL that you can share.

- **Teams tab**: Ranked by wins (then total speaker points as tiebreaker).
- **Speakers tab**: Ranked by average speaker points.

Standings update automatically as debate results are finalized. You can control what is visible using tournament settings (show/hide debater names, hide speaker points, limit to top N speakers).

### Tournament Settings Reference

All settings are on the **Settings** tab:

- **Registration & Teams**: Open/close dates, team size limits.
- **Display Options**: Debater name visibility, speaker standings limits.
- **Visibility**: Public toggle, public tab access (overview, rounds, teams, standings).
- **Danger Zone**: Delete tournament (requires typing the tournament name to confirm).

### Deleting a Tournament

1. Go to **Settings**.
2. Scroll to **Danger Zone**.
3. Click **Delete Tournament**.
4. Type the tournament name to confirm.

This permanently removes the tournament and all associated data (rounds, pairings, ballots, results).

---

## 5. For Institution Admins

### Creating an Institution

1. Go to **Institutions** in the sidebar.
2. Click **Create Institution**.
3. Enter a name (required) and optionally a description.
4. Click **Create**. You are automatically the institution's admin.

An institution represents a school, university, debate club, or any group that enters tournaments together.

### Inviting Members

1. Open your institution's page.
2. In the **Invite Members** section, enter the email address of the person you want to invite.
3. Click **Send Invitation**.

The invited person receives a notification (visible in the app's notification bell). They can **Accept** or **Decline** the invitation directly from the notification.

You can see pending invitations and revoke them before they are accepted.

### Managing Members

On your institution's page:

- **View members** in the members table (paginated).
- **Promote to admin** — click the promote button next to a member's name to give them admin rights.
- **Remove a member** — click the remove button. You cannot remove yourself if you are the last admin.

### Registering for a Tournament

1. Browse tournaments and open the one you want to join.
2. Go to the **Register** tab.
3. Select your institution and submit a registration request.

Your registration starts as **Pending**. The tournament organizer must approve it before you can add participants and create teams. You can check the status on the tournament's overview page.

### Adding Participants to a Tournament

After your institution's registration is approved:

1. Go to the tournament's registration page.
2. Add your institution's members as participants with a role: **Debater** or **Judge**.

Only members of your institution can be added through this flow. The tournament organizer can also add participants independently.

### Creating Teams

1. Go to the **Teams** tab in the tournament.
2. Select your institution from the dropdown.
3. Click **Create Team**. Teams are auto-named (e.g., "Oxford 1", "Oxford 2") but can be customized.
4. Add debaters to the team by dragging members from the unassigned pool into the team column.

**Important rules:**
- Each debater can belong to only **one team** per tournament.
- Team size must be within the tournament's minimum and maximum limits.
- Teams can only be created and edited while registration is open.

### Institution Visibility

By default, institutions are private — only members can see them. As an admin, you can toggle the **Public** setting to make your institution visible to everyone.

### Leaving or Deleting an Institution

- **Leave** — click **Leave Institution** on the institution page. You cannot leave if you are the last remaining admin.
- **Delete** — click **Delete Institution** and confirm with the institution name. This permanently removes the institution and all memberships. You must be an admin.

---

## 6. For Judges

### Viewing Your Debates

Go to the **My Ballots** tab inside the tournament, or click **My Assignments** in the sidebar to see all your judging assignments across tournaments.

Each ballot card shows:
- The round name and status.
- Your judge role: **Chair** or **Panelist**.
- The teams (Proposition vs. Opposition).
- The ballot status: **Draft** (not yet submitted) or **Submitted**.
- A button to enter or view the ballot.

### Entering a Ballot (WSDC Format)

Debatera uses the **WSDC (World Schools)** ballot format. Each ballot has **8 speeches** across three steps:

**Step 1 — Proposition Speeches:**
| Speech | Role | Score Range |
|--------|------|-------------|
| 1st Proposition | Constructive | 60–80 |
| 2nd Proposition | Constructive | 60–80 |
| 3rd Proposition | Constructive | 60–80 |
| Proposition Reply | Reply | 30–40 |

**Step 2 — Opposition Speeches:**
| Speech | Role | Score Range |
|--------|------|-------------|
| 1st Opposition | Constructive | 60–80 |
| 2nd Opposition | Constructive | 60–80 |
| 3rd Opposition | Constructive | 60–80 |
| Opposition Reply | Reply | 30–40 |

**Step 3 — Decision:**
- Cast your **vote** for the winning side: Proposition or Opposition.
- Add optional **private notes** (visible only to you and the organizer).

For each speech:
1. **Select the speaker** from the dropdown (lists team members) or type a name manually.
2. **Enter a score** within the allowed range. Half-point increments are allowed (e.g., 72.5).
3. Optionally add a **comment** about the speech.

**Reply speech rule:** The reply speaker must be the 1st or 2nd speaker of that side — never the 3rd speaker.

You can **Save Draft** at any time to preserve your progress without submitting.

### Submitting a Ballot

When you have filled in all 8 speeches and cast your vote:

1. Click **Submit**.
2. The system validates that:
   - All 8 speeches have scores.
   - All scores are within the correct range.
   - Each speech has a speaker identified.
   - Reply speakers are the 1st or 2nd speaker of their team.
   - Your vote matches the side with the higher total points.
3. If validation passes, the ballot is locked as **Submitted**.

Once all judges in a debate submit their ballots, the system automatically computes the **debate result** based on the majority vote. If the vote is tied, the **chair's** ballot decides.

### Requesting a Ballot Modification

After submitting, if you realize you made an error:

1. Open the submitted ballot.
2. Click **Request Modification**.
3. Enter a reason for the change.
4. Wait for the tournament organizer to approve or reject your request.

If approved, your ballot reopens for editing. The existing debate result is invalidated until you resubmit. You can only have one pending modification request at a time.

### Using the Judge Portal

If the tournament organizer sends you a **portal link**, you can access your ballots without a Debatera account.

1. Open the link you received.
2. You see all your assigned debates grouped by round status.
3. Click on a debate to enter or view your ballot.

The portal uses the same ballot entry interface as the main app. Everything described above about scoring, submitting, and requesting modifications applies.

### Using the Debate Timer

During online debates, judges can control a synchronized stopwatch:

- **Play** — start the timer.
- **Pause** — pause the timer.
- **Reset** — reset to zero (requires confirmation).

The timer is visible to all participants in the debate room and stays synchronized across all screens.

Only judges can control the timer. Debaters and other participants see the timer but cannot start, pause, or reset it.

---

## 7. For Debaters

### Viewing Your Debates

Go to the **My Debates** tab inside the tournament.

Each debate card shows:
- The **round name** and its status (Published, In Progress, or Completed).
- The **motion** (debate topic) and any info slide.
- The **Proposition** and **Opposition** teams with their members.
- The **judges** assigned to the debate.
- The **venue** (for IRL tournaments).
- The **result** (once the round is completed): which side won, the vote split, and average scores.

### Joining an Online Debate

For **online tournaments** only:

1. Go to **My Debates**.
2. Find your debate in a round that is **Published** or **In Progress**.
3. Click **Join Call**.
4. You enter a video call room powered by Stream. The room includes:
   - Live video and audio with all participants.
   - A sidebar showing the motion, teams, and judges.
   - A synchronized debate timer (controlled by judges).

You can only join a call for debates you are assigned to and only when the round is Published or In Progress.

### Checking Standings

Go to the **Standings** tab in the tournament to see:

- **Teams** — ranked by number of wins, with total speaker points as a tiebreaker.
- **Speakers** — ranked by average speaker points across all rounds.

Standings are updated automatically as rounds are completed and ballots are submitted. Depending on tournament settings, some information may be hidden (debater names, individual scores, lower-ranked speakers).

If the tournament is public, standings are also available at a shareable link that anyone can open without signing in.

---

## 8. Tournament Lifecycle and Statuses

### Tournament Flow Overview

A tournament follows this general flow:

```
1. Organizer creates tournament
         ↓
2. Organizer configures settings (registration dates, team sizes, visibility)
         ↓
3. Institution admins register their institutions → Organizer approves
         ↓
4. Institution admins add participants (debaters + judges) and create teams
         ↓
5. Organizer creates rounds, generates pairings, assigns judges, sets motions
         ↓
6. Organizer publishes round → Participants see pairings and motions
         ↓
7. Organizer starts round → Debates happen (online or IRL)
         ↓
8. Judges enter and submit ballots → Results computed automatically
         ↓
9. Organizer completes round → Standings update
         ↓
   Repeat steps 5–9 for each round
```

### Round Statuses

Rounds move forward through four statuses. **They cannot go backward.**

| Status | Who Can See It | What Happens |
|--------|---------------|--------------|
| **Draft** | Organizer only | Pairings can be created and edited. Motion can be set. The round is invisible to participants. |
| **Published** | Everyone | Participants see pairings, the motion, and info slide. Online debate rooms become available (but debates have not officially started). |
| **In Progress** | Everyone | Debates are live. Judges can enter and submit ballots. |
| **Completed** | Everyone | All results are final. Standings are updated. No further ballot changes unless a modification is approved. |

### Ballot Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | The judge has started the ballot but has not submitted it. Can be edited freely while the round is In Progress. |
| **Submitted** | The ballot is locked. Scores count toward the debate result. To make changes, the judge must request a modification. |

### Institution Registration Statuses

| Status | Meaning |
|--------|---------|
| **Pending** | The institution has requested to join a tournament. Waiting for the organizer to approve. |
| **Approved** | The institution is accepted. Its admins can add participants and create teams. |
| **Rejected** | The organizer declined the registration request. |

---

## 9. Common Problems / FAQ

**Q: I signed up but I don't see any tournaments.**
Check the **Browse Tournaments** page. If a tournament is not public, you will only see it after your institution has been registered and approved by the organizer.

**Q: I can't create teams.**
Make sure:
- Your institution's registration has been **approved** by the tournament organizer.
- The **registration window** is currently open (check the tournament's registration dates).
- You are an **admin** of the institution, not just a member.

**Q: I can't enter my ballot.**
Ballots can only be entered when the round is **In Progress**. If the round is still Published or already Completed, the ballot entry is locked. If you need to edit a submitted ballot in a Completed round, use **Request Modification**.

**Q: My vote does not match the scores.**
WSDC ballots require that your vote matches your scores: the side you vote for must have a higher total score than the other side. If Proposition has more total points, you must vote Proposition (and vice versa).

**Q: I can't join the video call.**
Video calls are only available for **online** tournaments, and only for debates where you are an assigned participant (debater or judge). The round must be **Published** or **In Progress**.

**Q: I was invited to an institution but I don't see the invitation.**
Check the **notification bell** in the top-right corner. Institution invitations appear as notifications that you can accept or decline. Make sure you are signed in with the same email address the invitation was sent to.

**Q: The organizer sent me a judge portal link but it does not work.**
Portal links are unique per judge. Make sure you are using the complete link. If the link has been regenerated by the organizer, the old link may no longer work. Contact the organizer to get a fresh link.

**Q: Who decides the result when judges disagree?**
The debate result is determined by **majority vote** among all judges. If the vote is tied (e.g., in a 2-judge panel), the **chair's** vote decides the outcome.

**Q: Can I undo a round status change?**
No. Round statuses always move forward (Draft → Published → In Progress → Completed) and cannot be reversed.

**Q: How are standings calculated?**
- **Team standings**: Ranked by number of wins. Ties are broken by total speaker points, then alphabetically by team name.
- **Speaker standings**: Ranked by average speaker points across all scored rounds.

**Q: Can I export standings or results?**
Export functionality (CSV, PDF) is not currently available.

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Ballot** | A scoring form completed by a judge for a single debate. Contains scores for all 8 speeches and a vote for the winning side. |
| **Bye** | When there is an odd number of teams, one team is paired without an opponent and receives an automatic win. |
| **Chair** | The lead judge in a debate panel. The chair's vote breaks ties when judges disagree. |
| **Constructive speech** | One of the three main speeches per side (1st, 2nd, 3rd speaker). Scored 60–80 points. |
| **Debate** | A single matchup between a Proposition team and an Opposition team within a round. |
| **Debater** | A tournament participant who speaks in debates as part of a team. |
| **Event mode** | Whether a tournament is **Online** (video calls) or **IRL** (in-person at venues). Set when the tournament is created. |
| **Independent Adjudicator** | A judge who is not affiliated with any institution. Created automatically when the organizer adds a judge without specifying an institution. |
| **Info slide** | Background information provided alongside the motion to give debaters context before the debate. |
| **Institution** | An organization (school, club, university) that registers members and enters teams into tournaments. |
| **IRL** | In Real Life. A tournament mode where debates take place at physical venues. |
| **Judge** | A tournament participant who scores debates by filling in ballots. Also called an adjudicator. |
| **Motion** | The debate topic or proposition being argued. Set by the organizer for each round. For example: "This house would ban social media for minors." |
| **Opposition (Opp)** | The side arguing against the motion. |
| **Organizer** | The person who created the tournament. Has full control over tournament settings, rounds, and results. |
| **Pairing** | The assignment of teams to debates within a round (which Proposition team faces which Opposition team). |
| **Panelist** | A judge on a multi-judge panel who is not the chair. Panelists vote but do not break ties. |
| **Participant** | Any person registered in a tournament, either as a debater or a judge. |
| **Portal** | A special access page for judges that works without a Debatera account. Judges receive a unique link from the organizer. |
| **Proposition (Prop)** | The side arguing in favor of the motion. |
| **Registration window** | The period between the registration open and close dates, during which institutions can sign up and teams can be formed. |
| **Reply speech** | A summary speech given at the end of each side's case. Must be delivered by the 1st or 2nd speaker. Scored 30–40 points. |
| **Round** | A set of simultaneous debates within a tournament. Each round has a motion and pairings. |
| **Speaker points** | The numerical score a debater receives for their individual speech performance. |
| **Standings** | Rankings of teams (by wins) and speakers (by average points) across all completed rounds. |
| **Venue** | A physical location where an IRL debate takes place. |
| **WSDC** | World Schools Debating Championship. The debate format used by Debatera, with 3 constructive speakers + 1 reply speaker per side. |

---

## Currently Unavailable Features

The following features are planned or partially implemented but **not yet available** for regular use:

- **Export to CSV/PDF** — standings and results cannot be exported yet.
- **Advanced pairing algorithms** — only random pairing is available; Swiss and power pairing options are defined but not yet active.
- **Elimination / playoff rounds** — all rounds are preliminary rounds; bracket-style elimination is not supported.
- **Judge feedback forms** — judges cannot receive structured feedback from debaters or organizers.
- **Team chat** — no in-app messaging between team members.
- **Points of Information (POI) tracking** — POIs during debates are not tracked by the system.
- **Hybrid tournaments** — a tournament is either fully Online or fully IRL; mixing modes is not supported.
- **Multiple debate formats** — only WSDC is currently supported.
- **Search** — the search bar in the navigation is present but has limited functionality.

---

*Need help? Found a bug? Report issues at the project repository.*
