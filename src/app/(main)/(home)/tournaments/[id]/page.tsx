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
import TournamentPendingRegistrations from '@/components/tournaments/TournamentPendingRegistrations';
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
  startDate: string;
  contactInfo: string;
  entryFee: number;
  registrationType: 'OPEN' | 'APPROVAL';
  isVerified: boolean;
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
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-3 sm:mb-4" />
        <Skeleton className="h-8 sm:h-12 w-64 sm:w-96 mb-6 sm:mb-8" />
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3 mb-6 sm:mb-8">
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
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6">
        <Link href="/tournaments">
          <Button variant="ghost" size="sm" className="mb-3 sm:mb-4 text-xs sm:text-sm">
            <ArrowLeft className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Tournaments
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500 shrink-0" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold wrap-break-word">{tournament.name}</h1>
              {tournament.isRosterFrozen && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <Lock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Frozen
                </Badge>
              )}
            </div>
            {tournament.description && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                {tournament.description}
              </p>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              {!tournament.isRosterFrozen ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-black text-xs sm:text-sm">
                      <Lock className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Freeze Roster</span>
                      <span className="sm:hidden">Freeze</span>
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
                    <Button variant="outline" size="sm" className="text-black text-xs sm:text-sm">
                      <Lock className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Unfreeze Roster</span>
                      <span className="sm:hidden">Unfreeze</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm">
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

      {/* Tournament Info Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm font-medium">Tournament Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date:</span>
              <span className="font-medium">
                {new Date(tournament.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entry Fee:</span>
              <span className="font-medium">
                {tournament.entryFee === 0 ? 'Free' : `$${tournament.entryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration Type:</span>
              <span className="font-medium">
                {tournament.registrationType === 'OPEN' ? 'Open Entry' : 'Approval Required'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={tournament.isVerified ? "default" : "secondary"} className={tournament.isVerified ? "bg-green-500 hover:bg-green-600" : ""}>
                {tournament.isVerified ? '✓ Verified' : '⏳ Unverified'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.contactInfo}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
              <span className="text-xl sm:text-2xl font-bold">{tournament._count.teams}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
              <span className="text-xl sm:text-2xl font-bold">{tournament._count.participations}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Roster Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament.isRosterFrozen ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 sm:gap-2 text-red-500">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-base sm:text-lg font-bold">Frozen</span>
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
                <div className="flex items-center gap-1.5 sm:gap-2 text-green-500">
                  <Unlock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-base sm:text-lg font-bold">Open</span>
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

      <Tabs defaultValue="registration" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:flex lg:w-auto h-auto gap-1 p-1">
          <TabsTrigger value="registration" className="text-xs sm:text-sm">Registration</TabsTrigger>
          <TabsTrigger value="your-next-round" className="text-xs sm:text-sm">Next Round</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="approvals" className="text-xs sm:text-sm">Approvals</TabsTrigger>
          )}
          {myInstitution?.isCoach && (
            <>
              <TabsTrigger value="my-institution" className="text-xs sm:text-sm">My Participants</TabsTrigger>
              <TabsTrigger value="teams" className="text-xs sm:text-sm">Teams</TabsTrigger>
            </>
          )}
          <TabsTrigger value="participants" className="text-xs sm:text-sm">All Participants</TabsTrigger>
          <TabsTrigger value="rounds" className="text-xs sm:text-sm">Rounds</TabsTrigger>
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

        {isAdmin && (
          <TabsContent value="approvals">
            <TournamentPendingRegistrations 
              tournamentId={tournamentId}
              isOwner={isAdmin}
            />
          </TabsContent>
        )}

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
