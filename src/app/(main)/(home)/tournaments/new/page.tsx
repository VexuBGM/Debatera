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
  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    startDate: '',
    contactInfo: '',
    entryFee: '0',
    registrationType: 'OPEN' as 'OPEN' | 'APPROVAL',
    rosterFreezeAt: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('You must be signed in');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { 
        name: form.name.trim(), 
        description: form.description.trim() || '',
        startDate: new Date(form.startDate).toISOString(),
        contactInfo: form.contactInfo.trim(),
        entryFee: parseFloat(form.entryFee),
        registrationType: form.registrationType,
      };
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
              <Label htmlFor="startDate">Start Date <span className="text-red-500">*</span></Label>
              <Input id="startDate" type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              <p className="text-sm text-muted-foreground">When does the tournament start?</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactInfo">Contact Information <span className="text-red-500">*</span></Label>
              <Textarea id="contactInfo" value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} rows={3} maxLength={500} required />
              <p className="text-sm text-muted-foreground">Email, phone, or other contact details for verification purposes.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee</Label>
              <Input id="entryFee" type="number" min="0" step="0.01" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} />
              <p className="text-sm text-muted-foreground">Tournament entry fee amount (0 for free entry).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationType">Registration Type</Label>
              <select 
                id="registrationType" 
                value={form.registrationType} 
                onChange={(e) => setForm({ ...form, registrationType: e.target.value as 'OPEN' | 'APPROVAL' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="OPEN">Open Entry - Anyone can join</option>
                <option value="APPROVAL">Approval Required - Registration needs confirmation</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rosterFreezeAt">Roster Freeze (optional)</Label>
              <Input id="rosterFreezeAt" type="datetime-local" value={form.rosterFreezeAt} onChange={(e) => setForm({ ...form, rosterFreezeAt: e.target.value })} />
              <p className="text-sm text-muted-foreground">If set, the roster will be frozen at this time (only admins can change after).</p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600" disabled={isLoading || !form.name.trim() || !form.startDate || !form.contactInfo.trim()}>
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
