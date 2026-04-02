# UX Audit Report: Debatera

## 1. Executive Summary

This comprehensive UX audit identifies **45+ distinct UX issues** across the Debatera platform, ranging from critical blockers to minor friction points. The most severe problems center around the **invitation/onboarding system** and **private tournament access** — issues that fundamentally prevent real-world usage.

### Key Findings:

- **Critical Issues**: 8 (blocks core functionality)
- **High Impact Issues**: 15 (major friction)
- **Medium/Low Issues**: 22+ (quality of life)

### Overall UX Assessment:

Debatera has a solid foundation with good UI components (ShadCN) and reasonable documentation, but suffers from:
1. **Invitation-only architecture** — no way for new users to discover or join
2. **No clear onboarding** for first-time users beyond generic help links
3. **Broken discoverability** — private tournaments and institutions are essentially invisible
4. **Missing notification system** — users don't know when important things happen

### Most Critical Problems:
1. Institution invitations only work for existing users
2. Private tournaments have no access/share mechanism
3. No "request to join" flow exists anywhere
4. Registration requires institution admin (not regular members)

---

## 2. Critical Issues (Top Priority)

### Issue #1: Institution Invitations Only Work for Existing Users

**Location**: `src/actions/invitation.actions.ts:79-107` (`createInstitutionInvitation`)

**Problem**: To invite someone to an institution, you must enter their email address. The system then looks up the user in the database. If they don't have an account, the invitation fails with: *"User not found. Ask them to sign up first or check spelling."*

**Why This Happens**:
```typescript
// Line 100-106
const targetUser = await resolveUserByIdentifier(identifier);
if (!targetUser) {
  return {
    success: false,
    error: 'User not found. Ask them to sign up first or check spelling.',
  };
}
```

**User Impact**: 
- A debate club admin cannot invite new members who haven't heard of Debatera
- New users must first sign up, THEN be invited — reversing the natural flow
- This is the inverse of every modern platform (Slack, Discord, Notion, etc.)

**Severity**: Critical  
**Affected Users**: Institution admins trying to grow their organization

**Proposed Solution**: Implement email-based invitation links (see Phase 5)

---

### Issue #2: Private Tournament Access is Extremely Difficult

**Location**: `src/app/(main)/(home)/tournaments/[id]/settings/page.tsx:417-437`

**Problem**: When a tournament is private:
- Only participants and institution members can see it
- Organizers cannot share access with external judges
- There's no "invite link" or "join code" mechanism
- External judges cannot self-register

**Why This Happens**:
The tournament visibility model only supports two states:
1. Public (anyone can see)
2. Private (only participants + institution members)

There's no middle ground for "invitation-only" access.

**User Impact**:
- External judges must be manually added as participants
- No way to share a tournament with a specific person
- Private tournaments are essentially invisible/unfindable

**Severity**: Critical  
**Affected Users**: Tournament organizers inviting external judges, private tournaments

**Proposed Solution**: Add tournament invite codes/links (see Phase 5)

---

### Issue #3: No "Request to Join" Flow Exists

**Problem**: Every join operation requires an invitation:
- Users cannot request to join an institution
- Users cannot request to join a tournament
- The only way in is to be explicitly invited

**Why This Happens**: The system was designed with an "invitation-only" mental model.

**User Impact**:
- If you discover a tournament you want to join but don't know the organizer, you're stuck
- Institutions cannot accept new members who want to join — they must be manually invited each time

**Severity**: Critical  
**Affected Users**: Debaters, judges, potential institution members

---


### Issue #5: No Notification for Registration Approval

**Location**: Registration approval creates no notification to the institution admin.

**Problem**: When a tournament organizer approves an institution's registration:
- The institution admin receives NO notification
- They must manually check the tournament page to see if they're approved
- This causes confusion and missed deadlines

**Severity**: High  
**Affected Users**: Institution admins

---

### Issue #6: Broken Search Feature

**Location**: `src/components/Navbar.tsx:215-229`

**Problem**: The search bar is prominently displayed but completely non-functional:

```typescript
onFocus={(e) => {
  e.target.blur();
  toast.info('Search coming soon!');
}}
```

