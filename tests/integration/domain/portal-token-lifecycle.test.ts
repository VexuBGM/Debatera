import { describe, expect, it } from 'vitest';
import { validatePortalToken } from '@/lib/portal/auth';
import { createSingleDebateScenario } from '@tests/fixtures/tournament-scenarios';
import { createPortalAccessLink } from '@tests/factories/portal.factory';
import { createTournamentParticipant } from '@tests/factories/participant.factory';
import { createUser } from '@tests/factories/user.factory';

describe('portal token lifecycle integration', () => {
  it('accepts an active token for a judge in the requested tournament', async () => {
    const scenario = await createSingleDebateScenario('PUBLISHED');
    const { token, link } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: scenario.judgeParticipant.id,
    });

    const auth = await validatePortalToken(token, scenario.tournament.id);

    expect(auth).toMatchObject({
      participantId: scenario.judgeParticipant.id,
      tournamentId: scenario.tournament.id,
      userId: scenario.judgeUser.id,
      accessLinkId: link.id,
    });
  });

  it('rejects expired, revoked, and wrong-tournament tokens', async () => {
    const scenario = await createSingleDebateScenario('PUBLISHED');
    const revokedJudgeUser = await createUser({ id: 'revoked_portal_judge' });
    const revokedJudge = await createTournamentParticipant({
      tournamentId: scenario.tournament.id,
      institutionId: scenario.institution.id,
      userId: revokedJudgeUser.id,
      role: 'JUDGE',
    });
    const expired = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: scenario.judgeParticipant.id,
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    });
    const revoked = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: revokedJudge.id,
      revokedAt: new Date(),
    });

    expect(await validatePortalToken(expired.token, scenario.tournament.id)).toBeNull();
    expect(await validatePortalToken(revoked.token, scenario.tournament.id)).toBeNull();
    expect(await validatePortalToken(revoked.token, 'other_tournament')).toBeNull();
  });

  it('rejects portal tokens for debater participants', async () => {
    const scenario = await createSingleDebateScenario('PUBLISHED');
    const debaterUser = await createUser({ id: 'portal_debater' });
    const debater = await createTournamentParticipant({
      tournamentId: scenario.tournament.id,
      institutionId: scenario.institution.id,
      userId: debaterUser.id,
      role: 'DEBATER',
    });
    const { token } = await createPortalAccessLink({
      tournamentId: scenario.tournament.id,
      participantId: debater.id,
    });

    expect(await validatePortalToken(token, scenario.tournament.id)).toBeNull();
  });
});
