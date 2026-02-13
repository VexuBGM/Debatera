/**
 * /tournaments/[id]/rounds/[roundId]/debates/[dId]/call
 *
 * Server component: validates access, loads metadata, then renders the
 * client-side <DebateCallRoom />.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventMode, TournamentRoundStatus } from "@prisma/client";
import { getDebateRoleForUser } from "@/lib/stream/eligibility";
import DebateCallRoom from "./DebateCallRoom";

export const runtime = "nodejs";

interface PageProps {
  params: Promise<{ id: string; roundId: string; dId: string }>;
}

export default async function DebateCallPage({ params }: PageProps) {
  const { id, roundId, dId } = await params;
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  // Load debate + round + tournament settings
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
    },
  });

  // Validate
  if (!debate) redirect(`/tournaments/${id}/rounds/${roundId}`);
  if (debate.roundId !== roundId) redirect(`/tournaments/${id}/rounds/${roundId}`);
  if (debate.round.tournament.id !== id) redirect(`/tournaments/${id}/rounds/${roundId}`);

  const settings = debate.round.tournament.settings;
  if (!settings || settings.eventMode !== EventMode.ONLINE)
    redirect(`/tournaments/${id}/rounds/${roundId}`);
  if (debate.round.status === TournamentRoundStatus.DRAFT)
    redirect(`/tournaments/${id}/rounds/${roundId}`);
  if (debate.isBye) redirect(`/tournaments/${id}/rounds/${roundId}`);

  // Check eligibility
  const role = await getDebateRoleForUser({ debateId: dId, userId });
  if (!role) redirect(`/tournaments/${id}/rounds/${roundId}`);

  // Fetch user info for Stream user object
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, imageUrl: true },
  });

  return (
    <DebateCallRoom
      tournamentId={id}
      roundId={roundId}
      debateId={dId}
      userId={userId}
      userName={user?.username ?? "User"}
      userImage={user?.imageUrl ?? undefined}
      role={role}
      roundName={debate.round.name}
      tournamentName={debate.round.tournament.name}
    />
  );
}