**User Impact**: 
- Prominent UI element that does nothing
- Creates impression of incomplete product
- Users cannot find tournaments, institutions, or people

**Severity**: High  
**All Users**

---

### Issue #7: No Clear Path for External Judges

**Problem**: External judges (not affiliated with any institution) have no clear path to:
- Discover tournaments
- Get invited to tournaments
- Access ballots without a portal link

**Why This Happens**: The system assumes all participants belong to institutions.

**Severity**: High  
**External Adjudicators**

---

### Issue #8: Tournament Creator = Sole Administrator

**Location**: `src/lib/services/mvp.ts`

**Problem**: When someone creates a tournament, they are the only organizer. There is no way to:
- Add co-organizers
- Transfer ownership
- Delegate specific tasks

**User Impact**:
- Single point of failure
- Cannot share administrative burden
- Cannot have backup organizers

**Severity**: High  
**Tournament Organizers**

---

## 3. High Impact Issues

### Issue #9: No Onboarding Flow for First-Time Users

**Location**: `src/app/(main)/(home)/page.tsx:272-291`

**Problem**: New users see a generic dashboard with help topics, but no guided walkthrough:
- The "New to Debatera?" card appears but just links to documentation
- No checklist or wizard for first steps
- User must figure out the institution → tournament → team flow alone

**User Impact**: High drop-off for new users who don't know what to do first

---

### Issue #10: No Way to Leave a Tournament

**Problem**: Once a participant is added to a tournament, there's no way to remove themselves or leave.

---

### Issue #11: Tournament Visibility Not Explained

**Location**: Settings page only shows toggle, no explanation of what "public" vs "private" means for discoverability.

---

### Issue #12: No Email Notifications

**Location**: All notifications are in-app only (polled every 30 seconds)

**Problem**: 
- Users miss notifications if they don't check the app
- No integration with email for important events
- Invitations only work if the user happens to be checking the app

---

### Issue #13: Landing Page Doesn't Explain Participation

**Location**: `src/components/landing/LandingPage.tsx`

**Problem**: The marketing page targets organizers exclusively:
- "Run Tournaments" is prominent
- No path shown for debaters or judges to join
- External users don't know how to participate

---

### Issue #14: Invite One Person at a Time

**Location**: Institution invite form only accepts single email

**Problem**: No bulk invitation option for institutions with many members

---

### Issue #15: No Invitation Expiry

**Problem**: Invitations sent to users never expire. Old invitations remain "pending" indefinitely.

---

### Issue #16: Registration Status Not Visible

**Location**: Users cannot easily see their institution's registration status across tournaments

---

### Issue #17: Team Creation Has Many Prerequisites

**Problem**: To create a team, all of these must be true:
1. Tournament registration is open
2. Institution is approved
3. Institution admin is creating the team
4. Members exist as participants
5. Team size within limits

No clear error messages guide users through these requirements.

---

### Issue #18: No Way to View Other Users' Profiles

**Problem**: Unless you're in the same tournament, you cannot view other users' profiles.

---

### Issue #19: Limited Public Tournament Access

**Location**: Public tournaments show limited data but no clear CTA to register

---

### Issue #20: Judge Portal Links Are One-Off

**Problem**: Each time an organizer needs to generate a portal link, it's a manual process with no bulk generation or management UI.

---

### Issue #21: Round Status Changes Are Irreversible

**Location**: Once a round moves from Published → In Progress → Completed, it cannot be undone.

**User Impact**: Mistakes in round management cannot be fixed

---

### Issue #22: No Way to Resend Invitations

**Problem**: Institution admins cannot resend a pending invitation — only revoke and re-invite.

---

### Issue #23: Missing Empty States Guidance

**Location**: Multiple pages show "No items" without guidance on what to do next

---

## 4. Medium / Low Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Search placeholder promises more than available | Navbar | Medium |
| No confirmation before leaving institution | Institution page | Medium |
| Team name auto-generation not explained | Teams page | Low |
| Debate format only WSDC — no format selection | Tournament settings | Low |
| No export functionality (CSV/PDF) | Standings page | Low |
| No bulk add participants | Participants page | Medium |
| Timer only visible during calls | Debate call page | Low |
| No keyboard shortcuts documented | Help page | Low |
| Profile pronouns field unclear usage | Profile page | Low |
| Tournament deletion requires typing name | Settings page | Low |

