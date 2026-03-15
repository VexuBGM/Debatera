import { NextResponse } from 'next/server';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __debateraRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets =
  globalForRateLimit.__debateraRateLimitBuckets ??
  new Map<string, RateLimitBucket>();

if (!globalForRateLimit.__debateraRateLimitBuckets) {
  globalForRateLimit.__debateraRateLimitBuckets = buckets;
}

export function getRequestIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

export function rateLimit(
  req: Request,
  scope: string,
  config: RateLimitConfig,
  subject?: string | null
): NextResponse | null {
  const now = Date.now();

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  const identifier = subject?.trim() || getRequestIp(req);
  const key = `${scope}:${identifier}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  current.count += 1;
  buckets.set(key, current);

  if (current.count <= config.limit) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((current.resetAt - now) / 1000)
  );

  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}
