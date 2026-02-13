/**
 * POST /api/stream/calls/ensure
 *
 * Idempotently creates a Stream video call for a debate.
 *
 * Request JSON: { kind: "debate", tournamentId: string, debateId: string }
 * Response JSON: { callType: string, callId: string }
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDebateRoleForUser } from "@/lib/stream/eligibility";
import { ensureDebateCall } from "@/lib/stream/ensure";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const EnsureBodySchema = z.object({
  kind: z.literal("debate"),
  tournamentId: z.string().min(1),
  debateId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    // 1. Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json().catch(() => null);
    const parsed = EnsureBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { tournamentId, debateId } = parsed.data;

    // 3. Authorization – user must be eligible OR tournament creator
    const role = await getDebateRoleForUser({ debateId, userId });
    if (!role) {
      // Check if user is the tournament creator (admin escape hatch)
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { createdByUserId: true },
      });
      if (tournament?.createdByUserId !== userId) {
        return NextResponse.json(
          { error: "Not authorized for this debate call" },
          { status: 403 }
        );
      }
    }

    // 4. Ensure call
    const result = await ensureDebateCall({
      tournamentId,
      debateId,
      actorUserId: userId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[stream/calls/ensure]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
