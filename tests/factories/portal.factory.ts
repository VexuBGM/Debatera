import type { PrismaClient } from '@prisma/client';
import { testPrisma } from '@tests/setup/prisma-test-client';
import { encryptToken, generateToken, getPortalTokenExpiresAt, hashToken } from '@/lib/portal';

export async function createPortalAccessLink(
  input: {
    tournamentId: string;
    participantId: string;
    token?: string;
    expiresAt?: Date;
    revokedAt?: Date | null;
  },
  prisma: PrismaClient = testPrisma
) {
  const token = input.token ?? generateToken();
  const link = await prisma.tournamentParticipantAccessLink.create({
    data: {
      tournamentId: input.tournamentId,
      participantId: input.participantId,
      tokenHash: hashToken(token),
      encryptedToken: encryptToken(token),
      expiresAt: input.expiresAt ?? getPortalTokenExpiresAt(),
      revokedAt: input.revokedAt ?? null,
    },
  });

  return { token, link };
}
