"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteDialog } from "@/components/teams/InviteDialog";

type Member = { id: string; email: string | null; username: string | null; imageUrl?: string | null };
type Team = { id: string; name: string; description: string | null; members?: Member[] };

export function TeamList() {
  const [teams, setTeams] = useState<Team[] | null>(null);

  async function load() {
    const res = await fetch("/api/teams/mine", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    setTeams(data);
  }

  useEffect(() => {
    load();
    const onRefresh = () => load();
    document.addEventListener("teams:refresh", onRefresh);
    return () => document.removeEventListener("teams:refresh", onRefresh);
  }, []);

  if (!teams) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="h-32 animate-pulse" /></Card>
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return <p className="text-sm text-muted-foreground">You are not in any teams yet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((t) => (
        <Card key={t.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="truncate">{t.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground">{t.description || "No description"}</p>
            <div className="mt-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Members</h4>
              <ul className="flex flex-wrap gap-2">
                {(t.members ?? []).map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.username ?? m.email ?? 'member'} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-700">
                        {(m.username ?? m.email ?? 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="leading-none">
                      <div className="text-sm truncate max-w-40">{m.username ?? m.email ?? 'Unknown'}</div>
                      <div className="text-[11px] text-muted-foreground">{m.email ?? ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <InviteDialog teamId={t.id} />
            <LeaveButton teamId={t.id} />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function LeaveButton({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch("/api/team-invites/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        });
        setLoading(false);
        if (res.ok) document.dispatchEvent(new Event("teams:refresh"));
      }}
    >
      {loading ? "Leaving…" : "Leave"}
    </Button>
  );
}
