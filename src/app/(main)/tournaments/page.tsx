'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tournament = {
  id: string;
  name: string;
  description?: string;
  status: string;
  isVerified: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  createdBy: {
    username: string;
  };
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'registration' | 'live' | 'completed'>('all');

  useEffect(() => {
    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data) => {
        setTournaments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching tournaments:', err);
        setLoading(false);
      });
  }, []);

  const filteredTournaments = tournaments.filter((tournament) => {
    if (filter === 'all') return true;
    return tournament.status === filter.toUpperCase();
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTRATION':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'LIVE':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'COMPLETED':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Browse Tournaments</h1>
            <p className="text-white/60">Discover and join debate tournaments</p>
          </div>
          <Link href="/tournaments/new">
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Trophy className="mr-2 h-4 w-4" />
              Create Tournament
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-6">
          {(['all', 'registration', 'live', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTournaments.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/40">
            No tournaments found
          </div>
        ) : (
          filteredTournaments.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.id}`}
              className="block group"
            >
              <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition mb-1">
                      {tournament.name}
                    </h3>
                    <p className="text-sm text-white/40">
                      by {tournament.createdBy.username}
                    </p>
                  </div>
                  {tournament.isVerified && (
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 ml-2" />
                  )}
                </div>

                {tournament.description && (
                  <p className="text-sm text-white/60 mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
                  {tournament.startDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(tournament.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      tournament.status
                    )}`}
                  >
                    {tournament.status}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
