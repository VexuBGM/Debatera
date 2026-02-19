import { randomBytes } from 'crypto';
import { safeEqual } from './tokenUtils';

const CSRF_COOKIE = 'guest_csrf';
const CSRF_HEADER = 'x-csrf-token';

export function createGuestCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function getGuestCsrfCookieValue(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(CSRF_COOKIE.length + 1));
}

export function validateGuestCsrf(request: Request): boolean {
  const cookieValue = getGuestCsrfCookieValue(request);
  const headerValue = request.headers.get(CSRF_HEADER);
  if (!cookieValue || !headerValue) return false;
  return safeEqual(cookieValue, headerValue);
}

export const guestCsrfCookieName = CSRF_COOKIE;
export const guestCsrfHeaderName = CSRF_HEADER;
