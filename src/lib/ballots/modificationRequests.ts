import {
  BallotModificationRequestStatus,
  BallotStatus,
  TournamentRoundStatus,
  type Prisma,
} from '@prisma/client';

import { prisma } from '@/lib/prisma';

export const latestBallotModificationRequestSelect = {
  id: true,
  status: true,
  reason: true,
  resolutionNote: true,
  createdAt: true,
  resolvedAt: true,
} as const;

type LatestBallotModificationRequestRecord = {
  id: string;
  status: BallotModificationRequestStatus;
  reason: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

export interface SerializedBallotModificationRequest {
  id: string;
  status: BallotModificationRequestStatus;
  reason: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export function serializeBallotModificationRequest(
  request: LatestBallotModificationRequestRecord | null | undefined
): SerializedBallotModificationRequest | null {
  if (!request) return null;

  return {
    id: request.id,
    status: request.status,
    reason: request.reason,
    resolutionNote: request.resolutionNote,
    createdAt: request.createdAt.toISOString(),
    resolvedAt: request.resolvedAt?.toISOString() ?? null,
  };
}

export function isBallotReopened(reopenedAt: Date | null | undefined) {
  return reopenedAt !== null && reopenedAt !== undefined;
}

export function canJudgeEditBallotState(args: {
  ballotStatus: BallotStatus;
  roundStatus: TournamentRoundStatus;
  reopenedAt?: Date | null;
}) {
  if (args.ballotStatus === BallotStatus.SUBMITTED) return false;
  if (args.roundStatus === TournamentRoundStatus.IN_PROGRESS) return true;

  return (
    args.roundStatus === TournamentRoundStatus.COMPLETED &&
    isBallotReopened(args.reopenedAt)
  );
}

export function canRequestBallotModification(args: {
  ballotStatus: BallotStatus;
  roundStatus: TournamentRoundStatus;
  hasPendingRequest: boolean;
}) {
  if (args.ballotStatus !== BallotStatus.SUBMITTED) return false;
  if (args.hasPendingRequest) return false;

  return (
    args.roundStatus === TournamentRoundStatus.IN_PROGRESS ||
    args.roundStatus === TournamentRoundStatus.COMPLETED
  );
}

type DebateResultClient = Pick<Prisma.TransactionClient, 'debateResult'>;

export async function invalidateDebateResult(
  debateId: string,
  tx: DebateResultClient = prisma
) {
  await tx.debateResult.deleteMany({
    where: { debateId },
  });
}
