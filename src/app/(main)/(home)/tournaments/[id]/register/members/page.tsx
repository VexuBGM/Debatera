import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TournamentMembersRegistrationPage } from './_components/TournamentMembersRegistrationPage';
import { HelpTopics } from '@/components/docs/HelpLink';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournamentExists = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!tournamentExists) notFound();

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Register members</h1>
        <p className="text-sm text-muted-foreground">
          Request institution registration, then register participants for this tournament.
        </p>
      </div>

      <HelpTopics
        topics={[
          { section: 'Registering for a Tournament' },
          { section: 'Adding Participants to a Tournament', label: 'Adding participants' },
        ]}
      />

      <TournamentMembersRegistrationPage tournamentId={id} />
    </main>
  );
}
