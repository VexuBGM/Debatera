import { BallotStatus, TournamentRoundStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { canEditBallot, canViewBallotDetails } from './authorization';

const baseContext = {
  ballotStatus: BallotStatus.DRAFT,
  ballotAdjudicatorParticipantUserId: 'judge_user',
  roundStatus: TournamentRoundStatus.IN_PROGRESS,
  tournamentCreatorUserId: 'organizer_user',
  ballotReopenedAt: null,
} as const;

describe('canEditBallot', () => {
  it('allows the owning adjudicator to edit a DRAFT ballot during IN_PROGRESS round', () => {
    expect(canEditBallot('judge_user', baseContext)).toBe(true);
  });

  it('allows the owning adjudicator to edit a reopened DRAFT after round COMPLETED', () => {
    expect(
      canEditBallot('judge_user', {
        ...baseContext,
        roundStatus: TournamentRoundStatus.COMPLETED,
        ballotReopenedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
    ).toBe(true);
  });

  it('blocks a different user from editing (even with valid ballot state)', () => {
    expect(canEditBallot('other_user', baseContext)).toBe(false);
  });

  it('blocks editing a SUBMITTED ballot even for the owning judge', () => {
    expect(
      canEditBallot('judge_user', {
        ...baseContext,
        ballotStatus: BallotStatus.SUBMITTED,
      })
    ).toBe(false);
  });

  it('blocks editing when round is COMPLETED and ballot was not reopened', () => {
    expect(
      canEditBallot('judge_user', {
        ...baseContext,
        roundStatus: TournamentRoundStatus.COMPLETED,
      })
    ).toBe(false);
  });
});

describe('canViewBallotDetails', () => {
  it('tournament organizer can view any ballot in any round status', () => {
    for (const roundStatus of Object.values(TournamentRoundStatus)) {
      expect(
        canViewBallotDetails('organizer_user', {
          ...baseContext,
          roundStatus,
        })
      ).toBe(true);
    }
  });

  it('owning adjudicator can view their ballot when round is IN_PROGRESS', () => {
    expect(canViewBallotDetails('judge_user', baseContext)).toBe(true);
  });

  it('owning adjudicator can view their ballot when round is COMPLETED', () => {
    expect(
      canViewBallotDetails('judge_user', {
        ...baseContext,
        roundStatus: TournamentRoundStatus.COMPLETED,
      })
    ).toBe(true);
  });

  it('owning adjudicator cannot view their ballot when round is DRAFT (not yet started)', () => {
    expect(
      canViewBallotDetails('judge_user', {
        ...baseContext,
        roundStatus: TournamentRoundStatus.DRAFT,
      })
    ).toBe(false);
  });

  it('owning adjudicator cannot view their ballot when round is PUBLISHED', () => {
    expect(
      canViewBallotDetails('judge_user', {
        ...baseContext,
        roundStatus: TournamentRoundStatus.PUBLISHED,
      })
    ).toBe(false);
  });

  it('a third-party user (neither organizer nor adjudicator) cannot view the ballot', () => {
    expect(canViewBallotDetails('other_user', baseContext)).toBe(false);
  });
});
