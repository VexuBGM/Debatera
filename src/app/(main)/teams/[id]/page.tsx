'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  UserPlus,
  UserMinus,
  Trash2,
  Loader2
} from 'lucide-react';

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
    joinedAt: string;
  }[];
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/teams/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (error) {
      console.error('Failed to fetch team:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinTeam = async () => {
    if (!clerkUser) return;

    setJoining(true);
    try {
      // Get the user ID from the database
      const userRes = await fetch('/api/user');
      if (!userRes.ok) return;
      
      const userData = await userRes.json();
      
      const res = await fetch(`/api/teams/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id }),
      });

      if (res.ok) {
        await fetchTeam();
        setShowJoinModal(false);
      }
    } catch (error) {
      console.error('Failed to join team:', error);
    } finally {
      setJoining(false);
    }
  };

  const leaveTeam = async () => {
    if (!clerkUser) return;

    setLeaving(true);
    try {
      const userRes = await fetch('/api/user');
      if (!userRes.ok) return;
      
      const userData = await userRes.json();

      const res = await fetch(`/api/teams/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id }),
      });

      if (res.ok) {
        await fetchTeam();
      }
    } catch (error) {
      console.error('Failed to leave team:', error);
    } finally {
      setLeaving(false);
    }
  };

  const deleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/teams');
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold text-white">Team not found</h3>
            <Button
              asChild
              className="mt-4 gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Link href="/teams">
                <ArrowLeft className="h-4 w-4" />
                Back to Teams
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMember = team.members.some(
    (m) => m.user.username === clerkUser?.username
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/teams">
              <ArrowLeft className="h-4 w-4" />
              Back to Teams
            </Link>
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              {team.tournament && (
                <p className="mt-2 text-white/60">
                  <Trophy className="mr-1 inline h-4 w-4" />
                  Registered for {team.tournament.name}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {!isMember ? (
                <Button
                  onClick={() => setShowJoinModal(true)}
                  className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Team
                </Button>
              ) : (
                <Button
                  onClick={leaveTeam}
                  disabled={leaving}
                  variant="outline"
                  className="gap-2 rounded-lg border-white/20 text-white hover:bg-white/10"
                >
                  {leaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                  Leave Team
                </Button>
              )}
              {isMember && (
                <Button
                  onClick={deleteTeam}
                  disabled={deleting}
                  variant="outline"
                  className="gap-2 rounded-lg border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Team
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Join Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md border-white/10 bg-[#0b1530] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Join {team.name}</CardTitle>
                <CardDescription className="text-white/60">
                  You will become a member of this team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowJoinModal(false)}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={joinTeam}
                    disabled={joining}
                    className="flex-1 bg-cyan-500 text-black hover:bg-cyan-400"
                  >
                    {joining ? 'Joining...' : 'Join'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Members */}
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5" />
              Members ({team.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {team.members.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-white/40" />
                <h3 className="mb-2 text-lg font-semibold text-white">
                  No members yet
                </h3>
                <p className="text-white/60">
                  Be the first to join this team
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-medium text-cyan-400">
                        {member.user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {member.user.username}
                        </p>
                        <p className="text-sm text-white/50">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
