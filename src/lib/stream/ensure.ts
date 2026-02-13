/**
 * Stream Video – Ensure debate call exists
 *
 * Shared logic used by both the `/api/stream/calls/ensure` endpoint
 * and the round-publish hook.
 */

import { prisma } from "@/lib/prisma";
import { streamServerClient } from "@/lib/stream/server";
import { listDebateCallMembers } from "@/lib/stream/eligibility";
import { EventMode, TournamentRoundStatus, VideoCallKind } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnsureDebateCallResult {
  callType: string;
  callId: string;
}

// ---------------------------------------------------------------------------
// ensureDebateCall
// ---------------------------------------------------------------------------

/**
 * Idempotently creates a Stream video call (and the `VideoCall` DB row) for
 * a single debate.  Safe to call many times – the same call is reused.
 *
 * @param tournamentId - must match the debate's tournament
 * @param debateId     - the TournamentDebate to create a call for
 * @param actorUserId  - a Clerk user id that will be used as `created_by_id`
 *                       (must already exist in Stream or will be upserted)
 */
export async function ensureDebateCall({
  tournamentId,
  debateId,
  actorUserId,
}: {
  tournamentId: string;
  debateId: string;
  actorUserId: string;
}): Promise<EnsureDebateCallResult> {
  // 1. Load the debate with relevant relations
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    include: {
      round: {
        include: {
          tournament: { include: { settings: true } },
        },
      },
    },
  });

  if (!debate) throw new Error("Debate not found");
  if (debate.round.tournament.id !== tournamentId)
    throw new Error("Debate does not belong to this tournament");
  if (debate.round.tournament.settings?.eventMode !== EventMode.ONLINE)
    throw new Error("Tournament is not ONLINE – no call required");
  if (debate.round.status === TournamentRoundStatus.DRAFT)
    throw new Error("Round is still in DRAFT – calls are not available yet");
  if (debate.isBye) throw new Error("BYE debates do not have calls");

  // 2. Deterministic identifiers
  const callType = "debate";
  const callId = `debate_${debateId}`;

  // 3. Upsert VideoCall DB record (idempotent)
  await prisma.videoCall.upsert({
    where: { debateId },
    create: {
      kind: VideoCallKind.DEBATE,
      tournamentId,
      debateId,
      callType,
      callId,
    },
    update: {
      tournamentId,
      callType,
      callId,
    },
  });

  // 4. Build member list
  const members = await listDebateCallMembers(debateId);

  // 5. Upsert Stream users (so member references are valid)
  const streamUsers: Record<string, { id: string; name?: string; image?: string }> = {};

  // Include the actor (creator) so created_by_id is always valid
  streamUsers[actorUserId] = { id: actorUserId };

  for (const m of members) {
    streamUsers[m.userId] = {
      id: m.userId,
      name: m.name,
      image: m.imageUrl,
    };
  }

  await streamServerClient.upsertUsers(Object.values(streamUsers));

  // 6. Create or get the Stream call
  const call = streamServerClient.video.call(callType, callId);

  await call.getOrCreate({
    data: {
      created_by_id: actorUserId,
      members: members.map((m) => ({
        user_id: m.userId,
        role: m.role, // "judge" | "debater"
      })),
    },
  });

  // 7. Best-effort: update members in case they changed since last creation
  try {
    await call.updateCallMembers({
      update_members: members.map((m) => ({
        user_id: m.userId,
        role: m.role,
      })),
    });
  } catch {
    // non-critical – the call still works without updated members
  }

  return { callType, callId };
}

// ---------------------------------------------------------------------------
// ensureCallsForRound
// ---------------------------------------------------------------------------

/**
 * Ensures every non-BYE debate in the round has a Stream call.
 * Called when a round transitions DRAFT -> PUBLISHED for an ONLINE tournament.
 *
 * Failures for individual debates are logged but do not block others.
 */
export async function ensureCallsForRound(
  roundId: string,
  actorUserId: string
): Promise<void> {
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: {
      tournament: { include: { settings: true } },
      debates: { where: { isBye: false }, select: { id: true } },
    },
  });

  if (!round) return;
  if (round.tournament.settings?.eventMode !== EventMode.ONLINE) return;

  const tournamentId = round.tournamentId;

  await Promise.allSettled(
    round.debates.map(async (d) => {
      try {
        await ensureDebateCall({
          tournamentId,
          debateId: d.id,
          actorUserId,
        });
      } catch (err) {
        console.error(
          `[stream] Failed to ensure call for debate ${d.id}:`,
          err
        );
      }
    })
  );
}
