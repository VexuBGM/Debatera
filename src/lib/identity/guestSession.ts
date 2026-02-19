import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { safeEqual } from './tokenUtils';

const GUEST_SESSION_COOKIE = 'guest_session';
const GUEST_SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export interface GuestSessionPayload {
  linkId: string;
  participantId: string;
  tournamentId: string;
  tokenHash: string;
  exp: number;
}

function getGuestSessionSecret(): string {
  const secret =
    process.env.GUEST_SESSION_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.CLERK_WEBHOOK_SECRET ||
    '';

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing GUEST_SESSION_SECRET');
    }
    return 'dev-guest-session-secret';
  }

  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signValue(value: string): string {
  const secret = getGuestSessionSecret();
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createGuestSessionValue(payload: Omit<GuestSessionPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + GUEST_SESSION_TTL_SECONDS;
  const data = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const signature = signValue(data);
  return `${data}.${signature}`;
}

export function verifyGuestSessionValue(value: string | null | undefined): GuestSessionPayload | null {
  if (!value) return null;
  const [data, signature] = value.split('.');
  if (!data || !signature) return null;

  const expected = signValue(data);
  const sigBuf = Buffer.from(signature, 'base64url');
  const expBuf = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(data)) as GuestSessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.linkId || !payload.participantId || !payload.tournamentId || !payload.tokenHash) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getGuestSessionCookieValue(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${GUEST_SESSION_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(GUEST_SESSION_COOKIE.length + 1));
}

export async function validateGuestSessionCookie(
  request: Request,
  tournamentId: string
) {
  const cookieValue = getGuestSessionCookieValue(request);
  const payload = verifyGuestSessionValue(cookieValue);
  if (!payload) return null;

  if (payload.tournamentId !== tournamentId) return null;

  const link = await prisma.participantPrivateLink.findUnique({
    where: { id: payload.linkId },
    include: {
      participant: {
        include: {
          person: true,
          institution: true,
          tournament: true,
        },
      },
    },
  });

  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  if (!safeEqual(link.tokenHash, payload.tokenHash)) return null;
  if (link.tournamentParticipantId !== payload.participantId) return null;

  prisma.participantPrivateLink
    .update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* best-effort */
    });

  return {
    link,
    participant: link.participant,
    person: link.participant.person,
    institution: link.participant.institution,
    tournament: link.participant.tournament,
  };
}

export function buildGuestSessionCookieValue(link: {
  id: string;
  tokenHash: string;
  participantId: string;
}, tournamentId: string): string {
  return createGuestSessionValue({
    linkId: link.id,
    tokenHash: link.tokenHash,
    participantId: link.participantId,
    tournamentId,
  });
}

export const guestSessionCookieName = GUEST_SESSION_COOKIE;
export const guestSessionMaxAgeSeconds = GUEST_SESSION_TTL_SECONDS;
