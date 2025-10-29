"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function JoinByTokenForm() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/team-invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg("Joined team");
      setToken("");
      document.dispatchEvent(new Event("teams:refresh"));
    } else {
      setMsg(data?.error ?? "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join by invite</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-3">
          <div className="grid gap-1">
            <Label htmlFor="invite-token">Invite token</Label>
            <Input id="invite-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste token" />
          </div>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={loading || token.length < 10}>{loading ? "Joining…" : "Join"}</Button>
          <Button type="button" variant="secondary" onClick={() => {
            const url = new URL(window.location.href);
            const t = url.searchParams.get("token");
            if (t) setToken(t);
          }}>Load token from URL</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
