import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureClaimsForCurrentUser } from './claimFlow';

const mockAuth = vi.fn();
const mockClerkClient = vi.fn();

const mockPersonFindMany = vi.fn();
const mockPersonUpdate = vi.fn();
const mockParticipantFindMany = vi.fn();
const mockParticipantUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  clerkClient: mockClerkClient,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findMany: mockPersonFindMany,
      update: mockPersonUpdate,
    },
    tournamentParticipant: {
      findMany: mockParticipantFindMany,
      update: mockParticipantUpdate,
    },
    $transaction: mockTransaction,
  },
}));

describe('ensureClaimsForCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user_1' });
    mockClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          primaryEmailAddressId: 'email_1',
          emailAddresses: [{ id: 'email_1', emailAddress: 'test@example.com' }],
        }),
      },
    });

    mockTransaction.mockImplementation(async (fn: any) => {
      const tx = {
        person: { update: mockPersonUpdate },
        tournamentParticipant: {
          findMany: mockParticipantFindMany,
          update: mockParticipantUpdate,
        },
      };
      return fn(tx);
    });
  });

  it('claims a single deterministic person and backfills participants', async () => {
    const now = new Date();
    mockPersonFindMany.mockResolvedValue([
      {
        id: 'p1',
        claimedByUserId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2025-01-01'),
        _count: { tournamentParticipants: 1 },
      },
      {
        id: 'p2',
        claimedByUserId: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: now,
        _count: { tournamentParticipants: 3 },
      },
      {
        id: 'p3',
        claimedByUserId: 'user_1',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { tournamentParticipants: 2 },
      },
    ]);

    mockParticipantFindMany
      .mockResolvedValueOnce([
        { id: 'tp1', tournamentId: 't1' },
        { id: 'tp2', tournamentId: 't2' },
      ])
      .mockResolvedValueOnce([]);

    await ensureClaimsForCurrentUser();

    expect(mockPersonUpdate).toHaveBeenCalledTimes(1);
    expect(mockPersonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p2' } })
    );

    expect(mockParticipantUpdate).toHaveBeenCalledTimes(2);
  });

  it('skips backfill when unique constraint would be violated', async () => {
    mockPersonFindMany.mockResolvedValue([
      {
        id: 'p1',
        claimedByUserId: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2025-01-01'),
        _count: { tournamentParticipants: 1 },
      },
    ]);

    mockParticipantFindMany
      .mockResolvedValueOnce([
        { id: 'tp1', tournamentId: 't1' },
      ])
      .mockResolvedValueOnce([{ tournamentId: 't1' }]);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await ensureClaimsForCurrentUser();

    expect(mockParticipantUpdate).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
