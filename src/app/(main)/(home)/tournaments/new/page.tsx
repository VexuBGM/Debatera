'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CreateTournamentPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', rosterFreezeAt: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('You must be signed in');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { name: form.name.trim(), description: form.description.trim() || '' };
      if (form.rosterFreezeAt) {
        // Convert from local datetime-local to ISO string
        const iso = new Date(form.rosterFreezeAt).toISOString();
        payload.rosterFreezeAt = iso;
      }

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tournament');
      }

      toast.success('Tournament created');
      router.push(`/tournaments/${data.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create tournament');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <Link href="/tournaments">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournaments
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-8 w-8 text-cyan-500" />
          <h1 className="text-3xl font-bold">Create Tournament</h1>
        </div>
        <p className="text-muted-foreground">Create a tournament and optionally freeze the roster at a specific time.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>Create a tournament and control roster freeze.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} maxLength={2000} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rosterFreezeAt">Roster Freeze (optional)</Label>
              <Input id="rosterFreezeAt" type="datetime-local" value={form.rosterFreezeAt} onChange={(e) => setForm({ ...form, rosterFreezeAt: e.target.value })} />
              <p className="text-sm text-muted-foreground">If set, the roster will be frozen at this time (only admins can change after).</p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600" disabled={isLoading || !form.name.trim()}>
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>) : ('Create Tournament')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
