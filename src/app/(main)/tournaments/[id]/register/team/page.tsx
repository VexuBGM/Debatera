'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterTeamPage() {
  const params = useParams();
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [speakerNames, setSpeakerNames] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create team
      const teamRes = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          tournamentId: params.id,
        }),
      });

      if (!teamRes.ok) {
        const data = await teamRes.json();
        throw new Error(data.error || 'Failed to register team');
      }

      // Redirect to tournament page
      router.push(`/tournaments/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Register Team</h1>
            <p className="text-white/60">Join the tournament with your debate team</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Team Name *
            </label>
            <Input
              type="text"
              placeholder="Enter your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/40 mt-1">
              Choose a unique name for your team
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Speaker Names (optional)
            </label>
            <Input
              type="text"
              placeholder="e.g., John Doe, Jane Smith"
              value={speakerNames}
              onChange={(e) => setSpeakerNames(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/40 mt-1">
              Comma-separated list of speaker names
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1 border-white/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Registering...' : 'Register Team'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
