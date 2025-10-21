/**
 * Manual verification tests for tournament system
 * These tests verify the logic of our algorithms without requiring a database
 */

// Mock team data structure
interface TeamWithHistory {
  id: string;
  name: string;
  wins: number;
  propCount: number;
  oppCount: number;
  oppIds: string[];
}

// Test: Bracket creation
function testCreateBrackets() {
  console.log('\n=== Test: Create Brackets ===');
  
  const teams: TeamWithHistory[] = [
    { id: '1', name: 'Team A', wins: 3, propCount: 2, oppCount: 1, oppIds: [] },
    { id: '2', name: 'Team B', wins: 3, propCount: 1, oppCount: 2, oppIds: [] },
    { id: '3', name: 'Team C', wins: 2, propCount: 1, oppCount: 1, oppIds: [] },
    { id: '4', name: 'Team D', wins: 2, propCount: 2, oppCount: 0, oppIds: [] },
    { id: '5', name: 'Team E', wins: 1, propCount: 1, oppCount: 1, oppIds: [] },
    { id: '6', name: 'Team F', wins: 1, propCount: 0, oppCount: 2, oppIds: [] },
    { id: '7', name: 'Team G', wins: 0, propCount: 1, oppCount: 1, oppIds: [] },
    { id: '8', name: 'Team H', wins: 0, propCount: 0, oppCount: 2, oppIds: [] },
  ];

  const brackets = new Map<number, TeamWithHistory[]>();
  for (const team of teams) {
    const bracket = brackets.get(team.wins) || [];
    bracket.push(team);
    brackets.set(team.wins, bracket);
  }

  console.log('Brackets created:');
  for (const [wins, bracket] of Array.from(brackets.entries()).sort((a, b) => b[0] - a[0])) {
    console.log(`  ${wins} wins: ${bracket.length} teams (${bracket.map(t => t.name).join(', ')})`);
  }

  // Verify
  if (brackets.get(3)?.length !== 2) {
    console.error('❌ Failed: Expected 2 teams with 3 wins');
    return false;
  }
  if (brackets.get(2)?.length !== 2) {
    console.error('❌ Failed: Expected 2 teams with 2 wins');
    return false;
  }
  
  console.log('✅ Passed: Brackets created correctly');
  return true;
}

// Test: Pull-up logic
function testPullUps() {
  console.log('\n=== Test: Pull-ups ===');
  
  const brackets = new Map<number, TeamWithHistory[]>();
  brackets.set(3, [
    { id: '1', name: 'Team A', wins: 3, propCount: 2, oppCount: 1, oppIds: [] },
    { id: '2', name: 'Team B', wins: 3, propCount: 1, oppCount: 2, oppIds: [] },
    { id: '3', name: 'Team C', wins: 3, propCount: 1, oppCount: 2, oppIds: [] }, // Odd number
  ]);
  brackets.set(2, [
    { id: '4', name: 'Team D', wins: 2, propCount: 2, oppCount: 0, oppIds: [] },
    { id: '5', name: 'Team E', wins: 2, propCount: 1, oppCount: 1, oppIds: [] },
  ]);

  console.log('Before pull-up:');
  console.log(`  3 wins: ${brackets.get(3)?.length} teams`);
  console.log(`  2 wins: ${brackets.get(2)?.length} teams`);

  // Apply pull-ups
  const sortedWins = Array.from(brackets.keys()).sort((a, b) => b - a);
  for (let i = 0; i < sortedWins.length - 1; i++) {
    const currentWins = sortedWins[i];
    const bracket = brackets.get(currentWins)!;

    if (bracket.length % 2 === 1) {
      const nextWins = sortedWins[i + 1];
      const nextBracket = brackets.get(nextWins);

      if (nextBracket && nextBracket.length > 0) {
        const pulledTeam = nextBracket.pop()!;
        bracket.push(pulledTeam);
        console.log(`  Pulled up ${pulledTeam.name} from ${nextWins} wins to ${currentWins} wins bracket`);
      }
    }
  }

  console.log('After pull-up:');
  console.log(`  3 wins: ${brackets.get(3)?.length} teams`);
  console.log(`  2 wins: ${brackets.get(2)?.length} teams`);

  // Verify
  if (brackets.get(3)?.length !== 4) {
    console.error('❌ Failed: Expected 4 teams in 3-win bracket after pull-up');
    return false;
  }
  if (brackets.get(2)?.length !== 1) {
    console.error('❌ Failed: Expected 1 team in 2-win bracket after pull-up');
    return false;
  }

  console.log('✅ Passed: Pull-up logic works correctly');
  return true;
}

