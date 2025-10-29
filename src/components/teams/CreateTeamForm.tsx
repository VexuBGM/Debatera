"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CreateTeamForm() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setName("");
      setDesc("");
      setMsg("Team created");
      // trigger refresh of team list
      document.dispatchEvent(new Event("teams:refresh"));
    } else {
      setMsg(data?.error ?? "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a team</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-3">
          <div className="grid gap-1">
            <Label htmlFor="team-name">Name</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="team-desc">Description</Label>
            <Textarea id="team-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} />
          </div>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
