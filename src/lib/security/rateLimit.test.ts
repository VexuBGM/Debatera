import { describe, expect, it, vi } from 'vitest';
import { getRequestIp, rateLimit } from './rateLimit';

function requestWithHeaders(headers: HeadersInit = {}) {
  return new Request('http://localhost/api/test', { headers });
}

describe('rateLimit', () => {
  it('uses x-forwarded-for before x-real-ip', () => {
    const req = requestWithHeaders({
      'x-forwarded-for': '203.0.113.1, 203.0.113.2',
      'x-real-ip': '198.51.100.1',
    });

    expect(getRequestIp(req)).toBe('203.0.113.1');
  });

  it('returns a 429 response after the limit is exceeded', async () => {
    const subject = `subject_${crypto.randomUUID()}`;
    const req = requestWithHeaders();

    expect(rateLimit(req, 'unit:test', { limit: 2, windowMs: 60_000 }, subject)).toBeNull();
    expect(rateLimit(req, 'unit:test', { limit: 2, windowMs: 60_000 }, subject)).toBeNull();
    const response = rateLimit(req, 'unit:test', { limit: 2, windowMs: 60_000 }, subject);

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
    await expect(response?.json()).resolves.toEqual({ error: 'Too many requests' });
  });

  it('resets the bucket after the window', () => {
    vi.useFakeTimers();
    try {
      const subject = `subject_${crypto.randomUUID()}`;
      const req = requestWithHeaders();

      expect(rateLimit(req, 'unit:reset', { limit: 1, windowMs: 1_000 }, subject)).toBeNull();
      expect(rateLimit(req, 'unit:reset', { limit: 1, windowMs: 1_000 }, subject)?.status).toBe(429);

      vi.advanceTimersByTime(1_001);

      expect(rateLimit(req, 'unit:reset', { limit: 1, windowMs: 1_000 }, subject)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
