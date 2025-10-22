# Tournament System UI Guide

This guide provides an overview of the tournament system user interface.

## Pages Overview

### 1. Tournaments List (`/tournaments`)

**Layout:**
- Header with "Tournaments" title and "Create Tournament" button
- Grid layout (3 columns on desktop, responsive)
- Each tournament card shows:
  - Tournament name (clickable)
  - Description
  - "Verified" badge if applicable
  - Team count with Users icon
  - Round count with Calendar icon
  - Creator username with Trophy icon

**Colors:**
- Background: Dark blue gradient (#0b1530 → #0e1a3f)
- Cards: White with 5% opacity, glassmorphism effect
- Borders: White with 10% opacity
- Hover: Cyan border (#06b6d4 at 50% opacity), brighter background
- Verified badge: Cyan background with 20% opacity, cyan text
- Primary button: Solid cyan (#06b6d4) with black text

**Empty State:**
- Trophy icon in gray
- "No tournaments yet" message
- "Create your first tournament" prompt
- Create Tournament button

### 2. Tournament Detail (`/tournaments/[id]`)

**Layout:**
- Back button at top
- Header with tournament name, verified badge, description, creator
- "Create Round" button in top right
- Three tabs: Rounds, Standings, Settings
- Tab-specific content below

**Rounds Tab:**
- List of rounds (cards)
- Each round shows:
  - Round number and stage badge
  - Published/Draft status with appropriate icon and color
  - Number of debates
  - Click to navigate to round detail

**Standings Tab:**
- Table with columns:
  - Rank (position)
  - Team name
  - Wins (green)
  - Losses (red)
  - Prop count (gray)
  - Opp count (gray)
  - Opponent Strength (gray, 2 decimals)
- Empty state with Trophy icon

**Settings Tab:**
- Organizers section with "Add Organizer" button
- (Future: additional tournament settings)

### 3. Round Detail (`/tournaments/[id]/rounds/[roundId]`)

**Layout:**
- Back button to tournament
- Header with round number, stage, and status badges
- Action buttons (if not published):
  - "Generate Draw" - Shuffle icon
  - "Allocate Judges" - UserCheck icon
  - "Publish Round" - Eye icon
- Grid of debate cards (2 columns on desktop)

**Debate Card:**
- "Debate N" title
- Prop team section:
  - Cyan background (20% opacity)
  - Cyan border (30% opacity)
  - "PROP" label in small cyan text
  - Team name
  - Checkmark if won
- "VS" divider
- Opp team section:
  - Red background (20% opacity)
  - Red border (30% opacity)
  - "OPP" label in small red text
  - Team name
  - Checkmark if won
- Judges section:
  - List of allocated judges with UserCheck icon
  - "No judges allocated" message if empty
- Status text at bottom

**Status Indicators:**
- Draft round: Yellow warning card with info about reviewing
- No debates: Yellow alert with "Generate Draw" instruction
- Published: Green checkmark badge
- Loading states: Spinning loader on buttons

### 4. Create Tournament (`/tournaments/new`)

**Layout:**
- Back button
- Card with form
- Fields:
  - Tournament Name (required, text input)
  - Description (optional, textarea, 4 rows)
- Error message area (red if error occurs)
- Action buttons:
  - Cancel (outline style, links back)
  - Create Tournament (cyan solid, with loading state)

### 5. Home Page (`/`)

**Layout:**
- Hero section:
  - Large title "Welcome to Debatera"
  - Subtitle text
  - Two buttons: "Browse Tournaments" and "Create Meeting"
- Three feature cards:
  1. Tournament System (Trophy icon)
  2. Team Management (Users icon)
  3. Live Debates (Calendar icon)
- Each card has icon, title, description, and action button

## Design Patterns

### Color System
- **Background:** Gradient from `#0b1530` via `#0e1a3f` to `#0b1530`
- **Primary:** Cyan `#06b6d4` (buttons, links, accents)
- **Success:** Green `#22c55e` (published, wins)
- **Warning:** Yellow `#eab308` (draft, pending)
- **Error:** Red `#ef4444` (opposition, losses)
- **Text:** White with varying opacity (100%, 70%, 60%, 50%, 40%)
- **Cards:** White 5% opacity with white 10% borders
- **Hover:** Brighter background, cyan borders

### Typography
- **Headings:** Bold, white, various sizes (3xl, 2xl, lg)
- **Body:** Regular, white with 60-70% opacity
- **Labels:** Small (sm), medium weight, white 70%
- **Badges:** Uppercase tracking, small text

### Components
- **Buttons:** Rounded (lg), with icons and gap
- **Cards:** Rounded corners, border, backdrop blur
- **Badges:** Rounded, colored backgrounds with low opacity
- **Tables:** Alternating row hover states
- **Icons:** Lucide React, consistent sizing (h-4 w-4 for most)

### Responsive Behavior
- Desktop: 3-column grid for tournaments, 2-column for debates
- Tablet: 2-column grids
- Mobile: Single column, stacked layout
- Navigation: Consistent back buttons, breadcrumb-style

### Interactive States
- **Loading:** Spinning loader icon, disabled buttons
- **Hover:** Brighter backgrounds, colored borders
- **Active:** Tab underlines in cyan
- **Empty:** Large icon, centered text, CTA button
- **Error:** Red message boxes with border

## Navigation Flow

```
Home (/)
  ↓
Tournaments (/tournaments)
  ↓
Tournament Detail (/tournaments/[id])
  ↓ (tabs)
  ├─ Rounds
  │   ↓
  │   Round Detail (/tournaments/[id]/rounds/[roundId])
  │     - Generate Draw
  │     - Allocate Judges
  │     - Publish
  ├─ Standings
  │   (table view)
  └─ Settings
      (organizer management)

Create Tournament (/tournaments/new)
  ↓
Tournament Detail (after creation)
```

## User Actions

### Tournament Organizer Workflow
1. **Create Tournament** → Form at `/tournaments/new`
2. **View Tournament** → Detail page with tabs
3. **Create Round** → Button creates new round
4. **Generate Draw** → Automatic power pairing
5. **Review Pairings** → See all debates with teams
6. **Allocate Judges** → Automatic cost-based allocation
7. **Review Allocation** → See judges per debate
8. **Publish Round** → Make visible to participants
9. **View Standings** → See current rankings

### Participant Workflow
1. **Browse Tournaments** → See all tournaments
2. **View Tournament** → See rounds and standings
3. **View Published Round** → See own debate pairing
4. **Check Standings** → See team ranking

## Technical Notes

- All pages use `'use client'` directive for client-side rendering
- React hooks for state management (`useState`, `useEffect`)
- Next.js App Router for navigation
- TypeScript for type safety
- Responsive design with Tailwind CSS
- Loading and error states for all async operations
- Optimistic UI updates where appropriate

## Future Enhancements

- Drag-and-drop for manual draw editing
- Real-time updates with WebSockets
- Advanced filtering and search
- Team registration interface
- Judge feedback forms
- Export standings to PDF/CSV
- Tournament brackets visualization for ELIM rounds
- Institution conflict warnings
- Speaker points tracking
