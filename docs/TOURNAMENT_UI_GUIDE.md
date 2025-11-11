# Tournament Institution Registration UI - Implementation Guide

## Overview

This document describes the UI implementation for the tournament institution registration system. The UI provides a clear, step-by-step flow for institutions to register and participate in tournaments.

## Components Created/Modified

### 1. New Component: TournamentInstitutionRegistration.tsx

**Location:** `src/components/tournaments/TournamentInstitutionRegistration.tsx`

**Purpose:** Main component for managing institution registration for tournaments.

**Features:**
- **Visual Registration Flow**: Shows 3-step process with status indicators
- **Institution Registration Card**: Register/unregister institution with one click
- **Registered Institutions Table**: View all participating institutions
- **Quick Stats Dashboard**: Shows counts of registered institutions, members, and teams
- **Status Indicators**: Clear badges showing registration status
- **Confirmation Dialog**: Safe unregistration with warnings
- **Error Handling**: Clear error messages and alerts

**Key States:**
- Shows different views for:
  - Non-members (need to join institution)
  - Regular members (need coach access)
  - Coaches (full registration controls)
- Registration status (registered/not registered)
- Loading states with spinners
- Error states with descriptive messages

### 2. Updated: Tournament Detail Page

**File:** `src/app/(main)/(home)/tournaments/[id]/page.tsx`

**Changes:**
- Added new "Registration" tab as the first tab
- Reordered tabs to show registration flow:
  1. Registration (new)
  2. My Participants
  3. Teams
  4. All Participants
- Imported and integrated TournamentInstitutionRegistration component

### 3. Updated: TournamentMyParticipants Component

**File:** `src/components/tournaments/TournamentMyParticipants.tsx`

**Changes:**
- Added institution registration check
- Shows loading spinner while checking registration
- Displays error alert if institution not registered
- Blocks user registration until institution is registered
- Directs users to Registration tab if needed

**New Dependencies:**
- Alert component for showing registration requirements
- Loading state management

### 4. Updated: TournamentTeams Component

**File:** `src/components/tournaments/TournamentTeams.tsx`

**Changes:**
- Added registered institutions fetching
- Filter institution dropdown to show only registered institutions
- Shows warning alert when no institutions are registered
- Updated placeholder text to indicate registration requirement
- Added loading state for institution check

## UI Flow

### Step 1: Registration Tab

When a coach visits a tournament:

1. **Visual Flow Guide**
   - 3-step visual process showing:
     - Register Institution (highlighted if pending)
     - Register Users (locked until step 1)
     - Create Teams (locked until step 1)
   - Progress indicators show completed steps

2. **Quick Stats Cards**
   - Registered Institutions count
   - Total Members across all institutions
   - Total Teams created

3. **Institution Registration Card**
   - Shows current institution name
   - Registration status badge (Registered/Not Registered)
   - Action button (Register/Unregister)
   - Loading states during API calls
   - Error messages if registration fails

4. **Registered Institutions Table**
   - Lists all registered institutions
   - Shows member and team counts
   - Highlights user's own institution
   - Registration date for each institution

### Step 2: My Participants Tab

After institution is registered:

1. **Access Check**
   - Verifies institution registration
   - Shows appropriate message based on user role
   - Blocks access with clear instructions if not registered

2. **User Registration**
   - Only available after institution registration
   - Bulk user registration with role selection
   - Visual feedback for registered vs unregistered users
   - Save changes button

### Step 3: Teams Tab

After users are registered:

1. **Institution Filter**
   - Only shows registered institutions in dropdown
   - Clear message if no institutions registered
   - Warning alert at top if prerequisites not met

2. **Team Creation**
   - Create teams for registered institutions
   - Drag-and-drop team assignment
   - Team validation (2-5 members)

## Visual Design

### Color Scheme

- **Primary (Cyan)**: Action buttons, active states
- **Success (Green)**: Completed steps, registered status
- **Warning (Amber)**: Missing prerequisites, locked states
- **Destructive (Red)**: Errors, unregister actions
- **Muted**: Disabled states, placeholders

### Icons

- **Building2**: Institution/organization
- **CheckCircle2**: Success/completed
- **XCircle**: Not registered/failed
- **AlertCircle**: Warnings/information
- **Users**: Members/participants
- **Trophy**: Teams
- **Loader2**: Loading states
- **ArrowRight**: Flow progression

