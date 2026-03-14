import { describe, expect, it } from 'vitest';
import {
  canManageInstitution,
  type TeamManagementScope,
} from '@/lib/domains/teams/teamManagementScope';

describe('canManageInstitution', () => {
  it('allows organizers to manage any institution', () => {
    const scope: TeamManagementScope = {
      userId: 'user_1',
      isOrganizer: true,
      canCreateInstitutions: true,
      manageableInstitutionIds: [],
    };

    expect(canManageInstitution(scope, 'inst_any')).toBe(true);
  });

  it('allows institution admins to manage only their approved institutions', () => {
    const scope: TeamManagementScope = {
      userId: 'user_2',
      isOrganizer: false,
      canCreateInstitutions: false,
      manageableInstitutionIds: ['inst_a', 'inst_b'],
    };

    expect(canManageInstitution(scope, 'inst_a')).toBe(true);
    expect(canManageInstitution(scope, 'inst_c')).toBe(false);
  });
});
