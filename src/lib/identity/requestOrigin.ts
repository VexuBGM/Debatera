export function getExpectedOrigin(request: Request): string | null {
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host');
  if (!host) return null;
  return `${proto}://${host}`;
}

export function getRequestOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (origin) return origin;
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isSameOrigin(request: Request): boolean {
  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) return false;
  const expected = getExpectedOrigin(request);
  if (!expected) return false;
  return requestOrigin === expected;
}
