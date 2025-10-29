'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";

export function RevokeInviteButton({ token, onDone }: { token: string; onDone?: ()=>void }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="destructive"
      disabled={loading}
      onClick={async ()=>{
        setLoading(true);
        const res = await fetch('/api/team-invites/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        setLoading(false);
        if (res.ok) onDone?.();
      }}
    >
      Revoke
    </Button>
  );
}
