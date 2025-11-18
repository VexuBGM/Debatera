'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Loader2, Users, Gavel, ArrowRight, Calendar, Trophy, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { RoleSelectionDialog } from './rounds/RoleSelectionDialog'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

interface User {
  id: string;
  username: string | null;
  email: string | null;
}

interface Institution {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  teamNumber: number;
  institution: Institution;
  participations: Array<{
    user: User;
  }>;
}

interface Judge {
  id: string;
  isChair: boolean;
  user: User;
  institution: Institution | null;
}

interface Round {
  id: string;
  number: number;
  name: string;
  motion: string | null;
  infoSlide: string | null;
  status?: 'PLANNING' | 'PUBLISHED' | 'BALLOTING' | 'FINAL' | 'CANCELLED';
}

interface Pairing {
  id: string;
  scheduledAt: string | null;
}

interface NextRoundDebater {
  round: Round;
  pairing: Pairing;
  role: 'DEBATER';
  side: 'PROP' | 'OPP';
  yourTeam: Team;
  opponentTeam: Team | null;
  judges: Judge[];
  isAdmin?: boolean;
}

interface NextRoundJudge {
  round: Round;
  pairing: Pairing;
  role: 'JUDGE';
  isChair: boolean;
  propTeam: Team | null;
  oppTeam: Team | null;
  judges: Judge[];
  isAdmin?: boolean;
}

interface NoAssignment {
  message: string;
  participation: {
    role: 'DEBATER' | 'JUDGE';
    team: Team | null;
    institution: Institution | null;
  };
}

type NextRoundData = NextRoundDebater | NextRoundJudge | NoAssignment;

interface TournamentYourNextRoundProps {
  tournamentId: string;
}

