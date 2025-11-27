/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated service like Upstash
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens to track
}

interface TokenBucket {
  count: number;
  resetTime: number;
}

const cache = new Map<string, TokenBucket>();

export function rateLimit(config: RateLimitConfig) {
  const { interval, uniqueTokenPerInterval } = config;

  return {
    check: async (limit: number, token: string): Promise<void> => {
      const now = Date.now();
      const bucket = cache.get(token);

      if (!bucket || now > bucket.resetTime) {
        cache.set(token, { count: 1, resetTime: now + interval });
        cleanupOldEntries(now);
        return;
      }

      if (bucket.count >= limit) {
        throw new Error('Rate limit exceeded');
      }

      bucket.count++;
    },
  };
}

function cleanupOldEntries(now: number) {
  // Cleanup old entries to prevent memory leaks
  if (cache.size > 1000) {
    for (const [key, value] of cache.entries()) {
      if (now > value.resetTime) {
        cache.delete(key);
      }
    }
  }
}
