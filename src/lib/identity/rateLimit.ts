/**
 * Simple in-memory rate limiter for guest/token endpoints.
 *
 * Keyed by IP (or a fallback). Sliding window, configurable
 * max attempts and window duration.
 */

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000).unref();

interface RateLimitConfig {
  /** Max attempts within the window */
  maxAttempts: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 30,
  windowMs: 60_000, // 1 minute
};

/**
 * Check whether a request identified by `key` (typically IP) is rate-limited.
 *
 * Returns `true` if the request is ALLOWED, `false` if it should be blocked.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { attempts: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (entry.attempts >= config.maxAttempts) {
    return false;
  }

  entry.attempts++;
  return true;
}

/**
 * Extract a usable IP key from request headers.
 */
export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  // Fallback
  return 'unknown';
}