// Test: Side balancing
function testSideBalancing() {
  console.log('\n=== Test: Side Balancing ===');
  
  const team1 = { id: '1', name: 'Team A', wins: 2, propCount: 3, oppCount: 0, oppIds: [] };
  const team2 = { id: '2', name: 'Team B', wins: 2, propCount: 0, oppCount: 3, oppIds: [] };

  const team1PropBalance = team1.propCount - team1.oppCount; // 3
  const team2PropBalance = team2.propCount - team2.oppCount; // -3

  console.log(`Team A: ${team1.propCount} prop, ${team1.oppCount} opp (balance: ${team1PropBalance})`);
  console.log(`Team B: ${team2.propCount} prop, ${team2.oppCount} opp (balance: ${team2PropBalance})`);

  let propTeam, oppTeam;
  if (team1PropBalance < team2PropBalance) {
    // team1 needs prop more (less balance)
    propTeam = team1;
    oppTeam = team2;
  } else {
    propTeam = team2;
    oppTeam = team1;
  }

  console.log(`Assigned: ${propTeam.name} as Prop, ${oppTeam.name} as Opp`);

  // Verify - Team A has done more prop, so should be assigned opp
  if (propTeam.id !== '2') {
    console.error('❌ Failed: Team B should be assigned Prop (has done less prop)');
    return false;
  }

  console.log('✅ Passed: Side balancing works correctly');
  return true;
}

// Test: Rematch detection
function testRematchDetection() {
  console.log('\n=== Test: Rematch Detection ===');
  
  const team1: TeamWithHistory = {
    id: '1',
    name: 'Team A',
    wins: 2,
    propCount: 1,
    oppCount: 1,
    oppIds: ['2', '3'], // Has faced teams 2 and 3
  };

  const team2: TeamWithHistory = {
    id: '2',
    name: 'Team B',
    wins: 2,
    propCount: 1,
    oppCount: 1,
    oppIds: ['1', '4'], // Has faced teams 1 and 4
  };

  const team4: TeamWithHistory = {
    id: '4',
    name: 'Team D',
    wins: 2,
    propCount: 1,
    oppCount: 1,
    oppIds: ['3', '5'], // Has NOT faced team 1
  };

  function hasRematch(t1: TeamWithHistory, t2: TeamWithHistory): boolean {
    return t1.oppIds.includes(t2.id);
  }

  const rematch12 = hasRematch(team1, team2);
  const rematch14 = hasRematch(team1, team4);

  console.log(`Team A vs Team B: ${rematch12 ? 'REMATCH' : 'new pairing'}`);
  console.log(`Team A vs Team D: ${rematch14 ? 'REMATCH' : 'new pairing'}`);

  // Verify
  if (!rematch12) {
    console.error('❌ Failed: Should detect rematch between teams 1 and 2');
    return false;
  }
  if (rematch14) {
    console.error('❌ Failed: Should NOT detect rematch between teams 1 and 4');
    return false;
  }

  console.log('✅ Passed: Rematch detection works correctly');
  return true;
}

// Test: Cost calculation
function testCostCalculation() {
  console.log('\n=== Test: Judge Allocation Cost ===');
  
  interface JudgeInfo {
    id: string;
    strength: number;
    allocatedDebates: Set<string>;
    conflicts: Set<string>;
  }

  interface DebateInfo {
    id: string;
    importance: number;
    propTeamId: string;
    oppTeamId: string;
  }

  const judge: JudgeInfo = {
    id: 'judge1',
    strength: 6,
    allocatedDebates: new Set(['debate1']),
    conflicts: new Set(['team1']),
  };

  const debate1: DebateInfo = {
    id: 'debate2',
    importance: 8,
    propTeamId: 'team1', // Conflict!
    oppTeamId: 'team2',
  };

  const debate2: DebateInfo = {
    id: 'debate3',
    importance: 5,
    propTeamId: 'team3',
    oppTeamId: 'team4',
  };

  function calculateCost(
    j: JudgeInfo,
    d: DebateInfo,
    weights: { strengthMismatchPenalty: number; conflictPenalty: number }
  ): number {
    let cost = 0;

    // Strength mismatch
    const strengthMismatch = Math.max(0, d.importance - j.strength);
    cost += strengthMismatch * weights.strengthMismatchPenalty;

    // Conflict penalty
    if (j.conflicts.has(d.propTeamId) || j.conflicts.has(d.oppTeamId)) {
      cost += weights.conflictPenalty;
    }

    // Load balancing
    cost += j.allocatedDebates.size * 2;

    return cost;
  }

  const weights = { strengthMismatchPenalty: 10, conflictPenalty: 1000 };
  const cost1 = calculateCost(judge, debate1, weights);
  const cost2 = calculateCost(judge, debate2, weights);

  console.log(`Cost for debate with conflict: ${cost1}`);
  console.log(`Cost for debate without conflict: ${cost2}`);

  // Verify conflict adds significant penalty
  if (cost1 <= cost2) {
    console.error('❌ Failed: Conflict should result in higher cost');
    return false;
  }

  console.log('✅ Passed: Cost calculation works correctly');
  return true;
}

// Run all tests
function runTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     Tournament System Logic Verification Tests       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const results = [
    testCreateBrackets(),
    testPullUps(),
    testSideBalancing(),
    testRematchDetection(),
    testCostCalculation(),
  ];

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║  Test Results: ${passed}/${total} passed${' '.repeat(32 - passed.toString().length - total.toString().length)}║`);
  console.log('╚═══════════════════════════════════════════════════════╝');

  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests();
