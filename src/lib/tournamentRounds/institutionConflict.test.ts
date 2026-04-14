import { describe, expect, it } from 'vitest';
import {
  hasInstitutionConflict,
  isJudgeEligibleForDebate,
} from './institutionConflict';

describe('hasInstitutionConflict', () => {
  it('returns false when judgeInstitutionId is null', () => {
    expect(hasInstitutionConflict(null, 'inst_prop', 'inst_opp')).toBe(false);
  });

  it('returns false when judgeInstitutionId is undefined', () => {
    expect(hasInstitutionConflict(undefined, 'inst_prop', 'inst_opp')).toBe(false);
  });

  it('returns true when judge matches propInstitutionId', () => {
    expect(hasInstitutionConflict('inst_prop', 'inst_prop', 'inst_opp')).toBe(true);
  });

  it('returns true when judge matches oppInstitutionId', () => {
    expect(hasInstitutionConflict('inst_opp', 'inst_prop', 'inst_opp')).toBe(true);
  });

  it('returns false when judge matches neither team', () => {
    expect(hasInstitutionConflict('inst_judge', 'inst_prop', 'inst_opp')).toBe(false);
  });

  it('returns false when prop and opp institution IDs are null', () => {
    expect(hasInstitutionConflict('inst_judge', null, null)).toBe(false);
  });
});

describe('isJudgeEligibleForDebate', () => {
  it('returns true when judge has no institution conflict with either team', () => {
    expect(
      isJudgeEligibleForDebate(
        { id: 'judge_1', institutionId: 'inst_judge' },
        { propTeamInstitutionId: 'inst_prop', oppTeamInstitutionId: 'inst_opp' }
      )
    ).toBe(true);
  });

  it('returns false when judge shares institution with the prop team', () => {
    expect(
      isJudgeEligibleForDebate(
        { id: 'judge_1', institutionId: 'inst_prop' },
        { propTeamInstitutionId: 'inst_prop', oppTeamInstitutionId: 'inst_opp' }
      )
    ).toBe(false);
  });

  it('returns false when judge shares institution with the opp team', () => {
    expect(
      isJudgeEligibleForDebate(
        { id: 'judge_1', institutionId: 'inst_opp' },
        { propTeamInstitutionId: 'inst_prop', oppTeamInstitutionId: 'inst_opp' }
      )
    ).toBe(false);
  });

  it('returns true when judge.institutionId is an empty string', () => {
    expect(
      isJudgeEligibleForDebate(
        { id: 'judge_1', institutionId: '' },
        { propTeamInstitutionId: 'inst_prop', oppTeamInstitutionId: 'inst_opp' }
      )
    ).toBe(true);
  });
});
