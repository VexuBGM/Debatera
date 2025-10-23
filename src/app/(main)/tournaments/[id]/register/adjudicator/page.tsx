'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RegisterAdjudicatorPage() {
  const params = useParams();
  const router = useRouter();
  const [rating, setRating] = useState('5.0');
  const [isIndependent, setIsIndependent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${params.id}/adjudicators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: parseFloat(rating),
          isIndependent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register as adjudicator');
      }

      // Redirect to tournament page
      router.push(`/tournaments/${params.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Register as Adjudicator</h1>
            <p className="text-white/60">Join as a judge for this tournament</p>
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
              Experience Rating (0-10) *
            </label>
            <Input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="5.0"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/40 mt-1">
              Rate your judging experience (0 = beginner, 10 = expert)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="independent"
              checked={isIndependent}
              onChange={(e) => setIsIndependent(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            <label htmlFor="independent" className="text-sm text-white/80">
              I am an independent adjudicator (no team affiliation)
            </label>
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
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ? 'Registering...' : 'Register as Adjudicator'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
