# Quick Start Guide: Tournament Rounds System

## Overview
The rounds system allows tournament administrators to manage debate rounds with automatic pairing generation and manual adjustments.

## Getting Started

### 1. Navigate to a Tournament
1. Go to the Tournaments page
2. Click on a tournament you own or are viewing
3. Click on the "Rounds" tab

### 2. Create Your First Round
1. Click the **"Create Round"** button in the top-right corner
2. A new round will be created with the name "Round 1"
3. The round appears as a tab at the top

### 3. Generate Pairings Automatically
1. Make sure you have teams registered in the tournament
2. Click the **"Auto-Generate Pairings"** button
3. All teams will be automatically paired up
4. Teams are paired sequentially (1 vs 2, 3 vs 4, etc.)

### 4. Manual Pairing Management

#### Add a Single Pairing
1. Click **"Add Pairing"** button
2. A new empty pairing row appears
3. Use the dropdown menus to select teams for Prop and Opp

#### Edit Existing Pairings
1. Click the dropdown menu in the "Proposition Team" or "Opposition Team" column
2. Select a different team from the list
3. The pairing updates automatically

#### Reorder Pairings (Drag and Drop)
1. Hover over the grip icon (⋮⋮) on the left side of a pairing row
2. Click and hold to drag the row
3. Drop it in the desired position
4. The order is saved automatically

#### Delete a Pairing
1. Click the trash icon (🗑️) on the right side of a pairing row
2. The pairing is removed immediately

### 5. Manage Rounds

#### Rename a Round
1. Click the edit icon (✏️) on a round tab
2. Type the new name (e.g., "Semifinals", "Finals")
3. Press Enter or click outside to save

#### Delete a Round
1. Click the trash icon (🗑️) on a round tab
2. The round and all its pairings are deleted
3. You'll be switched to another round tab

## Admin vs. Non-Admin Views

### Tournament Owner/Admin Can:
- ✅ Create new rounds
- ✅ Generate automatic pairings
- ✅ Add, edit, and delete pairings
- ✅ Drag and drop to reorder pairings
- ✅ Rename and delete rounds
- ✅ Select teams from dropdowns

### Regular Users Can:
- ✅ View all rounds and pairings
- ✅ See team details (name, institution, debaters)
- ❌ Cannot modify anything (read-only)

## Tips and Best Practices

### Before Creating Rounds
1. **Register Institutions**: Make sure institutions are registered for the tournament
2. **Create Teams**: Ensure all teams are created and have members assigned
3. **Freeze Roster** (Optional): Consider freezing the roster before generating pairings

### Pairing Strategy
- **Auto-Generate**: Quick way to create initial pairings for all teams
- **Manual Adjustments**: Use dropdowns to swap teams or handle odd numbers
- **Reordering**: Drag to group pairings by room, time, or any other criteria

### Round Naming
- Use descriptive names like "Round 1", "Round 2" for preliminary rounds
- Use "Quarterfinals", "Semifinals", "Finals" for break rounds
- Include information like "Morning Session" or "Room A-D" if helpful

### What Happens to Odd Number of Teams?
- If you have an odd number of teams, one team will be paired as Prop with no Opp
- You can manually assign a "bye" or adjust pairings as needed
- Set a team to "None" (TBD) if they shouldn't compete in a round

## Common Workflows

### Workflow 1: Simple Tournament Setup
```
1. Create Round 1
2. Click "Auto-Generate Pairings"
3. Review pairings
4. Start the round
```

### Workflow 2: Multi-Round Tournament
```
1. Create Round 1
2. Generate pairings
3. Record results (coming soon)
4. Create Round 2
5. Generate new pairings based on standings
6. Repeat for all rounds
```

### Workflow 3: Manual Pairing Adjustments
```
1. Create round
2. Auto-generate pairings
3. Review for conflicts (same institution, etc.)
4. Use dropdowns to swap teams
5. Drag to reorder by room assignment
6. Finalize and release to participants
```

## Troubleshooting

### "No teams available" message
**Problem**: Can't generate pairings
**Solution**: 
- Go to the "Teams" tab
- Ensure institutions are registered
- Create teams for the tournament
- Return to "Rounds" tab and try again

### Pairings not updating
**Problem**: Changes don't seem to save
**Solution**:
- Check your internet connection
- Refresh the page
- Ensure you're the tournament owner
- Check browser console for errors

### Can't drag and drop
**Problem**: Drag handle doesn't work
**Solution**:
- Make sure you're logged in as tournament owner
- Click and hold the grip icon (⋮⋮) for a moment
- Try refreshing the page
- Ensure you're not in a mobile browser (limited support)

### Round tabs not showing
**Problem**: Rounds exist but tabs are missing
**Solution**:
- Refresh the page
- Check if rounds were actually created (look for success message)
- Try creating a new round

## Future Features (Coming Soon)

### Judge Assignment
- Assign judges to each pairing
- Auto-assign judges based on availability and conflicts
- Track judge assignments across rounds

### Results and Scoring
- Record debate results for each pairing
- Enter speaker points
- Calculate team standings
- Generate break rounds based on performance

### Advanced Pairing Algorithms
- Swiss system pairing
- Power pairing based on wins/losses
- Seeded brackets for elimination rounds
- Conflict avoidance (same institution, previous opponents)

### Room and Schedule Management
- Assign physical or virtual rooms
- Set specific times for each pairing
- Generate printable schedules
- Send notifications to participants

## Keyboard Shortcuts (Coming Soon)
- `Ctrl+N`: Create new round
- `Ctrl+P`: Add new pairing
- `Ctrl+S`: Save changes
- `Esc`: Cancel editing

## Need Help?
If you encounter issues or have questions:
1. Check the documentation in `/docs/ROUNDS_SYSTEM.md`
2. Review the API documentation
3. Contact the tournament administrator
4. Report bugs to the development team

## API Reference
For developers integrating with the rounds system, see the full API documentation in `ROUNDS_SYSTEM.md`.
