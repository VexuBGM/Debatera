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
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberIsCoach, setNewMemberIsCoach] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          userId: newMemberUserId,
          isCoach: newMemberIsCoach,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      toast.success('Member added successfully');
      setIsAddMemberOpen(false);
      setNewMemberUserId('');
      setNewMemberIsCoach(false);
      fetchInstitution();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const isCoach = institution?.members.find(
    (m) => m.userId === userId && m.isCoach
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-96 mb-2" />
        <Skeleton className="h-6 w-full max-w-2xl mb-8" />
        <div className="grid gap-4 md:grid-cols-3 mb-8">
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
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/institutions">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Institutions
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-cyan-500" />
              <h1 className="text-3xl font-bold">{institution.name}</h1>
            </div>
            {institution.description && (
              <p className="text-muted-foreground max-w-3xl">
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

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              <span className="text-2xl font-bold">{institution._count.members}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
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
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>
                          Add a new member to your institution. They must not be in another institution.
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
                            User ID <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="userId"
                            value={newMemberUserId}
                            onChange={(e) => setNewMemberUserId(e.target.value)}
                            placeholder="user_..."
                            required
                            disabled={isAddingMember}
                          />
                          <p className="text-sm text-muted-foreground">
                            The Clerk user ID of the person to add
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
                            disabled={isAddingMember || !newMemberUserId.trim()}
                            className="bg-cyan-500 hover:bg-cyan-600"
                          >
                            {isAddingMember ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add Member'
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institution.members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No members yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    institution.members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {member.user.username || member.user.email || 'Unknown User'}
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
                      </TableRow>
                    ))
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
