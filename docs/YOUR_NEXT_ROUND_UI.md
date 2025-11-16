# Your Next Round - UI Guide

## Overview
The "Your Next Round" tab provides a personalized view of each participant's upcoming debate assignment.

## Access
**Location**: Tournament Detail Page → "Your Next Round" Tab
**Path**: `/tournaments/[tournamentId]` → Click "Your Next Round" tab

## UI States

### 1. Loading State
- Shows spinner with "Loading your round assignment..." message
- Displayed while fetching data from API

### 2. Error State
- Alert icon with error message
- "Try Again" button to retry loading
- Possible errors:
  - "You are not registered for this tournament"
  - "Failed to load your next round information"

### 3. No Assignment State
Shows when user is registered but not assigned to a round yet:
- Calendar icon
- Message: "No Round Assignment Yet"
- Description: "You have not been assigned to a round yet. Check back later!"
- Registration details:
  - Role badge (DEBATER or JUDGE)
  - Team name (if debater)
  - Institution name

### 4. Debater View (With Assignment)

#### Header
- Title: "Your Next Round"
- Round badge: Large cyan badge showing round name (e.g., "Round 1")

#### Main Assignment Card
**Background**: Gradient cyan-to-blue with cyan border
**Content**:
- Trophy icon
- Bold heading: "You're debating as [PROPOSITION/OPPOSITION]"
  - PROPOSITION: Green badge
  - OPPOSITION: Orange badge
- Scheduled time (if available)

#### Teams Grid (2 columns on desktop)

**Your Team Card**:
- Cyan border (highlighted)
- "Your Team" badge
- Side badge (PROP or OPP)
- Team name (large, bold)
- Institution name
- List of team members with user icons

**Opponent Team Card**:
- Standard border
- "Opponent" badge
- Opposite side badge
- Team name (large, bold)
- Institution name
- List of team members with user icons
- Shows "TBD" if no opponent assigned yet

#### Judges Section
- Gavel icon + "Judges (X)" heading
- Grid layout (2 columns on desktop)
- Each judge card shows:
  - Judge name
  - Institution
  - "Chair" badge if chair judge (purple)

#### Call-to-Action
- Centered large button: "Enter Debate Room"
- Cyan background
- Arrow right icon
- Links to `/debate/[pairingId]`

### 5. Judge View (With Assignment)

#### Header
- Title: "Your Next Round"
- "Chair Judge" badge (purple) if applicable
- Round badge: Large cyan badge showing round name

#### Main Assignment Card
**Background**: Gradient purple-to-indigo with purple border
**Content**:
- Gavel icon
- Bold heading: "You're judging this debate"
- Scheduled time (if available)

#### Teams Grid (2 columns on desktop)

**Proposition Team Card**:
- Standard border
- Green "PROPOSITION" badge
- Team name (large, bold)
- Institution name
- List of team members with user icons
- Shows "TBD" if not assigned yet

**Opposition Team Card**:
- Standard border
- Orange "OPPOSITION" badge
- Team name (large, bold)
- Institution name
- List of team members with user icons
- Shows "TBD" if not assigned yet

#### Fellow Judges Section
- Only shown if there are other judges (panel)
- Gavel icon + "Fellow Judges (X)" heading
- Grid layout (2 columns on desktop)
- Each judge card shows:
  - Judge name
  - Institution
  - "Chair" badge if they are chair (purple)

#### Call-to-Action
- Centered large button: "Enter Judging Room"
- Purple background
- Arrow right icon
- Links to `/debate/[pairingId]`

## Color Scheme

### Debater View Colors
- **Primary**: Cyan (#06B6D4)
- **Gradient**: Cyan to Blue
- **Borders**: Cyan
- **PROP Badge**: Green (#22C55E)
- **OPP Badge**: Orange (#F97316)

### Judge View Colors
- **Primary**: Purple (#A855F7)
- **Gradient**: Purple to Indigo
- **Borders**: Purple
- **Chair Badge**: Purple
- **PROP Badge**: Green (#22C55E)
- **OPP Badge**: Orange (#F97316)

## Responsive Design

### Desktop (md+)
- Teams grid: 2 columns
- Judges grid: 2 columns
- Full-width cards with proper spacing

### Mobile
- Teams grid: 1 column (stacked)
- Judges grid: 1 column (stacked)
- Adjusted padding and font sizes
- Full-width button

## Key Visual Elements

### Icons Used
- 🏆 Trophy: For debater assignment header
- ⚖️ Gavel: For judge assignment header and judge sections
- 👥 Users: For team member lists
- 📅 Calendar: For scheduled time and no assignment state
- ⚠️ Alert Circle: For error states
- ⏳ Loader: For loading states
- → Arrow Right: For action buttons

### Badges
- **Round Name**: Large, cyan background
- **Chair Judge**: Purple background, white text
- **Your Role**: Outline style with role text
- **PROP**: Green background, white text
- **OPP**: Orange background, white text
- **Your Team**: Cyan background, darker cyan text

### Cards
- Rounded corners (border-radius: lg)
- Subtle shadows
- Border styling based on importance
- Hover effects on interactive elements

## User Experience Features

1. **Clear Visual Hierarchy**: Round info → Assignment details → Action button
2. **Role-Based Theming**: Different colors for debaters (cyan) vs judges (purple)
3. **Side Highlighting**: Clear indication of which side debaters are on
4. **TBD Handling**: Graceful display when teams/judges not assigned
5. **Responsive Layout**: Adapts to all screen sizes
6. **Loading States**: Clear feedback during data fetching
7. **Error Handling**: User-friendly error messages with retry option
8. **Accessibility**: Proper semantic HTML and ARIA labels

## Example User Journeys

### Journey 1: Debater Checking Assignment
1. Navigate to tournament page
2. Click "Your Next Round" tab
3. See round badge at top ("Round 1")
4. Read "You're debating as PROPOSITION"
5. Review their team card (highlighted in cyan)
6. Check opponent team
7. Review judges list
8. Click "Enter Debate Room" when ready

### Journey 2: Judge Checking Assignment
1. Navigate to tournament page
2. Click "Your Next Round" tab
3. See round badge and "Chair Judge" badge
4. Read "You're judging this debate"
5. Review proposition team
6. Review opposition team
7. Check fellow judges (if panel)
8. Click "Enter Judging Room" when ready

### Journey 3: Waiting for Assignment
1. Navigate to tournament page
2. Click "Your Next Round" tab
3. See "No Round Assignment Yet" message
4. Note their registration status
5. Check back later

## Accessibility Considerations

- Semantic HTML structure
- Color contrast meets WCAG AA standards
- Icon meanings supplemented with text
- Keyboard navigation support
- Screen reader friendly labels
- Focus indicators on interactive elements

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Responsive design for all viewport sizes
