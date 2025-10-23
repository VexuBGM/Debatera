'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckSquare, Users, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckInPage() {
  const params = useParams();
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [adjudicators, setAdjudicators] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any>({ teams: [], adjudicators: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    fetch(`/api/tournaments/${params.id}/rounds`)
      .then((res) => res.json())
      .then((data) => {
        setRounds(data);
        if (data.length > 0) {
          setSelectedRound(data[0].seq);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching rounds:', err);
        setLoading(false);
      });

    // Fetch teams and adjudicators
    Promise.all([
      fetch(`/api/teams`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/adjudicators`).then(r => r.json()),
    ])
      .then(([allTeams, adjudicatorsData]) => {
        setTeams(allTeams.filter((t: any) => t.tournamentId === params.id));
        setAdjudicators(adjudicatorsData);
      });
  }, [params.id]);

  useEffect(() => {
    if (selectedRound === null) return;

    fetch(`/api/tournaments/${params.id}/checkin?roundSeq=${selectedRound}`)
      .then((res) => res.json())
      .then((data) => {
        setCheckIns(data);
      })
      .catch((err) => {
        console.error('Error fetching check-ins:', err);
      });
  }, [params.id, selectedRound]);

  const handleCheckIn = async (type: 'team' | 'adjudicator', id: string, status: 'AVAILABLE' | 'UNAVAILABLE') => {
    try {
      const body: any = {
        roundSeq: selectedRound,
        status,
      };

      if (type === 'team') {
        body.teamId = id;
      } else {
        body.adjudicatorId = id;
      }

      const res = await fetch(`/api/tournaments/${params.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Refresh check-ins
        const data = await fetch(`/api/tournaments/${params.id}/checkin?roundSeq=${selectedRound}`)
          .then(r => r.json());
        setCheckIns(data);
      }
    } catch (err) {
      console.error('Error checking in:', err);
    }
  };

  const isCheckedIn = (type: 'team' | 'adjudicator', id: string) => {
    const list = type === 'team' ? checkIns.teams : checkIns.adjudicators;
    const item = list.find((c: any) => 
      type === 'team' ? c.teamId === id : c.adjudicatorId === id
    );
    return item?.status === 'AVAILABLE';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <CheckSquare className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Check-in</h1>
            <p className="text-white/60">Mark teams and adjudicators as available for rounds</p>
          </div>
        </div>

        {/* Round Selector */}
        {rounds.length > 0 && (
          <div className="flex gap-2 mt-6">
            <span className="text-white/60 py-2">Select Round:</span>
            {rounds.map((round) => (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.seq)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedRound === round.seq
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {round.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRound === null ? (
        <div className="text-center py-12 text-white/40">
          No rounds available. Create rounds in the tournament admin panel.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams */}
          <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Teams</h2>
            </div>

            <div className="space-y-2">
              {teams.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-8">No teams registered</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <span className="text-white font-medium">{team.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn('team', team.id, 'AVAILABLE')}
                        className={`${
                          isCheckedIn('team', team.id)
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Available
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn('team', team.id, 'UNAVAILABLE')}
                        className="border-white/20"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Unavailable
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Adjudicators */}
          <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Adjudicators</h2>
            </div>

            <div className="space-y-2">
              {adjudicators.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-8">No adjudicators registered</p>
              ) : (
                adjudicators.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div>
                      <span className="text-white font-medium">{adj.user.username}</span>
                      <span className="text-xs text-white/50 ml-2">Rating: {adj.rating}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn('adjudicator', adj.id, 'AVAILABLE')}
                        className={`${
                          isCheckedIn('adjudicator', adj.id)
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Available
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn('adjudicator', adj.id, 'UNAVAILABLE')}
                        className="border-white/20"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Unavailable
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
