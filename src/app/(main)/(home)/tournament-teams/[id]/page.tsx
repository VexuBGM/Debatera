'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, ArrowLeft, Plus, Loader2, Users as UsersIcon, Shield } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string | null;
  email: string | null;
  imageUrl: string | null;
}

interface TeamMember {
  id: string;
  userId: string;
  role: 'DEBATER' | 'JUDGE';
  createdAt: string;
  user: User;
}

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  tournamentId: string;
  institutionId: string;
  createdAt: string;
  institution: {
    id: string;
    name: string;
  };
  participations: TeamMember[];
}

export default function TournamentTeamDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [team, setTeam] = useState<TournamentTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [newRole, setNewRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [error, setError] = useState<string | null>(null);

  const teamId = params.id as string;

  useEffect(() => {
    fetchTeamMembers();
  }, [teamId]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/tournament-teams/${teamId}/members`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Team not found');
          return;
        }
        throw new Error('Failed to fetch team members');
      }
      const members = await response.json();
      
      // We need to also fetch team details
      // For now, we'll construct a minimal team object
      // In a real app, you'd have a separate endpoint for team details
      setTeam({
        id: teamId,
        name: searchParams.get('name') || 'Team',
        teamNumber: 1,
        tournamentId: searchParams.get('tournamentId') || '',
        institutionId: searchParams.get('institutionId') || '',
        createdAt: new Date().toISOString(),
        institution: {
          id: searchParams.get('institutionId') || '',
          name: searchParams.get('institutionName') || 'Institution',
        },
        participations: members,
      });
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
      const response = await fetch(`/api/tournament-teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newMemberUserId,
          role: newMemberRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      toast.success('Member added successfully');
      setIsAddMemberOpen(false);
      setNewMemberUserId('');
      setNewMemberRole('DEBATER');
      fetchTeamMembers();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setIsChangingRole(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournament-teams/${teamId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.userId,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }

      toast.success('Role changed successfully');
      setIsChangeRoleOpen(false);
      setSelectedMember(null);
      fetchTeamMembers();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsChangingRole(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-12 w-96 mb-8" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const debaters = team.participations.filter((p) => p.role === 'DEBATER');
  const judges = team.participations.filter((p) => p.role === 'JUDGE');

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href={`/institutions/${team.institutionId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Institution
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-cyan-500" />
              <h1 className="text-3xl font-bold">{team.name}</h1>
            </div>
            <p className="text-muted-foreground">
              {team.institution.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Debaters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {debaters.length} / 5
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 3, Maximum 5
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Judges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{judges.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              No limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.participations.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage debaters and judges for this team
              </CardDescription>
            </div>
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Add a debater or judge to the team. They must be from your institution and not already in this tournament.
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={newMemberRole}
                      onValueChange={(value: 'DEBATER' | 'JUDGE') => setNewMemberRole(value)}
                      disabled={isAddingMember}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBATER">Debater</SelectItem>
                        <SelectItem value="JUDGE">Judge</SelectItem>
                      </SelectContent>
                    </Select>
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.participations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No members yet. Add debaters and judges to get started.
                  </TableCell>
                </TableRow>
              ) : (
                team.participations.map((member) => (
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
                      {member.role === 'DEBATER' ? (
                        <Badge className="bg-cyan-500">Debater</Badge>
                      ) : (
                        <Badge variant="outline">Judge</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setNewRole(member.role === 'DEBATER' ? 'JUDGE' : 'DEBATER');
                          setIsChangeRoleOpen(true);
                        }}
                      >
                        Change Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Change the role of {selectedMember?.user.username || selectedMember?.user.email}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleChangeRole} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">
                New Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newRole}
                onValueChange={(value: 'DEBATER' | 'JUDGE') => setNewRole(value)}
                disabled={isChangingRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBATER">Debater</SelectItem>
                  <SelectItem value="JUDGE">Judge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isChangingRole}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {isChangingRole ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Role'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsChangeRoleOpen(false);
                  setError(null);
                }}
                disabled={isChangingRole}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
