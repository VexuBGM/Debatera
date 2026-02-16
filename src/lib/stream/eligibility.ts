/**
 * Stream Video – Eligibility helpers
 *
 * Determines whether a user may join a debate call and what role they have.
 */

import { prisma } from "@/lib/prisma";
import { EventMode, TournamentRoundStatus } from "@prisma/client";
import { displayNameFromDbUser } from "@/lib/users/displayName";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DebateStreamRole = "judge" | "debater";

export interface CallMember {
  userId: string;
  role: DebateStreamRole;
  name?: string;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// getDebateRoleForUser
// ---------------------------------------------------------------------------

/**
 * Returns the Stream call role for a user in a specific debate, or `null`
 * if the user is not eligible (wrong event mode, round still draft, bye, or
 * simply not a participant in this debate).
 */
export async function getDebateRoleForUser({
  debateId,
  userId,
}: {
  debateId: string;
  userId: string;
}): Promise<DebateStreamRole | null> {
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    include: {
      round: {
        include: {
          tournament: {
            include: { settings: true },
          },
        },
      },
      propTeam: {
        include: {
          members: {
            include: { participant: { select: { userId: true } } },
          },
        },
      },
      oppTeam: {
        include: {
          members: {
            include: { participant: { select: { userId: true } } },
          },
        },
      },
      judges: {
        include: { participant: { select: { userId: true } } },
      },
    },
  });

  if (!debate) return null;

  // ONLINE-only
  if (debate.round.tournament.settings?.eventMode !== EventMode.ONLINE) return null;
  // Not during DRAFT
  if (debate.round.status === TournamentRoundStatus.DRAFT) return null;
  // Skip BYE debates
  if (debate.isBye) return null;

  // Check debater
  const isPropMember = debate.propTeam?.members.some(
    (m) => m.participant.userId === userId
  );
  const isOppMember = debate.oppTeam?.members.some(
    (m) => m.participant.userId === userId
  );
  if (isPropMember || isOppMember) return "debater";

  // Check judge
  const isJudge = debate.judges.some(
    (j) => j.participant.userId === userId
  );
  if (isJudge) return "judge";

  return null;
}

// ---------------------------------------------------------------------------
// listDebateCallMembers
// ---------------------------------------------------------------------------

/**
 * Returns ALL eligible users for a debate call (both teams' members + judges).
 * Used when creating/updating the Stream call membership list.
 */
export async function listDebateCallMembers(
  debateId: string
): Promise<CallMember[]> {
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: debateId },
    include: {
      propTeam: {
        include: {
          members: {
            include: {
              participant: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true } },
                },
              },
            },
          },
        },
      },
      oppTeam: {
        include: {
          members: {
            include: {
              participant: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true } },
                },
              },
            },
          },
        },
      },
      judges: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!debate) return [];

  const members: CallMember[] = [];
  const seen = new Set<string>();

  // Prop team members -> debater
  for (const m of debate.propTeam?.members ?? []) {
    const u = m.participant.user;
    if (u && !seen.has(u.id)) {
      seen.add(u.id);
      members.push({
        userId: u.id,
        role: "debater",
        name: displayNameFromDbUser(u),
        imageUrl: u.imageUrl ?? undefined,
      });
    }
  }

  // Opp team members -> debater
  for (const m of debate.oppTeam?.members ?? []) {
    const u = m.participant.user;
    if (u && !seen.has(u.id)) {
      seen.add(u.id);
      members.push({
        userId: u.id,
        role: "debater",
        name: displayNameFromDbUser(u),
        imageUrl: u.imageUrl ?? undefined,
      });
    }
  }

  // Judges -> judge
  for (const j of debate.judges) {
    const u = j.participant.user;
    if (u && !seen.has(u.id)) {
      seen.add(u.id);
      members.push({
        userId: u.id,
        role: "judge",
        name: displayNameFromDbUser(u),
        imageUrl: u.imageUrl ?? undefined,
      });
    }
  }

  return members;
}