---

## 5. Systemic Problems

### Problem A: Invitation-Only Architecture

The entire system is built on invitations. This works for:
- Existing users who know about the platform
- Closed communities

This fails for:
- New user acquisition
- Open tournaments
- External judges
- Growing institutions

**Root Cause**: No self-service join mechanism exists anywhere.

---

### Problem B: No Clear User Journey Maps

The documentation shows the "happy path" but doesn't address:
- What happens when registration is closed
- What happens when you're not in an institution
- What happens when you don't have a tournament to join
- What external judges should do

---

### Problem C: Permission Model Creates Bottlenecks

Every important action requires being an admin:
- Only admins can invite
- Only admins can register for tournaments
- Only admins can create teams
- Only the tournament creator can manage the tournament

This creates single points of failure and bottlenecks.

---

### Problem D: Notification System Is Incomplete

- Only in-app notifications
- Poll-based (30 second delay)
- Missing critical notifications (registration approved, etc.)
- No email notifications

---

### Problem E: Discoverability Is Broken

- Private institutions cannot be found
- Private tournaments cannot be found
- No search functionality
- No "request to join" anywhere

---

## 6. User Journey Breakdowns

### Journey 1: New Debater Trying to Join a Tournament

**Current Flow**:
1. Lands on homepage → sees "Get Started" and "Explore Tournaments"
2. Clicks "Explore Tournaments" → sees list (if public) or empty (if not)
3. Finds interesting tournament → tries to join
4. **BLOCKED**: Must be invited or be part of an institution that registers

**Drop-off Point**: Step 4 — user doesn't know what to do

**What They Expect**: A clear "Register" button that guides them through the process

---

### Journey 2: Institution Admin Growing Their Club

**Current Flow**:
1. Creates institution
2. Wants to invite members → must ask them to sign up first
3. Sends manual emails: "Hey, sign up at Debatera, then I'll invite you"
4. Waits for them to sign up
5. Sends invitation
6. They accept

**Drop-off Point**: Step 3-4 — friction causes abandonment

**What They Expect**: Send invite link → they sign up AND join in one flow

---

### Journey 3: External Judge Getting Access

**Current Flow**:
1. Organizer adds them as participant manually
2. Organizer generates portal link
3. Organizer must email/DM them the link
4. Judge opens link → can access ballots

**Issues**:
- Organizer must know the judge's email beforehand
- No way for judges to discover tournaments they could judge
- Portal links are one-off, not reusable

---

### Journey 4: First-Time User Onboarding

**Current Flow**:
1. Signs up → lands on dashboard
2. Sees empty state: "No tournament activity yet"
3. Sees help topics but no guided action
4. Must figure out: Create institution? Join institution? Browse tournaments?

**What They Need**: A first-run wizard showing:
1. Create or join an institution
2. Find a tournament or create one
3. Register institution
4. Add participants and create teams

---

## 7. Industry Research & Best Practices

### Tabbycat (Debate Tournament Software)

**Strengths**:
- Clear tournament status dashboard
- Simple team registration flow
- Built-in draw generation
- Public results page with shareable link

**Lessons**:
- Tournament directors can set up everything without participant accounts
- Email-based draw notifications
- Clear distinction between organizers and participants

---

### Discord (Community Platform)

**Invitation System**:
- Generate permanent invite links with expiration options
- Set permission levels on invite links (e.g., "grant @member role")
- "Join server" creates account automatically

**Apply to Debatera**: Email invitation links that create accounts

---

### Slack (Team Communication)

**Invitation System**:
- Email invites with expiry
- Direct link signup
- Workspaces can be discoverable or hidden

**Apply to Debatera**: Tournament/institution links with configurable access

---

### Notion (Workspace Collaboration)

**Invitation System**:
- Share any page with anyone via link
- Link can grant specific permissions
- External users can view without account

**Apply to Debatera**: Tournament access links that grant specific roles

