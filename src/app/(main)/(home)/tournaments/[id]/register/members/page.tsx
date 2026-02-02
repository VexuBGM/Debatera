import { TournamentMembersRegistrationPage } from './_components/TournamentMembersRegistrationPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Register members</h1>
        <p className="text-sm text-muted-foreground">
          Request institution registration, then register participants for this tournament.
        </p>
      </div>

      <TournamentMembersRegistrationPage tournamentId={id} />
    </main>
  );
}
