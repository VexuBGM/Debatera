import { describe, expect, it } from 'vitest';
import {
  assertIRLMode,
  assertRegistrationOpen,
  assertValidTeamSize,
  isIRLMode,
  isRegistrationOpen,
  type TournamentSettingsLike,
} from './tournamentSettingsGuards';

const baseSettings: TournamentSettingsLike = {
  registrationOpensAt: null,
  registrationClosesAt: null,
  teamSizeMin: 2,
  teamSizeMax: 5,
};

describe('tournament settings guards', () => {
  it('treats missing registration dates as open', () => {
    expect(isRegistrationOpen(baseSettings, new Date('2026-04-11T12:00:00Z'))).toBe(true);
  });

  it('closes registration before the open date and at the close date', () => {
    expect(
      isRegistrationOpen(
        {
          ...baseSettings,
          registrationOpensAt: new Date('2026-04-12T00:00:00Z'),
        },
        new Date('2026-04-11T23:00:00Z')
      )
    ).toBe(false);
    expect(
      isRegistrationOpen(
        {
          ...baseSettings,
          registrationClosesAt: new Date('2026-04-12T00:00:00Z'),
        },
        new Date('2026-04-12T00:00:00Z')
      )
    ).toBe(false);
  });

  it('throws a stable registration error code when closed', () => {
    expect(() =>
      assertRegistrationOpen(
        {
          ...baseSettings,
          registrationClosesAt: new Date('2026-04-10T00:00:00Z'),
        },
        new Date('2026-04-11T00:00:00Z')
      )
    ).toThrow('REGISTRATION_CLOSED');
  });

  it('checks IRL mode explicitly', () => {
    expect(isIRLMode({ eventMode: 'IRL' })).toBe(true);
    expect(isIRLMode({ eventMode: 'ONLINE' })).toBe(false);
    expect(() => assertIRLMode({ eventMode: 'ONLINE' })).toThrow('Venues are not available');
  });

  it('enforces max team size and optionally enforces min team size', () => {
    expect(() => assertValidTeamSize(baseSettings, 1)).toThrow('TEAM_SIZE_INVALID');
    expect(() => assertValidTeamSize(baseSettings, 1, false)).not.toThrow();
    expect(() => assertValidTeamSize(baseSettings, 6, false)).toThrow('TEAM_SIZE_INVALID');
  });
});