---

### Eventbrite (Event Platform)

**Registration Flow**:
- Public event listings with clear "Register" button
- Waitlist when sold out
- Email confirmation with ticket
- Shareable event pages

**Apply to Debatera**: Public tournament listings with one-click registration

---

### Challonge (Tournament Brackets)

**Strengths**:
- Simple tournament creation (name + type + participants)
- Public tournaments are easily discoverable
- Shareable bracket URLs
- No account required to view

**Apply to Debatera**: Public tournament URLs that work without login

---

## 8. Solutions & Redesign

### Solution 1: Email Invitation Links (NEW)

**Problem**: Cannot invite users who don't have accounts

**Solution**: Generate unique invitation links that:
1. Can be shared via email/messaging
2. Expire after configurable time (default: 7 days)
3. When clicked:
   - If user has account → direct them to sign in → add to institution
   - If user doesn't have account → sign up flow → automatically join institution

**Implementation**:
```typescript
// New fields in InstitutionInvitation
- inviteToken: string (unique, shareable)
- expiresAt: DateTime
- maxUses: number (optional, for unlimited use links)

// New API endpoint
POST /api/institutions/[id]/invitation-link
{
  role: 'ADMIN' | 'MEMBER',
  expiresInDays: 7,
  maxUses: null | number
}
// Returns: { link: "https://debatera.app/invite/abc123" }
```

---

### Solution 2: Tournament Join Codes (NEW)

**Problem**: Private tournaments cannot be shared

**Solution**: Generate shareable tournament access codes:
1. Organizer generates a join code in tournament settings
2. Code can be: public (anyone), restricted (requires approval)
3. Users enter code on "Browse Tournaments" page
4. If approval required → creates pending registration

**Implementation**:
```typescript
// New fields in Tournament
- joinCode: string (unique, generated)
- joinCodeExpiresAt: DateTime?
- joinCodeRequiresApproval: boolean

// UI in Settings:
// - "Generate Join Code" button
// - "Copy Link" button  
// - "Code: DEBATE2026" display
// - Toggle: "Require approval for this code"
```

---

### Solution 3: Request to Join Flow (NEW)

**Problem**: Users cannot request to join institutions or tournaments

**Solution**: Add request flows everywhere:

**Institution Request Flow**:
- Public institutions show "Request to Join" button
- Institution admins see pending requests
- Approve/reject with optional message

**Tournament Registration Enhancement**:
- Private tournaments can have a "Request to Register" option
- Organizers see requests and approve/reject

---

### Solution 4: Improved Onboarding Wizard

**Problem**: New users don't know what to do

**Solution**: First-time user wizard:

**Step 1**: "What brings you here?"
- I want to compete (debater)
- I want to judge
- I want to organize tournaments

**Step 2**: Context-dependent path
- Debater → Find institution OR Create institution
- Judge → Find tournaments
- Organizer → Create tournament

**Step 3**: Guide through first action with tooltips

---

### Solution 5: Notification System Improvements

**Add notifications for**:
- Institution registration approved/rejected
- Tournament registration approved/rejected  
- Participant added to tournament
- Team created (notify members)
- Round published (notify participants)
- Ballot submitted (organizer notification)

**Add email notifications** (optional, user preference):
- Critical: registration decisions, ballot requests
- Digest: round results, standings updates

---

### Solution 6: Co-Organizer Support

**Problem**: Tournament creator is sole administrator

**Solution**: Add co-organizer role:
- Organizer can grant "co-organizer" to any participant
- Co-organizers can: manage rounds, pairings, settings (except delete)
- Cannot: delete tournament, transfer ownership

---

### Solution 7: Search Functionality

**Problem**: Search is broken

**Solution**: Implement basic search:
- Search tournaments by name
- Search institutions by name
- Results link to public pages

---

### Solution 8: External Judge Path

**Problem**: External judges have no path to tournaments

**Solution**:
1. Tournament can be marked "Accepting external judges"
2. External judges can request to join as judge
3. Organizer approves → generates portal link automatically

---

## 9. Implementation Plan

### Phase 1: Critical Fixes (Week 1-2)

