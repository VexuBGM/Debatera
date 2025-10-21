# Tournament System API Examples

This document provides practical examples of using the Tournament System API.

## Setup

All examples assume:
- You have authentication set up (Clerk)
- You have a valid user session
- Database is running and migrated

## Example 1: Create a Tournament with Organizers

```typescript
// 1. Create tournament
const createTournamentResponse = await fetch('/api/tournaments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Spring Debate Championship 2025',
    description: 'Annual spring tournament for debate teams'
  })
});
const tournament = await createTournamentResponse.json();
console.log('Tournament created:', tournament.id);

// 2. Add additional organizer
const addOrganizerResponse = await fetch(`/api/tournaments/${tournament.id}/organizers`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid-here',
    role: 'ORGANIZER' // or 'OWNER'
  })
});
const organizer = await addOrganizerResponse.json();
console.log('Organizer added:', organizer);

// 3. Register teams (using existing teams endpoint)
const teamIds = [];
for (let i = 1; i <= 8; i++) {
  const teamResponse = await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Team ${i}`,
      tournamentId: tournament.id
    })
  });
  const team = await teamResponse.json();
  teamIds.push(team.id);
}
console.log('Teams registered:', teamIds.length);
```

## Example 2: Run Round 1

```typescript
const tournamentId = 'your-tournament-id';

// 1. Create round 1
const createRoundResponse = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stage: 'PRELIM' // or 'ELIM' for elimination rounds
  })
});
const round = await createRoundResponse.json();
console.log('Round created:', round.number);

// 2. Generate draw (random pairing for round 1)
const generateDrawResponse = await fetch(`/api/rounds/${round.id}/generate-draw`, {
  method: 'POST'
});
const drawResult = await generateDrawResponse.json();
console.log('Draw generated:', drawResult.pairings, 'debates');

// 3. Allocate judges automatically
const allocateJudgesResponse = await fetch(`/api/rounds/${round.id}/allocate-judges`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // Optional: customize weights
    importanceWeight: 5,
    conflictPenalty: 1000,
    strengthMismatchPenalty: 10
  })
});
const judgeResult = await allocateJudgesResponse.json();
console.log('Judges allocated:', judgeResult.debates.length, 'debates');

// 4. View the draw
const getDrawResponse = await fetch(`/api/rounds/${round.id}/draw`);
const draw = await getDrawResponse.json();
console.log('Current draw:', draw);

// 5. (Optional) Make manual adjustments
const editDrawResponse = await fetch(`/api/rounds/${round.id}/draw`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    debates: [
      {
        id: 'debate-id-1',
        propTeamId: 'team-id-2', // Swap teams
        oppTeamId: 'team-id-1',
        judges: ['judge-id-1', 'judge-id-2'] // Change judges
      }
    ]
  })
});
const updatedDraw = await editDrawResponse.json();
console.log('Draw updated');

// 6. Publish the round
const publishResponse = await fetch(`/api/rounds/${round.id}/publish`, {
  method: 'POST'
});
const publishedRound = await publishResponse.json();
console.log('Round published:', publishedRound.isPublished);
```

## Example 3: Run Round 2 (Power Pairing)

```typescript
// Assuming Round 1 is complete with results set

const tournamentId = 'your-tournament-id';

// 1. Create round 2
const createRoundResponse = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stage: 'PRELIM' })
});
const round2 = await createRoundResponse.json();

// 2. Generate draw (now uses power pairing based on wins)
const generateDrawResponse = await fetch(`/api/rounds/${round2.id}/generate-draw`, {
  method: 'POST'
});
const drawResult = await generateDrawResponse.json();
console.log('Power-paired draw generated');
// Teams are now grouped by wins
// Higher brackets (more wins) paired together
// Pull-ups applied for odd brackets

// 3. Allocate judges (higher brackets get stronger judges)
await fetch(`/api/rounds/${round2.id}/allocate-judges`, {
  method: 'POST'
});

// 4. Publish
await fetch(`/api/rounds/${round2.id}/publish`, {
  method: 'POST'
});
```

## Example 4: View Standings

```typescript
const tournamentId = 'your-tournament-id';

const standingsResponse = await fetch(`/api/tournaments/${tournamentId}/standings`);
const standings = await standingsResponse.json();

