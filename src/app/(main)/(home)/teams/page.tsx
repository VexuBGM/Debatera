import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinByTokenForm } from "@/components/teams/JoinByTokenForm";
import { TeamList } from "@/components/teams/TeamList";

export const runtime = "nodejs";

export default function TeamsPage() {
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <CreateTeamForm />
        <JoinByTokenForm />
      </div>
      <TeamList />
    </div>
  );
}
