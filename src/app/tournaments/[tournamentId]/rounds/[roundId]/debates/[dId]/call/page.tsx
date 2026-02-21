/**
 * /tournaments/[tournamentId]/rounds/[roundId]/debates/[dId]/call
 *
 * Server component: validates access, loads metadata, then renders the
 * client-side <DebateCallRoom />.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventMode, TournamentRoundStatus } from "@prisma/client";
import { getDebateRoleForUser } from "@/lib/stream/eligibility";
import { displayNameFromDbUser, displayNameFromParticipant } from "@/lib/users/displayName";
import DebateCallRoom from "./DebateCallRoom";

export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ tournamentId: string; roundId: string; dId: string }>;
}

export default async function DebateCallPage({ params }: PageProps) {
  const { tournamentId, roundId, dId } = await params;
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  // Load debate + round + tournament settings + teams/judges
  const debate = await prisma.tournamentDebate.findUnique({
    where: { id: dId },
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
            include: {
              participant: {
                include: {
                  person: { select: { firstName: true, lastName: true, emailNormalized: true } },
                  user: { select: { firstName: true, lastName: true, email: true } },
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
                  person: { select: { firstName: true, lastName: true, emailNormalized: true } },
                  user: { select: { firstName: true, lastName: true, email: true } },
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
              person: { select: { firstName: true, lastName: true, emailNormalized: true } },
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      },
    },
  });

  // Validate
  if (!debate) redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);
  if (debate.roundId !== roundId) redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);
  if (debate.round.tournament.id !== tournamentId) redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);

  const settings = debate.round.tournament.settings;
  if (!settings || settings.eventMode !== EventMode.ONLINE)
    redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);
  if (debate.round.status === TournamentRoundStatus.DRAFT)
    redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);
  if (debate.isBye) redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);

  // Check eligibility
  const role = await getDebateRoleForUser({ debateId: dId, userId });
  if (!role) redirect(`/tournaments/${tournamentId}/rounds/${roundId}`);

  // Fetch user info for Stream user object
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
  });

  // Build debate context for the info sidebar
  const debateContext = {
    propTeam: debate.propTeam
      ? {
          name: debate.propTeam.name,
          members: debate.propTeam.members.map((m) => displayNameFromParticipant(m.participant.person, m.participant.user)),
        }
      : null,
    oppTeam: debate.oppTeam
      ? {
          name: debate.oppTeam.name,
          members: debate.oppTeam.members.map((m) => displayNameFromParticipant(m.participant.person, m.participant.user)),
        }
      : null,
    judges: debate.judges.map((j) => ({
      name: displayNameFromParticipant(j.participant.person, j.participant.user),
      role: j.role as string,
    })),
  };

  return (
    <DebateCallRoom
      tournamentId={tournamentId}
      roundId={roundId}
      debateId={dId}
      userId={userId}
      userName={displayNameFromDbUser(user)}
      userImage={user?.imageUrl ?? undefined}
      role={role}
      roundName={debate.round.name}
      tournamentName={debate.round.tournament.name}
      motion={debate.round.motion ?? undefined}
      infoSlide={debate.round.infoSlide ?? undefined}
      debateContext={debateContext}
    />
  );
}
