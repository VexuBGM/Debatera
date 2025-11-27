'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Users, Trophy, ArrowLeft, Plus, Loader2, Shield, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface InstitutionMember {
  id: string;
  userId: string;
  isCoach: boolean;
  joinedAt: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  createdAt: string;
  tournament: {
    id: string;
    name: string;
  };
}

interface Institution {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    username: string | null;
    email: string | null;
  };
  members: InstitutionMember[];
  teams: TournamentTeam[];
  _count: {
    members: number;
    teams: number;
  };
}

export default function InstitutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberIsCoach, setNewMemberIsCoach] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const institutionId = params.id as string;

  useEffect(() => {
    fetchInstitution();
  }, [institutionId]);

  const fetchInstitution = async () => {
    try {
      const response = await fetch(`/api/institutions/${institutionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Institution not found');
          router.push('/institutions');
          return;
        }
        throw new Error('Failed to fetch institution');
      }
      const data = await response.json();
      setInstitution(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingMember(true);
    setError(null);

    try {
      const response = await fetch(`/api/institutions/${institutionId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail,
          isCoach: newMemberIsCoach,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast.success('Invitation sent successfully! The user will be notified.');
      setIsAddMemberOpen(false);
      setNewMemberEmail('');
      setNewMemberIsCoach(false);
      fetchInstitution();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string, isSelf: boolean) => {
    const confirmMessage = isSelf
      ? 'Are you sure you want to leave this institution?'
      : 'Are you sure you want to remove this member from the institution?';

    if (!confirm(confirmMessage)) {
      return;
    }

    setRemovingMemberId(memberUserId);

    try {
      const response = await fetch(`/api/institutions/${institutionId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: memberUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      toast.success(data.message);

      // If user left themselves, redirect to institutions page
      if (isSelf) {
        router.push('/institutions');
      } else {
        fetchInstitution();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const isCoach = institution?.members.find(
    (m) => m.userId === userId && m.isCoach
  );

  const isMember = institution?.members.find((m) => m.userId === userId);
  const isCreator = institution?.createdBy.id === userId;

  if (isLoading) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-3 sm:mb-4" />
        <Skeleton className="h-8 sm:h-12 w-64 sm:w-96 mb-2" />
        <Skeleton className="h-4 sm:h-6 w-full max-w-2xl mb-6 sm:mb-8" />
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 mb-6 sm:mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!institution) {
    return null;
  }

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6">
        <Link href="/institutions">
          <Button variant="ghost" size="sm" className="mb-3 sm:mb-4 text-xs sm:text-sm">
            <ArrowLeft className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back to Institutions
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500 shrink-0" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold wrap-break-word">{institution.name}</h1>
            </div>
            {institution.description && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                {institution.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Created by {institution.createdBy.username || institution.createdBy.email} on{' '}
              {new Date(institution.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
              <span className="text-xl sm:text-2xl font-bold">{institution._count.members}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Tournament Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-cyan-500" />
              <span className="text-2xl font-bold">{institution._count.teams}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isCoach ? (
                <>
                  <Shield className="h-5 w-5 text-cyan-500" />
                  <span className="text-2xl font-bold">Coach</span>
                </>
              ) : institution.members.find((m) => m.userId === userId) ? (
                <>
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">Member</span>
                </>
              ) : (
                <>
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-medium text-muted-foreground">Not a member</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>
                    Manage institution members and coaches
                  </CardDescription>
                </div>
                {isCoach && (
                  <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-cyan-500 hover:bg-cyan-600">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join your institution. The user will receive a notification and must accept.
                        </DialogDescription>
                      </DialogHeader>
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      <form onSubmit={handleAddMember} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="userId">
                            Email <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="userId"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="example@gmail.com"
                            required
                            disabled={isAddingMember}
                          />
                          <p className="text-sm text-muted-foreground">
                            The email of the user to add as a member.
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isCoach"
                            checked={newMemberIsCoach}
                            onChange={(e) => setNewMemberIsCoach(e.target.checked)}
                            disabled={isAddingMember}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="isCoach" className="cursor-pointer">
                            Make this user a coach
                          </Label>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="submit"
                            disabled={isAddingMember || !newMemberEmail.trim()}
                            className="bg-cyan-500 hover:bg-cyan-600"
                          >
                            {isAddingMember ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send Invitation'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsAddMemberOpen(false);
                              setError(null);
                            }}
                            disabled={isAddingMember}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institution.members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No members yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    institution.members.map((member) => {
                      const isSelf = member.userId === userId;
                      const canRemove = isSelf || (isCoach && member.userId !== institution.createdBy.id);
                      const isRemovingThis = removingMemberId === member.userId;

                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {member.user.username || member.user.email || 'Unknown User'}
                                {isSelf && <span className="text-cyan-500 ml-2">(You)</span>}
                                {member.userId === institution.createdBy.id && (
                                  <Badge variant="outline" className="ml-2">Creator</Badge>
                                )}
                              </div>
                              {member.user.email && member.user.username && (
                                <div className="text-sm text-muted-foreground">
                                  {member.user.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.isCoach ? (
                              <Badge className="bg-cyan-500">Coach</Badge>
                            ) : (
                              <Badge variant="outline">Member</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {canRemove ? (
                              <Button
                                variant={isSelf ? "outline" : "destructive"}
                                size="sm"
                                onClick={() => handleRemoveMember(member.userId, isSelf)}
                                disabled={isRemovingThis}
                              >
                                {isRemovingThis ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isSelf ? 'Leaving...' : 'Removing...'}
                                  </>
                                ) : (
                                  isSelf ? 'Leave' : 'Remove'
                                )}
                              </Button>
                            ) : member.userId === institution.createdBy.id ? (
                              <span className="text-xs text-muted-foreground">Cannot remove creator</span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Tournament Teams</CardTitle>
              <CardDescription>
                Teams representing this institution in tournaments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {institution.teams.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Teams are created when registering for tournaments
                  </p>
                  <Link href="/tournaments">
                    <Button>Browse Tournaments</Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {institution.teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.tournament.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(team.createdAt).toLocaleDateString()}
                        </TableCell>
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
      </Tabs>
    </div>
  );
}