console.log('Tournament Standings:');
standings.forEach((team, index) => {
  console.log(`${index + 1}. ${team.teamName}`);
  console.log(`   Wins: ${team.wins}, Losses: ${team.losses}`);
  console.log(`   Prop: ${team.propCount}, Opp: ${team.oppCount}`);
  console.log(`   Opponent Strength: ${team.opponentStrength.toFixed(2)}`);
  console.log();
});
```

## Example 5: Complete Tournament Workflow

```typescript
async function runTournament() {
  // Setup
  const tournament = await createTournament('Demo Tournament');
  await registerTeams(tournament.id, 8);
  
  // Run 4 rounds
  for (let roundNum = 1; roundNum <= 4; roundNum++) {
    console.log(`\n=== Round ${roundNum} ===`);
    
    // Create and generate
    const round = await createRound(tournament.id);
    await generateDraw(round.id);
    await allocateJudges(round.id);
    
    // Review and publish
    const draw = await getDraw(round.id);
    console.log(`Generated ${draw.debates.length} debates`);
    await publishRound(round.id);
    
    // Simulate debates (in real app, debates happen here)
    await simulateDebates(round.id);
    
    // View standings
    const standings = await getStandings(tournament.id);
    console.log('Current standings:', standings.slice(0, 3).map(s => s.teamName));
  }
  
  // Final standings
  const finalStandings = await getStandings(tournament.id);
  console.log('\n=== Final Results ===');
  console.log('Winner:', finalStandings[0].teamName);
}

// Helper functions
async function createTournament(name: string) {
  const res = await fetch('/api/tournaments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return res.json();
}

async function registerTeams(tournamentId: string, count: number) {
  for (let i = 1; i <= count; i++) {
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Team ${i}`, tournamentId })
    });
  }
}

async function createRound(tournamentId: string) {
  const res = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: 'PRELIM' })
  });
  return res.json();
}

async function generateDraw(roundId: string) {
  await fetch(`/api/rounds/${roundId}/generate-draw`, { method: 'POST' });
}

async function allocateJudges(roundId: string) {
  await fetch(`/api/rounds/${roundId}/allocate-judges`, { method: 'POST' });
}

async function getDraw(roundId: string) {
  const res = await fetch(`/api/rounds/${roundId}/draw`);
  return res.json();
}

async function publishRound(roundId: string) {
  await fetch(`/api/rounds/${roundId}/publish`, { method: 'POST' });
}

async function getStandings(tournamentId: string) {
  const res = await fetch(`/api/tournaments/${tournamentId}/standings`);
  return res.json();
}

async function simulateDebates(roundId: string) {
  // In a real app, debates would be conducted here
  // For simulation, we'd set winningSide on each debate
  console.log('Debates in progress...');
}
```

## Example 6: Error Handling

```typescript
async function safeGenerateDraw(roundId: string) {
  try {
    const response = await fetch(`/api/rounds/${roundId}/generate-draw`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 400) {
        console.error('Cannot generate draw:', error.error);
        // Maybe round is already published?
      } else if (response.status === 403) {
        console.error('Permission denied:', error.error);
        // User is not an organizer
      } else if (response.status === 404) {
        console.error('Round not found');
      } else {
        console.error('Failed to generate draw:', error.details);
      }
      
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

## Tips

### Best Practices

1. **Always check round state** before generating draw or allocating judges
2. **Review draw manually** before publishing, especially for important rounds
3. **Publish rounds** only when ready - it locks the round
4. **Set debate results** promptly to keep standings accurate
5. **Use transactions** when making multiple related changes

### Common Workflows

**Quick Tournament**
1. Create tournament
2. Register teams
3. For each round: Create → Generate → Allocate → Publish → Run → Set Results
4. View final standings

**Careful Tournament**
1. Create tournament with organizers
2. Register teams over several days
3. Create round 1 day before
4. Generate and review draw
5. Make manual adjustments
6. Allocate judges and review
7. Make manual judge changes
8. Publish night before
9. Run debates
10. Enter results
11. Repeat for next round

### Debugging

If draw generation fails:
- Check that you have at least 2 teams
- Verify round doesn't already exist
- Check that you're an organizer

If judge allocation fails:
- Ensure you have available judges (not team members)
- Check that debates exist in the round
- Verify round is not published

If standings are wrong:
- Confirm all debates have winningSide set
- Verify rounds are published
- Check that debates are linked to rounds

## Next Steps

See `docs/TOURNAMENT_SYSTEM.md` for detailed technical documentation.
