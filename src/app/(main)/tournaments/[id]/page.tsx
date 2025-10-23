'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  Trophy, Users, Calendar, CheckCircle, Settings,
  UserPlus, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Tournament = {
  id: string;
  name: string;
  description?: string;
  status: string;
  isVerified: boolean;
  registrationOpen: boolean;
  startDate?: string;
  endDate?: string;
  createdById: string;
  createdBy: {
    id: string;
    username: string;
  };
};

export default function TournamentDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<{id: string; name: string; tournamentId?: string; members?: unknown[]}[]>([]);
  const [adjudicators, setAdjudicators] = useState<{id: string}[]>([]);
  const [rounds, setRounds] = useState<{id: string; name: string; stage: string; startsAt?: string; isDrawReleased: boolean; isMotionReleased: boolean; debates?: unknown[]}[]>([]);

  const isAdmin = tournament && user && (tournament.createdById === user.id);

  useEffect(() => {
    if (!params.id) return;

    // Fetch tournament details
    Promise.all([
      fetch(`/api/tournaments`).then(r => r.json()),
      fetch(`/api/teams`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/adjudicators`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/rounds`).then(r => r.json()),
    ])
      .then(([allTournaments, allTeams, adjudicatorsData, roundsData]) => {
        const t = allTournaments.find((tournament: {id: string}) => tournament.id === params.id);
        setTournament(t);
        setTeams(allTeams.filter((team: {tournamentId?: string}) => team.tournamentId === params.id));
        setAdjudicators(adjudicatorsData);
        setRounds(roundsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching tournament:', err);
        setLoading(false);
      });
  }, [params.id, user]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/tournaments/${params.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTournament(updated);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Tournament not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
                {tournament.isVerified && (
                  <CheckCircle className="h-6 w-6 text-green-400" />
                )}
              </div>
              <p className="text-white/60">
                Organized by {tournament.createdBy.username}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link href={`/tournaments/${tournament.id}/admin`}>
              <Button variant="outline" className="border-white/20">
                <Settings className="mr-2 h-4 w-4" />
                Manage Tournament
              </Button>
            </Link>
          )}
        </div>

        {tournament.description && (
          <p className="text-white/80 mb-6">{tournament.description}</p>
        )}

        {/* Status and Dates */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white/60">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              tournament.status === 'LIVE' ? 'bg-green-500/20 text-green-300' :
              tournament.status === 'REGISTRATION' ? 'bg-blue-500/20 text-blue-300' :
              tournament.status === 'COMPLETED' ? 'bg-gray-500/20 text-gray-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {tournament.status}
            </span>
          </div>
          {tournament.startDate && (
            <div className="flex items-center gap-2 text-white/60">
              <Calendar className="h-4 w-4" />
              {new Date(tournament.startDate).toLocaleDateString()}
              {tournament.endDate && ` - ${new Date(tournament.endDate).toLocaleDateString()}`}
            </div>
          )}
        </div>

        {/* Admin Status Controls */}
        {isAdmin && (
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm font-medium text-white/80 mb-3">Change Tournament Status:</p>
            <div className="flex gap-2">
              {['DRAFT', 'REGISTRATION', 'LIVE', 'COMPLETED'].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={tournament.status === status ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(status)}
                  disabled={tournament.status === status}
                  className={tournament.status === status ? '' : 'border-white/20'}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Teams</h3>
          </div>
          <p className="text-3xl font-bold text-white">{teams.length}</p>
          <p className="text-sm text-white/50 mt-1">Registered teams</p>
        </div>

        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Adjudicators</h3>
          </div>
          <p className="text-3xl font-bold text-white">{adjudicators.length}</p>
          <p className="text-sm text-white/50 mt-1">Registered judges</p>
        </div>

        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-green-400" />
            <h3 className="font-semibold text-white">Rounds</h3>
          </div>
          <p className="text-3xl font-bold text-white">{rounds.length}</p>
          <p className="text-sm text-white/50 mt-1">Total rounds</p>
        </div>
      </div>

      {/* Registration Section */}
      {tournament.status === 'REGISTRATION' && tournament.registrationOpen && (
        <div className="mb-8 p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-4">Registration Open</h2>
          <p className="text-white/80 mb-4">
            This tournament is currently accepting registrations for teams and adjudicators.
          </p>
          <div className="flex gap-3">
            <Link href={`/tournaments/${tournament.id}/register/team`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Users className="mr-2 h-4 w-4" />
                Register Team
              </Button>
            </Link>
            <Link href={`/tournaments/${tournament.id}/register/adjudicator`}>
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                <UserPlus className="mr-2 h-4 w-4" />
                Register as Adjudicator
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Rounds Section */}
      {rounds.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Rounds</h2>
          <div className="space-y-3">
            {rounds.map((round) => (
              <Link
                key={round.id}
                href={`/tournaments/${tournament.id}/rounds/${round.id}`}
                className="block bg-[#0d1b2e] border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {round.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <span>Stage: {round.stage}</span>
                      <span>Debates: {round.debates?.length || 0}</span>
                      {round.startsAt && (
                        <span>Starts: {new Date(round.startsAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {round.isDrawReleased && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                        Draw Released
                      </span>
                    )}
                    {round.isMotionReleased && (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
                        Motion Released
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Teams List */}
      {teams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Registered Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-[#0d1b2e] border border-white/10 rounded-xl p-4"
              >
                <h3 className="font-semibold text-white mb-2">{team.name}</h3>
                <p className="text-sm text-white/50">
                  {team.members?.length || 0} members
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
