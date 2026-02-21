import { describe, it, expect } from 'vitest';
import { displayNameFromDbUser, initialsFromDbUser } from './displayName';

describe('displayNameFromDbUser', () => {
  it('returns displayName when available', () => {
    expect(displayNameFromDbUser({ displayName: 'Guest User', firstName: 'F', lastName: 'L', email: 'a@b.com' }))
      .toBe('Guest User');
  });

  it('falls back to firstName + lastName', () => {
    expect(displayNameFromDbUser({ firstName: 'Ivan', lastName: 'Ivanov' }))
      .toBe('Ivan Ivanov');
  });

  it('falls back to firstName only', () => {
    expect(displayNameFromDbUser({ firstName: 'Ivan' }))
      .toBe('Ivan');
  });

  it('falls back to email prefix', () => {
    expect(displayNameFromDbUser({ email: 'ivan@example.com' }))
      .toBe('ivan');
  });

  it('returns Unknown User when no data', () => {
    expect(displayNameFromDbUser({})).toBe('Unknown User');
    expect(displayNameFromDbUser(null)).toBe('Unknown User');
    expect(displayNameFromDbUser(undefined)).toBe('Unknown User');
  });

  it('trims whitespace from displayName', () => {
    expect(displayNameFromDbUser({ displayName: '  Spaced  Name  ' }))
      .toBe('Spaced  Name');
  });
});

describe('initialsFromDbUser', () => {
  it('returns initials from firstName and lastName', () => {
    expect(initialsFromDbUser({ firstName: 'Ivan', lastName: 'Ivanov' })).toBe('II');
  });

  it('returns ? for null user', () => {
    expect(initialsFromDbUser(null)).toBe('?');
  });
});
