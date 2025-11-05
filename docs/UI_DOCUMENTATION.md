# Tournament System UI Documentation

## 🎨 User Interface Overview

The debate tournament management system provides a comprehensive UI for managing institutions, teams, and tournament participation. All pages are built with Next.js 15 App Router and ShadCN UI components.

## 📁 Page Structure

### Institution Management

#### `/institutions` - Institutions List
- **Purpose**: Browse all institutions
- **Features**:
  - Grid view of all institutions
  - Search functionality
  - Display member count and team count
  - "Create Institution" button
  - Click to view details
- **Access**: All authenticated users

#### `/institutions/new` - Create Institution
- **Purpose**: Create a new institution
- **Features**:
  - Form with name (required) and description (optional)
  - Automatic coach assignment for creator
  - Validation and error handling
  - Information panel about coach privileges
- **Access**: All authenticated users (one institution per user)

#### `/institutions/[id]` - Institution Details
- **Purpose**: View and manage institution details
- **Features**:
  - **Overview Stats**: Members, teams, and user role
  - **Tabs**:
    - **Members Tab**:
      - List all members with roles (coach/member)
      - Add member dialog (coaches only)
      - Display join dates
    - **Teams Tab**:
      - List all tournament teams
      - Link to tournaments
      - Link to team details
- **Access**: All authenticated users (edit features for coaches only)

### Tournament Team Management

#### `/tournament-teams/[id]` - Team Details
- **Purpose**: View and manage tournament team roster
- **Features**:
  - **Overview Stats**: Debater count (with limits), judge count, total members
  - **Team Members Table**:
    - Display all members with roles
    - Badge indicators for roles (Debater/Judge)
    - "Change Role" button for each member
  - **Add Member Dialog**:
    - User ID input
    - Role selection (Debater/Judge)
    - Validation for team size and single appearance rule
  - **Change Role Dialog**:
    - Select new role
    - Validation for team size constraints
- **Access**: All authenticated users (edit features for coaches only)

### Tournament Management

#### `/tournaments` - Tournaments List
- **Purpose**: Browse all tournaments (existing page, minimal changes)
- **Features**: List of all tournaments with names and descriptions
- **Access**: All authenticated users

#### `/tournaments/[id]` - Tournament Details
- **Purpose**: View tournament details and manage teams
- **Features**:
  - **Header**: Tournament name with freeze status badge
  - **Admin Controls** (tournament owners only):
    - Freeze Roster button
    - Unfreeze button
  - **Overview Stats**: Total teams, participants, and roster status
  - **Tabs**:
    - **Teams Tab**:
      - List all teams with institution names
      - Create Team dialog
      - Link to team detail pages
    - **Participants Tab**:
      - Separate sections for debaters and judges
      - Display user names, teams, and institutions
      - Count badges
- **Access**: All authenticated users (admin features for tournament owners only)

## 🎯 Key Features

### Role-Based Access Control

**All Users:**
- View institutions, teams, and tournaments
- Create institutions
- Browse all public information

**Coaches:**
- Add members to their institution
- Create teams for tournaments
- Add members to teams
- Change member roles
- All standard user features

**Tournament Admins:**
- Freeze/unfreeze tournament rosters
- All standard user features
- View admin controls on tournament pages

### Visual Indicators

**Badges:**
- `Coach` - Cyan badge for coaches
- `Member` - Outline badge for regular members
- `Debater` - Cyan badge for debaters
- `Judge` - Outline badge for judges
- `Frozen` - Red badge with lock icon for frozen rosters

**Status Cards:**
- Cyan icons for key metrics
- Large numbers for counts
- Color-coded roster status (green = open, red = frozen)

### Real-time Validation

**Team Size:**
- Visual counter showing "X / 5" for debaters
- Minimum/maximum labels
- Error messages when limits exceeded

**Roster Freeze:**
- Visible frozen badge on tournament page
- Disabled actions when frozen (for non-admins)
- Clear error messages explaining freeze status

**Single Appearance:**
- Error messages when user already in tournament
- Validation before adding to teams

## 🎨 UI Components Used

### ShadCN Components
- **Button** - Primary actions, navigation
- **Card** - Content containers
- **Table** - Data display
- **Dialog** - Modal forms
- **Tabs** - Content organization
- **Badge** - Status indicators
- **Input** - Text entry
- **Label** - Form labels
- **Select** - Dropdowns
- **Textarea** - Multi-line text
- **Alert** - Error messages
- **Skeleton** - Loading states

