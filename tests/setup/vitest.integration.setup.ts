import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import {
  resetTestDatabase,
  startTestDatabase,
  stopTestDatabase,
  testPrisma,
} from './prisma-test-client';
import {
  getMockAuthResult,
  getMockClerkUser,
  mockUnauthenticatedUser,
} from './clerk-mock';

vi.mock('@/lib/prisma', () => ({
  prisma: testPrisma,
  default: testPrisma,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => getMockAuthResult()),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async () => getMockClerkUser()),
    },
  })),
  currentUser: vi.fn(async () => getMockClerkUser()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/stream/ensure', () => ({
  ensureCallsForRound: vi.fn(async () => []),
  ensureDebateCall: vi.fn(async () => null),
}));

beforeAll(async () => {
  process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ?? 'test_clerk_secret';
  process.env.NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  await startTestDatabase();
});

beforeEach(async () => {
  mockUnauthenticatedUser();
  await resetTestDatabase();
  vi.clearAllMocks();
});

afterAll(async () => {
  await stopTestDatabase();
});
