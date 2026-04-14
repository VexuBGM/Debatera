import { describe, expect, it } from 'vitest';
import {
  BallotModificationRequestCreateSchema,
  ResolveBallotModificationRequestSchema,
  SaveBallotDraftSchema,
  SubmitBallotSchema,
  type SubmitBallotInput,
  validateBallotSubmission,
} from './validation';
import { WSDC_SPEECH_ORDER } from './constants';

function validSubmission(): SubmitBallotInput {
  return {
    vote: 'PROPOSITION' as const,
    privateNotes: 'Decision notes',
    speeches: WSDC_SPEECH_ORDER.map((role) => ({
      role,
      speakerId: role.startsWith('PROP')
        ? role === 'PROP_REPLY'
          ? 'prop_1'
          : `prop_${role.slice(5, 6).toLowerCase()}`
        : role === 'OPP_REPLY'
          ? 'opp_1'
          : `opp_${role.slice(4, 5).toLowerCase()}`,
      speakerName: null,
      score: role.startsWith('PROP')
        ? role.endsWith('REPLY')
          ? 38
          : 76
        : role.endsWith('REPLY')
          ? 36
          : 74,
      comment: `${role} comment`,
    })),
  };
}

describe('ballot validation schemas', () => {
  it('allows partial draft saves', () => {
    const parsed = SaveBallotDraftSchema.safeParse({
      vote: null,
      speeches: [{ role: 'PROP_1', score: null, speakerName: 'Guest speaker' }],
    });

    expect(parsed.success).toBe(true);
  });

  it('requires eight speeches on submit', () => {
    const parsed = SubmitBallotSchema.safeParse({
      vote: 'PROPOSITION',
      speeches: validSubmission().speeches.slice(0, 7),
    });

    expect(parsed.success).toBe(false);
  });

  it('caps ballot modification request text fields', () => {
    expect(
      BallotModificationRequestCreateSchema.safeParse({ reason: 'x'.repeat(2001) }).success
    ).toBe(false);
    expect(
      ResolveBallotModificationRequestSchema.safeParse({
        status: 'APPROVED',
        resolutionNote: 'x'.repeat(2001),
      }).success
    ).toBe(false);
  });
});

describe('validateBallotSubmission', () => {
  it('accepts a complete internally consistent ballot', () => {
    expect(validateBallotSubmission(validSubmission())).toEqual([]);
  });

  it('rejects scores outside constructive and reply ranges', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_1')!.score = 80.5;
    submission.speeches.find((speech) => speech.role === 'PROP_REPLY')!.score = 40.5;

    const errors = validateBallotSubmission(submission);

    expect(errors.map((error) => error.field)).toContain('speeches.PROP_1.score');
    expect(errors.map((error) => error.field)).toContain('speeches.PROP_REPLY.score');
  });

  it('rejects non half-point increments', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_2')!.score = 75.25;

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_2.score',
          message: expect.stringContaining('0.5 increments'),
        }),
      ])
    );
  });

  it('requires each speech to identify a speaker', () => {
    const submission = validSubmission();
    const propOne = submission.speeches.find((speech) => speech.role === 'PROP_1')!;
    propOne.speakerId = null;
    propOne.speakerName = null;

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_1.speaker',
        }),
      ])
    );
  });

  it('rejects reply speeches by the third speaker when speakerId is known', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_REPLY')!.speakerId = 'prop_3';

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_REPLY.speaker',
        }),
      ])
    );
  });

  it('rejects a vote that does not match side totals', () => {
    const submission = validSubmission();
    submission.vote = 'OPPOSITION';

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vote',
        }),
      ])
    );
  });

  it('accepts the exact minimum constructive score (60)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'OPP_1')!.score = 60;

    expect(validateBallotSubmission(submission)).toEqual([]);
  });

  it('accepts the exact maximum constructive score (80)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_1')!.score = 80;

    expect(validateBallotSubmission(submission)).toEqual([]);
  });

  it('rejects a constructive score of 59.5 (below minimum)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_1')!.score = 59.5;

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_1.score',
        }),
      ])
    );
  });

  it('rejects a constructive score of 80.5 (above maximum)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_1')!.score = 80.5;

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_1.score',
        }),
      ])
    );
  });

  it('accepts the exact minimum reply score (30)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'OPP_REPLY')!.score = 30;

    expect(validateBallotSubmission(submission)).toEqual([]);
  });

  it('accepts the exact maximum reply score (40)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_REPLY')!.score = 40;

    expect(validateBallotSubmission(submission)).toEqual([]);
  });

  it('rejects a reply score of 29.5 (below minimum)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_REPLY')!.score = 29.5;

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_REPLY.score',
        }),
      ])
    );
  });

  it('rejects a reply score of 40.5 (above maximum)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'PROP_REPLY')!.score = 40.5;

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.PROP_REPLY.score',
        }),
      ])
    );
  });

  it('rejects OPP_REPLY delivered by OPP_3 speaker (only OPP_1 or OPP_2 allowed)', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'OPP_REPLY')!.speakerId = 'opp_3';

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'speeches.OPP_REPLY.speaker',
        }),
      ])
    );
  });

  it('accepts OPP_REPLY delivered by OPP_2 speaker', () => {
    const submission = validSubmission();
    submission.speeches.find((speech) => speech.role === 'OPP_REPLY')!.speakerId = 'opp_2';

    expect(validateBallotSubmission(submission)).toEqual([]);
  });

  it('rejects a vote for PROPOSITION when totals are exactly equal (tie)', () => {
    const submission = validSubmission();
    submission.vote = 'PROPOSITION';

    for (const speech of submission.speeches) {
      speech.score = speech.role.endsWith('REPLY') ? 35 : 70;
    }

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vote',
        }),
      ])
    );
  });

  it('rejects a vote for OPPOSITION when totals are exactly equal (tie)', () => {
    const submission = validSubmission();
    submission.vote = 'OPPOSITION';

    for (const speech of submission.speeches) {
      speech.score = speech.role.endsWith('REPLY') ? 35 : 70;
    }

    expect(validateBallotSubmission(submission)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vote',
        }),
      ])
    );
  });
});
