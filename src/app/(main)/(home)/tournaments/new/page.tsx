'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CreateTournamentPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [eventMode, setEventMode] = useState<'IRL' | 'ONLINE'>('IRL');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error('You must be signed in');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), eventMode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tournament');
      }

      toast.success('Tournament created');
      router.push(`/tournaments/${data.id}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to create tournament');
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
          <Trophy className="h-8 w-8 text-cyan-500" />
          <h1 className="text-3xl font-bold">Create Tournament</h1>
        </div>
        <p className="text-muted-foreground">Create a new debate tournament.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>Enter a name for your tournament.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Spring Championship 2026"
                required 
                maxLength={120} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventMode">Event Mode <span className="text-red-500">*</span></Label>
              <select
                id="eventMode"
                value={eventMode}
                onChange={(e) => setEventMode(e.target.value as 'IRL' | 'ONLINE')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="IRL">In Real Life (IRL)</option>
                <option value="ONLINE">Online</option>
              </select>
              <p className="text-xs text-muted-foreground">This cannot be changed after the tournament is created.</p>
            </div>

            <div className="flex gap-3">
              <Button 
                type="submit" 
                className="bg-cyan-500 hover:bg-cyan-600" 
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  'Create Tournament'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