### Layout

- **Cards**: Used for distinct sections (registration, stats, list)
- **Alerts**: Important information and warnings
- **Badges**: Status indicators
- **Tables**: Data lists (registered institutions)
- **Dialogs**: Confirmations (unregister)

## User Experience Features

### 1. Progressive Disclosure

- Shows relevant information based on user state
- Hides locked features with clear unlock instructions
- Progressive flow guides users through steps

### 2. Clear Status Indicators

- Visual badges for registration status
- Completed checkmarks on flow diagram
- Color-coded states (green=done, gray=locked)

### 3. Helpful Error Messages

- Specific error text for each failure case
- Actionable instructions (e.g., "Go to Registration tab")
- Inline alerts for contextual warnings

### 4. Loading States

- Spinners for async operations
- Disabled buttons during operations
- Loading text (e.g., "Registering...")

### 5. Confirmation Dialogs

- Unregister requires confirmation
- Shows warnings about consequences
- Cancel option always available

## Responsive Design

### Desktop (md and up)

- Multi-column layouts for stats (3 columns)
- Horizontal flow diagram with arrows
- Side-by-side action buttons

### Mobile

- Single column layouts
- Vertical flow diagram
- Stacked buttons
- Responsive tables with horizontal scroll

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management in dialogs
- Color contrast compliance
- Loading states announced

## Error Handling

### Common Error Scenarios

1. **Not a coach**
   - Shows message: "Only coaches can register institutions"
   - Suggests contacting institution admin

2. **Institution not registered**
   - Shows alert: "Institution must be registered first"
   - Directs to Registration tab

3. **Already registered**
   - Returns 409 error
   - Shows toast: "Institution is already registered"

4. **Has teams (unregister)**
   - Returns 400 error
   - Shows: "Cannot unregister with existing teams"
   - Suggests deleting teams first

5. **Roster frozen**
   - Returns 423 error
   - Shows: "Tournament roster is frozen"
   - Indicates admin override needed

## Testing Checklist

### Registration Tab

- [ ] Visual flow updates when institution registers
- [ ] Stats cards show correct counts
- [ ] Registration button works for coaches
- [ ] Unregister button requires confirmation
- [ ] Registered institutions table populates correctly
- [ ] User's institution is highlighted in table
- [ ] Loading states show during operations
- [ ] Error messages display properly
- [ ] Non-coaches see appropriate message

### My Participants Tab

- [ ] Shows loading while checking registration
- [ ] Displays error if institution not registered
- [ ] Allows user registration after institution registered
- [ ] Directs to Registration tab when needed

### Teams Tab

- [ ] Shows warning if no institutions registered
- [ ] Institution dropdown only shows registered institutions
- [ ] Team creation requires registered institution
- [ ] Error messages are clear

### General

- [ ] Responsive on mobile devices
- [ ] Dark mode works correctly
- [ ] Keyboard navigation works
- [ ] Toasts appear for all actions
- [ ] Page refreshes data after actions

## Future Enhancements

Potential improvements:

1. **Bulk Registration**: Register multiple institutions at once (for admins)
2. **Registration Approval**: Require admin approval for institution registration
3. **Notifications**: Email/in-app notifications when institution registers
4. **Analytics**: Show registration timeline and trends
5. **Export**: Download list of registered institutions
6. **Search/Filter**: Search institutions by name
7. **Institution Details Modal**: Click institution name for more details
8. **Registration History**: Track registration/unregistration history
9. **Capacity Limits**: Show remaining spots if tournament has max institutions
10. **Waitlist**: Allow institutions to join waitlist when full

## Files Summary

### Created
- `src/components/tournaments/TournamentInstitutionRegistration.tsx`

### Modified
- `src/app/(main)/(home)/tournaments/[id]/page.tsx`
- `src/components/tournaments/TournamentMyParticipants.tsx`
- `src/components/tournaments/TournamentTeams.tsx`

### Dependencies Used
- shadcn/ui components: Card, Button, Alert, Badge, Table, Dialog, etc.
- lucide-react icons
- sonner for toasts
- React hooks for state management

## Support

For issues or questions:
1. Check the implementation guide
2. Review component documentation
3. Test with the checklist above
4. Check browser console for errors
