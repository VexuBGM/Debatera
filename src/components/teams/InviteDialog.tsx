"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function InviteDialog({ teamId }: { teamId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [expires, setExpires] = useState(7);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createInvite() {
    setLoading(true);
    setUrl(null);
    const res = await fetch("/api/team-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, email: email || undefined, expiresInDays: expires }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setUrl(data.url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Invite</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create invite</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" placeholder="someone@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="days">Expires in days</Label>
            <Input id="days" type="number" min={1} max={30} value={expires} onChange={(e)=>setExpires(Number(e.target.value)||7)} />
          </div>
          <Button onClick={createInvite} disabled={loading}>{loading ? "Creating…" : "Create invite"}</Button>
          {url && (
            <div className="grid gap-1.5">
              <Label htmlFor="link">Invite link</Label>
              <div className="flex gap-2">
                <Input id="link" readOnly value={url} />
                <Button type="button" onClick={()=>navigator.clipboard.writeText(url)}>Copy</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}