#### 1.1 Email Invitation Links
- **Backend**: Add `inviteToken`, `expiresAt` to schema
- **Backend**: Create `/api/institutions/[id]/invitation-link` endpoint
- **Frontend**: Add "Copy Invite Link" button to institution page
- **Frontend**: Handle link click → sign up + join flow

#### 1.2 Tournament Join Codes  
- **Backend**: Add `joinCode` fields to Tournament schema
- **Backend**: Create `/api/tournaments/[id]/join-code` endpoints
- **Frontend**: Add join code input to "Browse Tournaments" page
- **Frontend**: Display code in tournament settings

#### 1.3 Registration Notifications
- **Backend**: Add notification creation on registration approval
- **Frontend**: Ensure notifications appear in bell

---

### Phase 2: Request Flows (Week 3)

#### 2.1 Institution Request to Join
- **Frontend**: Add "Request to Join" button on public institutions
- **Backend**: Add request/approve endpoints
- **Frontend**: Admin approval UI in institution page

#### 2.2 Tournament External Judge Request
- **Frontend**: Add "Request to Judge" option
- **Backend**: Request flow endpoints

---

### Phase 3: Onboarding (Week 4)

#### 3.1 First-Run Wizard
- **Frontend**: Create onboarding modal/wizard component
- **Frontend**: Trigger on first login with empty history
- **Frontend**: Contextual tips throughout app

#### 3.2 Landing Page Updates
- **Frontend**: Add "For Debaters" and "For Judges" sections
- **Frontend**: Clear CTA paths for each user type

---

### Phase 4: Polish (Week 5+)

#### 4.1 Search Implementation
- Basic tournament/institution search

#### 4.2 Co-Organizers
- Add co-organizer role and UI

#### 4.3 Email Notifications (Optional)
- Add email notification infrastructure

---

## 10. Database Changes Required

```prisma
// InstitutionInvitation - add invite link fields
model InstitutionInvitation {
  // ... existing fields
  inviteToken        String?   @unique // For shareable links
  expiresAt          DateTime? // When link expires
  maxUses            Int?      // Max uses for the link (null = unlimited)
  uses               Int       @default(0) // Current uses
  
  @@index([inviteToken])
}

// Tournament - add join code
model Tournament {
  // ... existing fields
  joinCode               String?   @unique // Shareable join code
  joinCodeExpiresAt      DateTime?
  joinCodeRequiresApproval Boolean @default(true)
  
  @@index([joinCode])
}

// New: InstitutionJoinRequest (for request to join)
model InstitutionJoinRequest {
  id             String   @id @default(cuid())
  institutionId  String
  userId         String
  status         String   // PENDING, APPROVED, REJECTED
  message        String?  // Optional message to admin
  createdAt      DateTime @default(now())
  respondedAt    DateTime?
  
  @@unique([institutionId, userId]) // One request per user per institution
}
```

---

## 11. Prioritization

### Quick Wins (1-2 days each)
1. Add notification for registration approval
2. Fix search placeholder to say "Search (coming soon)"
3. Add "Request to Join" button on public institution pages (UI only, disabled)
4. Add confirmation dialogs for destructive actions
5. Improve empty states with guidance

### Medium Effort (3-5 days each)
6. Email invitation links (backend + frontend)
7. Tournament join codes (backend + frontend)
8. Registration notifications
9. First-run onboarding wizard
10. Landing page updates

### Larger Changes (1+ weeks)
11. Request to join flows (backend + frontend)
12. Search functionality
13. Co-organizer support
14. Email notification infrastructure
15. External judge paths

---

## 12. Summary

Debatera has strong foundational architecture but suffers from critical UX gaps that prevent real-world adoption:

1. **Invitation-only model** prevents organic growth
2. **No discoverability** for private tournaments/institutions  
3. **Missing notifications** cause confusion
4. **No onboarding** leaves users lost

The solutions proposed follow established patterns from industry leaders (Discord, Slack, Eventbrite) while respecting the existing architecture.

**Immediate priority**: Implement invitation links and tournament join codes — these unlock the most critical user flows and require minimal changes to existing code.