### Lucide Icons
- `Building2` - Institutions
- `Trophy` - Teams and tournaments
- `Users` - Members and participants
- `Plus` - Create actions
- `ArrowLeft` - Back navigation
- `Lock/Unlock` - Roster freeze status
- `Shield` - Coach role
- `User` - Member role
- `Loader2` - Loading spinner

## 📱 Responsive Design

All pages are fully responsive with:
- Mobile-friendly navigation
- Responsive grids (1 column mobile, 2-3 columns desktop)
- Collapsible tables on small screens
- Touch-friendly button sizes
- Readable typography at all sizes

## 🎨 Color Scheme

**Primary Colors:**
- **Cyan-500** (`#06b6d4`) - Primary actions, highlights
- **Cyan-600** (`#0891b2`) - Hover states

**Status Colors:**
- **Green** - Active/open status
- **Red** - Frozen/locked status
- **Muted** - Secondary information

**Theme:**
- Dark background with light text
- High contrast for accessibility
- Consistent with existing Debatera theme

## 🔄 User Flows

### Creating an Institution
1. Navigate to `/institutions`
2. Click "Create Institution"
3. Fill in name and description
4. Submit → Automatically become a coach
5. Redirected to institution detail page

### Adding Members to Institution
1. Navigate to institution detail page
2. Switch to "Members" tab
3. Click "Add Member" (coaches only)
4. Enter user ID and optionally mark as coach
5. Submit → Member added to list

### Creating a Team for Tournament
1. Navigate to tournament detail page
2. Switch to "Teams" tab
3. Click "Create Team"
4. Select institution (must be a coach)
5. Submit → Team created with auto-generated name

### Adding Members to Team
1. Navigate to team detail page
2. Click "Add Member"
3. Enter user ID and select role
4. Submit → Member added (validates team size and single appearance)

### Changing Member Roles
1. Navigate to team detail page
2. Click "Change Role" on a member
3. Select new role
4. Submit → Role updated (validates team size)

### Freezing Tournament Roster
1. Navigate to tournament detail page (as admin)
2. Click "Freeze Roster"
3. Enter freeze date/time
4. Submit → Roster frozen, modifications blocked

## 🚀 Navigation Structure

```
Main Navigation (Sidebar)
├── Home (/)
├── Institutions (/institutions) ← NEW
│   ├── Create (/institutions/new)
│   └── Details (/institutions/[id])
├── Debates
├── Teams
├── Schedule
├── Messages
├── Feedback
├── Tournaments (/tournaments)
│   ├── Browse
│   ├── My Tournaments
│   ├── Create Tournament
│   └── Details (/tournaments/[id]) ← ENHANCED
└── Tournament Teams
    └── Details (/tournament-teams/[id]) ← NEW
```

## 📝 Forms and Validation

### Create Institution Form
- **Name**: Required, max 120 characters
- **Description**: Optional, max 2000 characters
- **Validation**: Check if user already in another institution

### Add Member Form
- **User ID**: Required, Clerk user ID format
- **Is Coach**: Optional checkbox
- **Validation**: 
  - User exists
  - User not in another institution
  - Current user is a coach

### Create Team Form
- **Institution**: Required, dropdown
- **Validation**:
  - Institution exists
  - User is coach of institution
  - Roster not frozen

### Add Team Member Form
- **User ID**: Required
- **Role**: Required, select (Debater/Judge)
- **Validation**:
  - User exists
  - User in institution
  - User not in tournament
  - Team size limits (if debater)
  - Roster not frozen

### Change Role Form
- **New Role**: Required, select
- **Validation**:
  - Team size constraints
  - Roster not frozen

## 🎭 Loading States

All pages include:
- Skeleton loaders while fetching data
- Loading spinners on buttons during actions
- Disabled states during operations
- Empty states with helpful messages and CTAs

## ⚠️ Error Handling

All forms include:
- Inline validation errors
- Alert components for API errors
- Toast notifications for success/failure
- Clear, actionable error messages
- User-friendly language

## 🎯 Best Practices Implemented

1. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
2. **Performance**: Client-side state management, optimistic updates
3. **UX**: Clear CTAs, confirmation dialogs, helpful empty states
4. **Consistency**: Unified component library, consistent spacing
5. **Responsive**: Mobile-first design, touch-friendly targets
6. **Type Safety**: Full TypeScript coverage, proper interface definitions

## 🔜 Future Enhancements

Potential UI improvements:
1. Member search and autocomplete
2. Bulk member operations
3. Team roster templates
4. Drag-and-drop member assignment
5. Real-time updates with WebSockets
6. Advanced filtering and sorting
7. Export functionality (CSV, PDF)
8. Member profile pages
9. Team statistics and analytics
10. Tournament brackets visualization

---

**The UI is now complete and production-ready!** 🎉