const TournamentYourNextRound = ({ tournamentId }: TournamentYourNextRoundProps) => {
  const router = useRouter();
  const { user } = useUser();
  const [data, setData] = useState<NextRoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    fetchNextRound();
  }, [tournamentId]);

  async function handleEnterRoom() {
    if (!data || 'message' in data) return;

    setCheckingRole(true);
    try {
      const pairingId = data.pairing.id;

      // If user is a judge, they can directly join
      if (data.role === 'JUDGE') {
        // Reserve JUDGE role
        const response = await fetch(`/api/debates/${pairingId}/reserve-role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'JUDGE' }),
        });

        const result = await response.json();

        if (response.ok) {
          router.push(`/debate/${pairingId}`);
        } else {
          toast.error(result.error || 'Failed to join debate room');
        }
        return;
      }

      // If user is a debater, check if they already have a role
      if (data.role === 'DEBATER') {
        // Check participants to see if user already has a role
        const participantsResponse = await fetch(`/api/debates/${pairingId}/participants`);
        
        if (participantsResponse.ok) {
          const participantsData = await participantsResponse.json();
          const allParticipants = [
            ...participantsData.propTeam.participants,
            ...participantsData.oppTeam.participants,
            ...participantsData.judges,
          ];

          // Check if current user already has a participant entry
          const existingParticipant = allParticipants.find(
            (p: any) => p.userId === user?.id
          );

          if (existingParticipant) {
            // User already has a role, go directly to room
            router.push(`/debate/${pairingId}`);
            setCheckingRole(false);
            return;
          }
        }

        // User doesn't have a role yet, show role selection dialog
        setCheckingRole(false);
        setShowRoleDialog(true);
        return;
      }
    } catch (error) {
      console.error('Error checking role:', error);
      toast.error('Failed to check debate status');
    } finally {
      setCheckingRole(false);
    }
  }

  async function fetchNextRound() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/my-next-round`);
      
      if (response.status === 404) {
        const errorData = await response.json();
        setError(errorData.error);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch your next round');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Failed to load your next round information');
      toast.error('Failed to load your next round');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Next Round</CardTitle>
          <CardDescription>Loading your round assignment...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Next Round</CardTitle>
          <CardDescription>Unable to load your round information</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchNextRound} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || 'message' in data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Next Round</CardTitle>
          <CardDescription>Your upcoming debate assignment</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Round Assignment Yet</h3>
            <p className="text-muted-foreground mb-4">
              {data?.message || 'You have not been assigned to a round yet. Check back later!'}
            </p>
            {data && 'participation' in data && (
              <div className="text-sm text-muted-foreground">
                <p>
                  You are registered as a{' '}
                  <Badge variant="outline" className="mx-1">
                    {data.participation.role}
                  </Badge>
                </p>
                {data.participation.role === 'DEBATER' && data.participation.team && (
                  <p className="mt-2">
                    Team: <strong>{data.participation.team.name}</strong>
                  </p>
                )}
                {data.participation.institution && (
                  <p className="mt-1">
                    Institution: <strong>{data.participation.institution.name}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hide round details for non-admin users while the round is in PLANNING
  if (data && 'round' in data && data.round?.status === 'PLANNING' && !(data as any).isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Next Round</CardTitle>
          <CardDescription>Round information is currently unavailable</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Round Being Planned</h3>
          <p className="text-muted-foreground">This round is currently in planning mode and is only visible to tournament administrators. If you think this is a mistake, contact your tournament admin.</p>
        </CardContent>
      </Card>
    );
  }

  // Display for DEBATER
  if (data.role === 'DEBATER') {
    return (
      <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Next Round</CardTitle>
              <CardDescription>Your upcoming debate assignment</CardDescription>
            </div>
            <Badge variant="default" className="bg-cyan-500 text-lg px-4 py-2">
              {data.round.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Assignment Info */}
          <div className="bg-linear-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 rounded-lg p-6 border-2 border-cyan-200 dark:border-cyan-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-cyan-600" />
                  <h3 className="text-xl font-bold">
                    You&apos;re debating as{' '}
                    <Badge 
                      variant={data.side === 'PROP' ? 'default' : 'secondary'}
                      className={data.side === 'PROP' ? 'bg-green-500' : 'bg-orange-500'}
                    >
                      {data.side === 'PROP' ? 'PROPOSITION' : 'OPPOSITION'}
                    </Badge>
                  </h3>
                </div>
                {/* Motion Display */}
                {data.round.motion && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded border border-cyan-300 dark:border-cyan-700">
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 mb-1">Motion:</p>
                    <p className="text-base font-medium">{data.round.motion}</p>
                    {data.round.infoSlide && (
                      <div className="mt-2 pt-2 border-t border-cyan-200 dark:border-cyan-800">
                        <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-1">Context:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.round.infoSlide}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {data.pairing.scheduledAt && (
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Scheduled: {new Date(data.pairing.scheduledAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Teams Display */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {/* Your Team */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-cyan-300 dark:border-cyan-700">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-cyan-100 text-cyan-700 border-cyan-300">
                    Your Team
                  </Badge>
                  <Badge variant={data.side === 'PROP' ? 'default' : 'secondary'} className={data.side === 'PROP' ? 'bg-green-500' : 'bg-orange-500'}>
                    {data.side}
                  </Badge>
                </div>
                <h4 className="font-bold text-lg mb-1">{data.yourTeam.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {data.yourTeam.institution.name}
                </p>
                <div className="space-y-1">
                  {data.yourTeam.participations.map((p) => (
                    <div key={p.user.id} className="flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{p.user.username || p.user.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opponent Team */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Opponent</Badge>
                  <Badge variant={data.side === 'PROP' ? 'secondary' : 'default'} className={data.side === 'PROP' ? 'bg-orange-500' : 'bg-green-500'}>
                    {data.side === 'PROP' ? 'OPP' : 'PROP'}
                  </Badge>
                </div>
                {data.opponentTeam ? (
                  <>
                    <h4 className="font-bold text-lg mb-1">{data.opponentTeam.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {data.opponentTeam.institution.name}
                    </p>
                    <div className="space-y-1">
                      {data.opponentTeam.participations.map((p) => (
                        <div key={p.user.id} className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user.username || p.user.email}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">TBD</p>
                )}
              </div>
            </div>
          </div>

          {/* Judges Section */}
          {data.judges.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Gavel className="h-4 w-4 text-purple-500" />
                Judges ({data.judges.length})
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {data.judges.map((judge) => (
                  <div
                    key={judge.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {judge.user.username || judge.user.email}
                      </p>
                      {judge.institution && (
                        <p className="text-xs text-muted-foreground">
                          {judge.institution.name}
                        </p>
                      )}
                    </div>
                    {judge.isChair && (
                      <Badge variant="default" className="bg-purple-500">
                        Chair
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room Link */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={handleEnterRoom}
              disabled={checkingRole}
            >
              {checkingRole ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  Enter Debate Room
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Role Selection Dialog */}
      <RoleSelectionDialog
        open={showRoleDialog}
        onClose={() => setShowRoleDialog(false)}
        pairingId={data.pairing.id}
        userTeamId={data.yourTeam.id}
      />
      </>
    );
  }

  // Display for JUDGE
  if (data.role === 'JUDGE') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Next Round</CardTitle>
              <CardDescription>Your judging assignment</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {data.isChair && (
                <Badge variant="default" className="bg-purple-500">
                  Chair Judge
                </Badge>
              )}
              <Badge variant="default" className="bg-cyan-500 text-lg px-4 py-2">
                {data.round.name}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Assignment Info */}
          <div className="bg-linear-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Gavel className="h-5 w-5 text-purple-600" />
                  <h3 className="text-xl font-bold">
                    You&apos;re judging this debate
                  </h3>
                </div>
                {/* Motion Display */}
                {data.round.motion && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded border border-purple-300 dark:border-purple-700">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Motion:</p>
                    <p className="text-base font-medium">{data.round.motion}</p>
                    {data.round.infoSlide && (
                      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Context:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.round.infoSlide}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {data.pairing.scheduledAt && (
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Scheduled: {new Date(data.pairing.scheduledAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Teams Display */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {/* Proposition Team */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-green-500">PROPOSITION</Badge>
                </div>
                {data.propTeam ? (
                  <>
                    <h4 className="font-bold text-lg mb-1">{data.propTeam.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {data.propTeam.institution.name}
                    </p>
                    <div className="space-y-1">
                      {data.propTeam.participations.map((p) => (
                        <div key={p.user.id} className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user.username || p.user.email}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">TBD</p>
                )}
              </div>

              {/* Opposition Team */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-orange-500">OPPOSITION</Badge>
                </div>
                {data.oppTeam ? (
                  <>
                    <h4 className="font-bold text-lg mb-1">{data.oppTeam.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {data.oppTeam.institution.name}
                    </p>
                    <div className="space-y-1">
                      {data.oppTeam.participations.map((p) => (
                        <div key={p.user.id} className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user.username || p.user.email}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">TBD</p>
                )}
              </div>
            </div>
          </div>

          {/* Fellow Judges Section */}
          {data.judges.length > 1 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Gavel className="h-4 w-4 text-purple-500" />
                Fellow Judges ({data.judges.length - 1})
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {data.judges
                  .filter((judge) => judge.id !== data.judges.find((j) => j.isChair === data.isChair)?.id)
                  .map((judge) => (
                    <div
                      key={judge.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {judge.user.username || judge.user.email}
                        </p>
                        {judge.institution && (
                          <p className="text-xs text-muted-foreground">
                            {judge.institution.name}
                          </p>
                        )}
                      </div>
                      {judge.isChair && (
                        <Badge variant="default" className="bg-purple-500">
                          Chair
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Room Link */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={handleEnterRoom}
              disabled={checkingRole}
            >
              {checkingRole ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Enter Judging Room
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default TournamentYourNextRound;
