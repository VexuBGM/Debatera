'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Trophy, Search } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  tournament: {
    id: string;
    name: string;
  } | null;
  members: {
    user: {
      id: string;
      username: string;
      imageUrl: string | null;
    };
  }[];
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredTeams(
        teams.filter((team) =>
          team.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredTeams(teams);
    }
  }, [searchQuery, teams]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        setFilteredTeams(data);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName }),
      });

      if (res.ok) {
        await fetchTeams();
        setNewTeamName('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="mt-2 text-white/60">
              Create and manage your debate teams
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="h-10 w-full rounded-lg border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40 md:w-96"
            />
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md border-white/10 bg-[#0b1530] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Create New Team</CardTitle>
                <CardDescription className="text-white/60">
                  Enter a name for your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Team name"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
                  onKeyDown={(e) => e.key === 'Enter' && createTeam()}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewTeamName('');
                    }}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createTeam}
                    disabled={creating || !newTeamName.trim()}
                    className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTeams.length === 0 && !searchQuery && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-white/40" />
              <h3 className="mb-2 text-lg font-semibold text-white">
                No teams yet
              </h3>
              <p className="mb-4 text-center text-white/60">
                Create your first team to get started
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Search Results */}
        {!loading && filteredTeams.length === 0 && searchQuery && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <h3 className="mb-2 text-lg font-semibold text-white">
                No teams found
              </h3>
              <p className="text-white/60">
                Try adjusting your search query
              </p>
            </CardContent>
          </Card>
        )}

        {/* Teams Grid */}
        {!loading && filteredTeams.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="group cursor-pointer border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:bg-white/10">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white group-hover:text-cyan-400">
                          {team.name}
                        </CardTitle>
                        {team.tournament && (
                          <CardDescription className="mt-1 text-white/60">
                            <Trophy className="mr-1 inline h-3 w-3" />
                            {team.tournament.name}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Users className="h-4 w-4" />
                      <span>{team.members.length} members</span>
                    </div>
                    {team.members.length > 0 && (
                      <div className="mt-3 flex -space-x-2">
                        {team.members.slice(0, 3).map((member) => (
                          <div
                            key={member.user.id}
                            className="h-8 w-8 rounded-full border-2 border-[#0b1530] bg-cyan-500/20 flex items-center justify-center text-xs font-medium text-cyan-400"
                          >
                            {member.user.username[0].toUpperCase()}
                          </div>
                        ))}
                        {team.members.length > 3 && (
                          <div className="h-8 w-8 rounded-full border-2 border-[#0b1530] bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
                            +{team.members.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
