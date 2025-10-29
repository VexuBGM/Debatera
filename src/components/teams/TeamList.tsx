"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteDialog } from "@/components/teams/InviteDialog";

type Team = { id: string; name: string; description: string | null };

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
