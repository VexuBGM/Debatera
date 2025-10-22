'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        const tournament = await res.json();
        router.push(`/tournaments/${tournament.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create tournament');
      }
    } catch (err) {
      setError('Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          className="mb-4 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
          asChild
        >
          <Link href="/tournaments">
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>
        </Button>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Create Tournament</CardTitle>
            <CardDescription className="text-white/60">
              Set up a new debate tournament
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-white"
                >
                  Tournament Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Spring Championship 2025"
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-white"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your tournament..."
                  rows={4}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                  asChild
                  disabled={loading}
                >
                  <Link href="/tournaments">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !name}
                  className="flex-1 gap-2 bg-cyan-500 text-black hover:bg-cyan-400"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Tournament
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
