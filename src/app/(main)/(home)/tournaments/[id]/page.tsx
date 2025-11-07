'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, ArrowLeft, Plus, Loader2, Users, Calendar, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import TournamentMyParticipants from '@/components/tournaments/TournamentMyParticipants';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  rosterFreezeAt: string | null;
  frozenById: string | null;
  isRosterFrozen: boolean;
  createdAt: string;
  _count: {
    teams: number;
    participations: number;
  };
}

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  institutionId: string;
  institution: {
    id: string;
    name: string;
  };
  participations: any[];
  _count: {
    participations: number;
  };
}

interface Participation {
  id: string;
  userId: string;
  role: 'DEBATER' | 'JUDGE';
  user: {
    id: string;
    username: string | null;
    email: string | null;
  };
  team: {
    id: string;
    name: string;
    institution: {
      id: string;
      name: string;
    };
  } | null;
}

interface InstitutionOption {
  id: string;
  name: string;
}

interface InstitutionMember {
  id: string;
  userId: string;
  institutionId: string;
  isCoach: boolean;
  joinedAt: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [participations, setParticipations] = useState<{ debaters: Participation[]; judges: Participation[]; total: number } | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [myInstitution, setMyInstitution] = useState<{ id: string; name: string; isCoach: boolean } | null>(null);
  const [institutionMembers, setInstitutionMembers] = useState<InstitutionMember[]>([]);

  const tournamentId = params.id as string;

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      const [tournamentRes, teamsRes, participationsRes, institutionsRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/teams`),
        fetch(`/api/tournaments/${tournamentId}/participations`),
        fetch('/api/institutions'),
      ]);

      if (!tournamentRes.ok) throw new Error('Failed to fetch tournament');
      if (!teamsRes.ok) throw new Error('Failed to fetch teams');
      if (!participationsRes.ok) throw new Error('Failed to fetch participations');

      const tournamentData = await tournamentRes.json();
      const teamsData = await teamsRes.json();
      const participationsData = await participationsRes.json();
      const institutionsData = institutionsRes.ok ? await institutionsRes.json() : [];

      setTournament(tournamentData);
      setTeams(teamsData);
      setParticipations(participationsData);
      setInstitutions(institutionsData);

      // Fetch user's institution membership
      if (userId) {
        try {
          const userInstitutionsRes = await fetch('/api/institutions');
          if (userInstitutionsRes.ok) {
            const userInstitutions = await userInstitutionsRes.json();
            // Find the institution where the user is a member
            for (const inst of userInstitutions) {
              const membersRes = await fetch(`/api/institutions/${inst.id}/members`);
              if (membersRes.ok) {
                const members = await membersRes.json();
                const userMembership = members.find((m: InstitutionMember) => m.userId === userId);
                if (userMembership) {
                  setMyInstitution({
                    id: inst.id,
                    name: inst.name,
                    isCoach: userMembership.isCoach,
                  });
                  setInstitutionMembers(members);
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch user institution:', err);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTeam(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: selectedInstitutionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team');
      }

      toast.success('Team created successfully');
      setIsCreateTeamOpen(false);
      setSelectedInstitutionId('');
      fetchTournamentData();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleFreezeRoster = async () => {
    const freezeDate = prompt('Enter freeze date (YYYY-MM-DDTHH:MM:SS.SSSZ):');
    if (!freezeDate) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterFreezeAt: freezeDate }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to freeze roster');
      }

      toast.success('Roster frozen successfully');
      fetchTournamentData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOverrideFreeze = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/override`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to override freeze');
      }

      toast.success('Roster freeze removed');
      fetchTournamentData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filter out members who are already registered in the tournament
  const availableMembers = institutionMembers.filter((member) => {
    if (!participations) return true;
    const allParticipants = [...participations.debaters, ...participations.judges];
    return !allParticipants.some((p) => p.userId === member.userId);
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-96 mb-8" />
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const isAdmin = tournament.ownerId === userId;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/tournaments">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournaments
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-cyan-500" />
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              {tournament.isRosterFrozen && (
                <Badge variant="destructive" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Frozen
                </Badge>
              )}
            </div>
            {tournament.description && (
              <p className="text-muted-foreground max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {!tournament.isRosterFrozen ? (
                <Button onClick={handleFreezeRoster} variant="outline">
                  <Lock className="mr-2 h-4 w-4" />
                  Freeze Roster
                </Button>
              ) : (
                <Button onClick={handleOverrideFreeze} variant="outline">
                  <Unlock className="mr-2 h-4 w-4" />
                  Unfreeze
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-cyan-500" />
              <span className="text-2xl font-bold">{tournament._count.teams}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              <span className="text-2xl font-bold">{tournament._count.participations}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Roster Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament.isRosterFrozen ? (
              <div className="flex items-center gap-2 text-red-500">
                <Lock className="h-5 w-5" />
                <span className="text-lg font-bold">Frozen</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <Unlock className="h-5 w-5" />
                <span className="text-lg font-bold">Open</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-6">
        <TabsList>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="my-institution">My Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tournament Teams</CardTitle>
                  <CardDescription>
                    Teams registered for this tournament
                  </CardDescription>
                </div>
                <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-cyan-500 hover:bg-cyan-600">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Team</DialogTitle>
                      <DialogDescription>
                        Create a new team for your institution in this tournament
                      </DialogDescription>
                    </DialogHeader>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <form onSubmit={handleCreateTeam} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="institution">
                          Institution <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={selectedInstitutionId}
                          onValueChange={setSelectedInstitutionId}
                          disabled={isCreatingTeam}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select institution" />
                          </SelectTrigger>
                          <SelectContent>
                            {institutions.map((inst) => (
                              <SelectItem key={inst.id} value={inst.id}>
                                {inst.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          You must be a coach of the institution
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          disabled={isCreatingTeam || !selectedInstitutionId}
                          className="bg-cyan-500 hover:bg-cyan-600"
                        >
                          {isCreatingTeam ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Team'
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCreateTeamOpen(false);
                            setError(null);
                          }}
                          disabled={isCreatingTeam}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                  <p className="text-muted-foreground">
                    Create the first team to get started
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.institution.name}</TableCell>
                        <TableCell>{team._count.participations}</TableCell>
                        <TableCell>
                          <Link href={`/tournament-teams/${team.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Debaters ({participations?.debaters.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {!participations || participations.debaters.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No debaters yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Institution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participations.debaters.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.user.username || p.user.email}</TableCell>
                          <TableCell>{p.team?.name || 'N/A'}</TableCell>
                          <TableCell>{p.team?.institution.name || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Judges ({participations?.judges.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {!participations || participations.judges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No judges yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Institution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participations.judges.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.user.username || p.user.email}</TableCell>
                          <TableCell>{p.team?.institution.name || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-institution">
          <TournamentMyParticipants
            tournamentId={tournamentId}
            myInstitution={myInstitution}
            institutionMembers={institutionMembers}
            availableMembers={availableMembers}
            onRegistrationComplete={fetchTournamentData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
