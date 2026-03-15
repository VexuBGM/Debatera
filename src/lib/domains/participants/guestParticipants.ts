export interface ParsedGuestName {
  line: number;
  name: string;
}

export function normalizeGuestDisplayName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, ' ');
}

export function parseGuestParticipantNames(names: string): ParsedGuestName[] {
  return names
    .split(/\r?\n/)
    .map((rawName, index) => ({
      line: index + 1,
      name: normalizeGuestDisplayName(rawName),
    }))
    .filter((entry) => entry.name.length > 0);
}

export function generateGuestUserId(): string {
  return `guest_${crypto.randomUUID()}`;
}

export function splitGuestDisplayName(displayName: string): {
  firstName: string;
  lastName: string | null;
} {
  const normalizedDisplayName = normalizeGuestDisplayName(displayName);
  const parts = normalizedDisplayName.split(' ');

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
