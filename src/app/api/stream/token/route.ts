/**
 * POST /api/stream/token
 *
 * Generates a short-lived Stream user token for this user for a specific
 * debate call.  The user must be eligible (debater or judge in that debate).
 *
 * Request JSON: { kind: "debate", debateId: string }
 * Response JSON: { token: string, role: "judge" | "debater" }
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDebateRoleForUser } from "@/lib/stream/eligibility";
import { streamServerClient } from "@/lib/stream/server";

export const runtime = "nodejs";

const TokenBodySchema = z.object({
  kind: z.literal("debate"),
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
    const parsed = TokenBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { debateId } = parsed.data;

    // 3. Check eligibility
    const role = await getDebateRoleForUser({ debateId, userId });
    if (!role) {
      return NextResponse.json(
        { error: "You are not eligible to join this debate call" },
        { status: 403 }
      );
    }

    // 4. Generate token – valid for 1 hour
    //    iat is set 60s in the past to avoid clock-skew errors
    //    ("token used before issued at")
    const iat = Math.floor(Date.now() / 1000) - 60;
    const token = streamServerClient.generateUserToken({
      user_id: userId,
      validity_in_seconds: 60 * 60,
      iat,
    });

    return NextResponse.json({ token, role });
  } catch (err: unknown) {
    console.error("[stream/token]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
