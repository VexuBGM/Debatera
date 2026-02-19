import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockValidateSession = vi.fn();
const mockValidateCsrf = vi.fn();
const mockIsSameOrigin = vi.fn();
const mockBallotFindUnique = vi.fn();

vi.mock('@/lib/identity/guestSession', () => ({
  validateGuestSessionCookie: mockValidateSession,
}));
vi.mock('@/lib/identity/guestCsrf', () => ({
  validateGuestCsrf: mockValidateCsrf,
}));
vi.mock('@/lib/identity/requestOrigin', () => ({
  isSameOrigin: mockIsSameOrigin,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ballot: {
      findUnique: mockBallotFindUnique,
    },
  },
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tournaments/t1/guest-ballots/b1/submit', {
    method: 'POST',
    headers: {
      origin: 'http://localhost',
      'content-type': 'application/json',
      'x-csrf-token': 'token',
    },
    body: JSON.stringify(body),
  });
}

describe('guest ballot submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSameOrigin.mockReturnValue(true);
    mockValidateCsrf.mockReturnValue(true);
  });

  it('rejects missing guest session', async () => {
    mockValidateSession.mockResolvedValue(null);

    const res = await POST(buildRequest({ vote: 'PROPOSITION', speeches: [] }), {
      params: Promise.resolve({ id: 't1', ballotId: 'b1' }),
    });

    expect(res.status).toBe(401);
  });

  it('rejects invalid origin', async () => {
    mockIsSameOrigin.mockReturnValue(false);

    const res = await POST(buildRequest({ vote: 'PROPOSITION', speeches: [] }), {
      params: Promise.resolve({ id: 't1', ballotId: 'b1' }),
    });

    expect(res.status).toBe(403);
  });

  it('rejects revoked or expired session', async () => {
    mockValidateSession.mockResolvedValue(null);

    const res = await POST(buildRequest({ vote: 'PROPOSITION', speeches: [] }), {
      params: Promise.resolve({ id: 't1', ballotId: 'b1' }),
    });

    expect(res.status).toBe(401);
  });
});
