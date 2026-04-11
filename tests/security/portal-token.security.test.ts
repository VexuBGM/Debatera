import { describe, expect, it } from 'vitest';
import { validatePortalBallotAccess } from '@/lib/portal/auth';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createPortalAccessLink } from '@tests/factories/portal.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createUser } from '@tests/factories/user.factory';

describe('portal token security', () => {
  it('scopes ballot access to the judge that owns the ballot', async () => {
    const scenario = await createSingleDebateScenario('PUBLISHED');
    const otherJudgeUser = await createUser({ id: 'portal_other_judge' });
    const otherJudge = await createTournamentParticipant({
      tournamentId: scenario.tournament.id,
      institutionId: scenario.institution.id,
      userId: otherJudgeUser.id,
      role: 'JUDGE',
    });
    const { token } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: otherJudge.id,
    });

    expect(await validatePortalBallotAccess(token, scenario.ballot.id)).toBeNull();
  });

  it('rejects revoked ballot-access tokens', async () => {
    const scenario = await createSingleDebateScenario('PUBLISHED');
    const { token } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: scenario.judgeParticipant.id,
      revokedAt: new Date(),
    });

    expect(await validatePortalBallotAccess(token, scenario.ballot.id)).toBeNull();
  });
});
