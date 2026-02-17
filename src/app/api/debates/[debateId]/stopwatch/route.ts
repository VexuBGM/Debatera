/**
 * API: Debate Stopwatch
 *
 * GET  /api/debates/[debateId]/stopwatch  → { state, serverNowMs }
 * PUT  /api/debates/[debateId]/stopwatch  → { state, serverNowMs }
 *
 * GET: anyone eligible for the debate call can read.
 * PUT: only judges and the tournament creator (admin) can mutate.
 *
 * State transitions (server-authoritative):
 *   start → running=true, startedAtMs=now
 *   pause → baseElapsedMs += now - startedAtMs, running=false
 *   reset → running=false, baseElapsedMs=0, startedAtMs=null
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDebateRoleForUser } from "@/lib/stream/eligibility";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Serialise BigInt fields to numbers for JSON transport. */
function serialiseState(row: {
  running: boolean;
  startedAtMs: bigint | null;
  baseElapsedMs: bigint;
  version: number;
}) {
  return {
    running: row.running,
    startedAtMs: row.startedAtMs !== null ? Number(row.startedAtMs) : null,
    baseElapsedMs: Number(row.baseElapsedMs),
    version: row.version,
  };
}

/** Ensure a DebateStopwatch row exists (upsert with defaults). */
async function ensureStopwatch(debateId: string) {
  return prisma.debateStopwatch.upsert({
    where: { debateId },
    create: { debateId },
    update: {},
  });
}

/** Check whether `userId` is a judge for `debateId` OR the tournament creator. */
async function canMutateStopwatch(debateId: string, userId: string): Promise<boolean> {
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    select: {
      round: {
        select: {
          tournament: { select: { createdByUserId: true } },
        },
      },
      judges: {
        where: { participant: { userId } },
        select: { id: true },
      },
    },
  });
  if (!debate) return false;

  const isCreator = debate.round.tournament.createdByUserId === userId;
  const isJudge = debate.judges.length > 0;
  return isCreator || isJudge;
}

// ---------------------------------------------------------------------------
// GET  /api/debates/[debateId]/stopwatch
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ debateId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { debateId } = await params;

    // Any debate participant can read
    const role = await getDebateRoleForUser({ debateId, userId });
    if (!role) {
      // Also allow tournament creator
      const debate = await prisma.tournamentDebate.findUnique({
        where: { id: debateId },
        select: { round: { select: { tournament: { select: { createdByUserId: true } } } } },
      });
      if (!debate || debate.round.tournament.createdByUserId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const row = await ensureStopwatch(debateId);
    const serverNowMs = Date.now();

    return NextResponse.json({
      state: serialiseState(row),
      serverNowMs,
    });
  } catch (err) {
    console.error("[stopwatch GET] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT  /api/debates/[debateId]/stopwatch
// ---------------------------------------------------------------------------

const PutBodySchema = z.object({
  action: z.enum(["start", "pause", "reset"]),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ debateId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { debateId } = await params;

    // Parse body
    const body = await req.json().catch(() => null);
    const parsed = PutBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Permission: only judges / tournament creator
    const allowed = await canMutateStopwatch(debateId, userId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Only judges and admins can control the stopwatch" },
        { status: 403 }
      );
    }

    const { action } = parsed.data;
    const serverNowMs = Date.now();

    // Ensure row exists before transacting
    await ensureStopwatch(debateId);

    // Atomic state transition
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.debateStopwatch.findUniqueOrThrow({
        where: { debateId },
      });

      switch (action) {
        case "start": {
          if (current.running) return current; // no-op
          return tx.debateStopwatch.update({
            where: { debateId },
            data: {
              running: true,
              startedAtMs: BigInt(serverNowMs),
              version: current.version + 1,
            },
          });
        }

        case "pause": {
          if (!current.running) return current; // no-op
          const elapsed =
            current.startedAtMs !== null
              ? BigInt(serverNowMs) - current.startedAtMs
              : BigInt(0);
          return tx.debateStopwatch.update({
            where: { debateId },
            data: {
              running: false,
              startedAtMs: null,
              baseElapsedMs: current.baseElapsedMs + elapsed,
              version: current.version + 1,
            },
          });
        }

        case "reset": {
          return tx.debateStopwatch.update({
            where: { debateId },
            data: {
              running: false,
              startedAtMs: null,
              baseElapsedMs: BigInt(0),
              version: current.version + 1,
            },
          });
        }
      }
    });

    return NextResponse.json({
      state: serialiseState(updated),
      serverNowMs,
    });
  } catch (err) {
    console.error("[stopwatch PUT] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
