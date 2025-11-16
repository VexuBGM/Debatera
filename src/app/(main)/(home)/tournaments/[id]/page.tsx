'use client';

import { useEffect, useState } from 'react';
import { useParams} from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, ArrowLeft, Users, Lock, Unlock, ChevronDown as ChevronDownIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import TournamentMyParticipants from '@/components/tournaments/TournamentMyParticipants';
import TournamentParticipants from '@/components/tournaments/TournamentAllParticipants';
import TournamentTeams from '@/components/tournaments/TournamentTeams';
import TournamentInstitutionRegistration from '@/components/tournaments/TournamentInstitutionRegistration';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TournamentRounds from '@/components/tournaments/TournamentRounds';
import TournamentYourNextRound from '@/components/tournaments/TournamentYourNextRound';

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
  institution: {
    id: string;
    name: string;
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
  const { userId } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [participations, setParticipations] = useState<{ debaters: Participation[]; judges: Participation[]; total: number } | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myInstitution, setMyInstitution] = useState<{ id: string; name: string; isCoach: boolean } | null>(null);
  const [institutionMembers, setInstitutionMembers] = useState<InstitutionMember[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, settime] = useState("10:30");

  const tournamentId = params.id as string;

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      // Fetch all data in parallel - much faster than sequential requests
      const [tournamentRes, teamsRes, participationsRes, institutionsRes, myInstitutionRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/teams`),
        fetch(`/api/tournaments/${tournamentId}/participations`),
        fetch('/api/institutions'),
        userId ? fetch('/api/institutions/me') : Promise.resolve(null),
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

      // Set user's institution membership (now fetched in one call)
      if (myInstitutionRes && myInstitutionRes.ok) {
        const myInstitutionData = await myInstitutionRes.json();
        if (myInstitutionData) {
          setMyInstitution({
            id: myInstitutionData.id,
            name: myInstitutionData.name,
            isCoach: myInstitutionData.isCoach,
          });
          setInstitutionMembers(myInstitutionData.members || []);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeFreezeRoster = async () => {
    const [hStr, mStr] = time.split(":");
    const hours = Number(hStr ?? 0);
    const minutes = Number(mStr ?? 0);
    
    if (!date) {
      toast.error("Please select a date for freezing the roster");
      return;
    }

    const freezeDate = new Date(date);
    freezeDate.setHours(hours, minutes, 0, 0);

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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="text-black">
                      <Lock className="mr-2 h-4 w-4" />
                      Freeze Roster
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-3">
                        <Label htmlFor="date-picker" className="px-1">
                          Date
                        </Label>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              id="date-picker"
                              className="w-32 justify-between font-normal"
                            >
                              {date ? date.toLocaleDateString() : "Select date"}
                              <ChevronDownIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                setDate(date)
                                setOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Label htmlFor="time-picker" className="px-1">
                          Time
                        </Label>
                        <Input
                          type="time"
                          id="time-picker"
                          onChange={(e) => settime(e.target.value)}
                          defaultValue="10:30"
                          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-4 w-full bg-cyan-500 hover:bg-cyan-600"
                      onClick={handleChangeFreezeRoster}
                    >
                      Freeze Roster
                    </Button>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="text-black">
                      <Lock className="mr-2 h-4 w-4" />
                      Unfreeze Roster
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-3">
                        <Label htmlFor="date-picker" className="px-1">
                          Date
                        </Label>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              id="date-picker"
                              className="w-32 justify-between font-normal"
                            >
                              {date ? date.toLocaleDateString() : "Select date"}
                              <ChevronDownIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={date}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                setDate(date)
                                setOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Label htmlFor="time-picker" className="px-1">
                          Time
                        </Label>
                        <Input
                          type="time"
                          id="time-picker"
                          onChange={(e) => settime(e.target.value)}
                          defaultValue="10:30"
                          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-4 w-full bg-cyan-500 hover:bg-cyan-600"
                      onClick={handleChangeFreezeRoster}
                    >
                      Unfreeze Roster
                    </Button>
                  </PopoverContent>
                </Popover>
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
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-red-500">
                  <Lock className="h-5 w-5" />
                  <span className="text-lg font-bold">Frozen</span>
                </div>

                {tournament.rosterFreezeAt && (
                  <p className="text-xs text-muted-foreground">
                    Frozen at{" "}
                    {new Date(tournament.rosterFreezeAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-green-500">
                  <Unlock className="h-5 w-5" />
                  <span className="text-lg font-bold">Open</span>
                </div>

                {tournament.rosterFreezeAt && (
                  <p className="text-xs text-muted-foreground">
                    Will freeze at{" "}
                    {new Date(tournament.rosterFreezeAt).toLocaleString(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="your-next-round">Your Next Round</TabsTrigger>
          {myInstitution?.isCoach && (
            <>
              <TabsTrigger value="my-institution">My Participants</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </>
          )}
          <TabsTrigger value="participants">All Participants</TabsTrigger>
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
        </TabsList>

        <TabsContent value="registration">
          <TournamentInstitutionRegistration
            tournamentId={tournamentId}
            myInstitution={myInstitution}
            onRegistrationChange={fetchTournamentData}
            isRosterFrozen={tournament.isRosterFrozen}
          />
        </TabsContent>

        <TabsContent value="your-next-round">
          <TournamentYourNextRound tournamentId={tournamentId} />
        </TabsContent>

        {myInstitution?.isCoach && (
          <>
            <TabsContent value="my-institution">
              <TournamentMyParticipants
                tournamentId={tournamentId}
                myInstitution={myInstitution}
                institutionMembers={institutionMembers}
                participations={participations}
                onRegistrationComplete={fetchTournamentData}
              />
            </TabsContent>

            <TabsContent value="teams">
              <TournamentTeams
                tournamentId={tournamentId}
                teams={teams}
                institutions={institutions}
                onTeamCreated={fetchTournamentData}
                myInstitution={myInstitution}
              />
            </TabsContent>
          </>
        )}

        <TabsContent value="participants">
          <TournamentParticipants participations={participations} />
        </TabsContent>

        <TabsContent value="rounds">
          <TournamentRounds 
            tournamentId={tournamentId}
            teams={teams}
            judges={participations?.judges || []}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
