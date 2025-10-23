'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  Plus, MapPin, FileText, Users, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TournamentAdminPage() {
  const params = useParams();
  const { user } = useUser();
  const [tournament, setTournament] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newVenue, setNewVenue] = useState({ name: '', url: '' });
  const [newRound, setNewRound] = useState({ name: '', stage: 'PRELIMINARY' });
  const [newMotion, setNewMotion] = useState({ text: '', infoSlide: '' });

  useEffect(() => {
    if (!params.id) return;

    Promise.all([
      fetch(`/api/tournaments`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/venues`).then(r => r.json()),
      fetch(`/api/tournaments/${params.id}/rounds`).then(r => r.json()),
    ])
      .then(([allTournaments, venuesData, roundsData]) => {
        const t = allTournaments.find((t: any) => t.id === params.id);
        setTournament(t);
        setVenues(venuesData);
        setRounds(roundsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, [params.id]);

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tournaments/${params.id}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVenue),
      });

      if (res.ok) {
        const venue = await res.json();
        setVenues([...venues, venue]);
        setNewVenue({ name: '', url: '' });
      }
    } catch (err) {
      console.error('Error adding venue:', err);
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tournaments/${params.id}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRound),
      });

      if (res.ok) {
        const round = await res.json();
        setRounds([...rounds, round]);
        setNewRound({ name: '', stage: 'PRELIMINARY' });
      }
    } catch (err) {
      console.error('Error adding round:', err);
    }
  };

  const handleAddMotion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tournaments/${params.id}/motions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMotion),
      });

      if (res.ok) {
        setNewMotion({ text: '', infoSlide: '' });
        alert('Motion added successfully!');
      }
    } catch (err) {
      console.error('Error adding motion:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Loading...</div>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Manage: {tournament.name}
        </h1>
        <p className="text-white/60">Configure venues, rounds, and motions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Venues Section */}
        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Venues</h2>
          </div>

          <form onSubmit={handleAddVenue} className="mb-4">
            <div className="space-y-3">
              <Input
                placeholder="Venue name"
                value={newVenue.name}
                onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white"
              />
              <Input
                placeholder="URL (optional)"
                value={newVenue.url}
                onChange={(e) => setNewVenue({ ...newVenue, url: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
              <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Venue
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {venues.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No venues added yet</p>
            ) : (
              venues.map((venue) => (
                <div
                  key={venue.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <p className="font-medium text-white">{venue.name}</p>
                  {venue.url && (
                    <p className="text-xs text-white/50 mt-1">{venue.url}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rounds Section */}
        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Rounds</h2>
          </div>

          <form onSubmit={handleAddRound} className="mb-4">
            <div className="space-y-3">
              <Input
                placeholder="Round name (e.g., Prelim 1)"
                value={newRound.name}
                onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
                required
                className="bg-white/5 border-white/10 text-white"
              />
              <select
                value={newRound.stage}
                onChange={(e) => setNewRound({ ...newRound, stage: e.target.value })}
                className="w-full p-2 bg-white/5 border border-white/10 rounded-md text-white"
              >
                <option value="PRELIMINARY">Preliminary</option>
                <option value="BREAK">Break</option>
                <option value="FINAL">Final</option>
              </select>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Round
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {rounds.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-4">No rounds created yet</p>
            ) : (
              rounds.map((round) => (
                <div
                  key={round.id}
                  className="p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{round.name}</p>
                      <p className="text-xs text-white/50">Stage: {round.stage}</p>
                    </div>
                    <span className="text-xs text-white/40">Seq: {round.seq}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Motions Section */}
        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">Add Motion</h2>
          </div>

          <form onSubmit={handleAddMotion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Motion Text
              </label>
              <textarea
                placeholder="This house believes that..."
                value={newMotion.text}
                onChange={(e) => setNewMotion({ ...newMotion, text: e.target.value })}
                required
                rows={3}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-md text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Info Slide (optional)
              </label>
              <textarea
                placeholder="Additional information about the motion..."
                value={newMotion.infoSlide}
                onChange={(e) => setNewMotion({ ...newMotion, infoSlide: e.target.value })}
                rows={2}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-md text-white resize-none"
              />
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Motion
            </Button>
          </form>
        </div>

        {/* Check-in Section */}
        <div className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Check-in Management</h2>
          </div>
          <p className="text-white/60 mb-4">
            Check-in functionality for teams and adjudicators will be available when rounds are scheduled.
          </p>
          <Button 
            variant="outline" 
            className="border-white/20"
            onClick={() => window.location.href = `/tournaments/${params.id}/checkin`}
          >
            Go to Check-in
          </Button>
        </div>
      </div>
    </div>
  );
}
