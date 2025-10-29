'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage() {
  const sp = useSearchParams();
  const token = sp.get('token');
  const router = useRouter();
  const [status, setStatus] = useState<'idle'|'ok'|'error'>('idle');
  const [message, setMessage] = useState<string>('Processing…');

  useEffect(() => {
    async function accept() {
      if (!token) { setStatus('error'); setMessage('Missing invite token'); return; }
      const res = await fetch('/api/team-invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setStatus('ok'); setMessage('Joined team'); }
      else { setStatus('error'); setMessage(data?.error ?? 'Failed to accept invite'); }
    }
    accept();
  }, [token]);

  return (
    <div className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader><CardTitle>Team invite</CardTitle></CardHeader>
        <CardContent><p>{message}</p></CardContent>
        <CardFooter>
          <Button onClick={()=>router.push('/')} variant="default">Continue</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
