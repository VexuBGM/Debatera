import { describe, expect, it } from 'vitest';
import { BallotStatus, TournamentRoundStatus } from '@prisma/client';

import {
  canJudgeEditBallotState,
  canRequestBallotModification,
  serializeBallotModificationRequest,
} from './modificationRequests';

describe('canJudgeEditBallotState', () => {
  it('allows normal draft editing while the round is in progress', () => {
    expect(
      canJudgeEditBallotState({
        ballotStatus: BallotStatus.DRAFT,
        roundStatus: TournamentRoundStatus.IN_PROGRESS,
        reopenedAt: null,
      })
    ).toBe(true);
  });

  it('allows reopened drafts after the round is completed', () => {
    expect(
      canJudgeEditBallotState({
        ballotStatus: BallotStatus.DRAFT,
        roundStatus: TournamentRoundStatus.COMPLETED,
        reopenedAt: new Date('2026-03-16T10:00:00.000Z'),
      })
    ).toBe(true);
  });

  it('keeps completed-round drafts locked unless reopened', () => {
    expect(
      canJudgeEditBallotState({
        ballotStatus: BallotStatus.DRAFT,
        roundStatus: TournamentRoundStatus.COMPLETED,
        reopenedAt: null,
      })
    ).toBe(false);
  });

  it('never treats submitted ballots as editable', () => {
    expect(
      canJudgeEditBallotState({
        ballotStatus: BallotStatus.SUBMITTED,
        roundStatus: TournamentRoundStatus.IN_PROGRESS,
        reopenedAt: new Date('2026-03-16T10:00:00.000Z'),
      })
    ).toBe(false);
  });
});

describe('canRequestBallotModification', () => {
  it('allows submitted ballots in active rounds when no request is pending', () => {
    expect(
      canRequestBallotModification({
        ballotStatus: BallotStatus.SUBMITTED,
        roundStatus: TournamentRoundStatus.IN_PROGRESS,
        hasPendingRequest: false,
      })
    ).toBe(true);
  });

  it('allows submitted ballots in completed rounds when no request is pending', () => {
    expect(
      canRequestBallotModification({
        ballotStatus: BallotStatus.SUBMITTED,
        roundStatus: TournamentRoundStatus.COMPLETED,
        hasPendingRequest: false,
      })
    ).toBe(true);
  });

  it('blocks requests for non-submitted ballots or while another request is pending', () => {
    expect(
      canRequestBallotModification({
        ballotStatus: BallotStatus.DRAFT,
        roundStatus: TournamentRoundStatus.IN_PROGRESS,
        hasPendingRequest: false,
      })
    ).toBe(false);

    expect(
      canRequestBallotModification({
        ballotStatus: BallotStatus.SUBMITTED,
        roundStatus: TournamentRoundStatus.COMPLETED,
        hasPendingRequest: true,
      })
    ).toBe(false);
  });
});

describe('serializeBallotModificationRequest', () => {
  it('returns ISO timestamps for API payloads', () => {
    expect(
      serializeBallotModificationRequest({
        id: 'req_1',
        status: 'PENDING',
        reason: 'Typo in speaker assignment',
        resolutionNote: null,
        createdAt: new Date('2026-03-16T10:00:00.000Z'),
        resolvedAt: null,
      })
    ).toEqual({
      id: 'req_1',
      status: 'PENDING',
      reason: 'Typo in speaker assignment',
      resolutionNote: null,
      createdAt: '2026-03-16T10:00:00.000Z',
      resolvedAt: null,
    });
  });
});
