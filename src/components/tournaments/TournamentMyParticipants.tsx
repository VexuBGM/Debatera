'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

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

interface MyInstitution {
  id: string;
  name: string;
  isCoach: boolean;
}

interface TournamentMyParticipantsProps {
  tournamentId: string;
  myInstitution: MyInstitution | null;
  institutionMembers: InstitutionMember[];
  availableMembers: InstitutionMember[];
  onRegistrationComplete: () => void;
}

export default function TournamentMyParticipants({
  tournamentId,
  myInstitution,
  institutionMembers,
  availableMembers,
  onRegistrationComplete,
}: TournamentMyParticipantsProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedMembers.size === availableMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(availableMembers.map((m) => m.userId)));
    }
  };

  const handleRegisterMembers = async () => {
    if (selectedMembers.size === 0) {
      toast.error('Please select at least one member to register');
      return;
    }

    setIsRegistering(true);
    try {
      const registrations = Array.from(selectedMembers).map((userId) => ({
        userId,
        role: selectedRole,
        teamId: null, // Team assignment will be handled separately
      }));

      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register members');
      }

      if (data.success > 0) {
        toast.success(`Successfully registered ${data.success} member${data.success > 1 ? 's' : ''}`);
      }

      if (data.failed > 0 && data.errors) {
        toast.error(`Failed to register ${data.failed} member${data.failed > 1 ? 's' : ''}`);
        console.error('Registration errors:', data.errors);
      }

      setSelectedMembers(new Set());
      onRegistrationComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Institution Members</CardTitle>
            <CardDescription>
              {myInstitution
                ? `Members from ${myInstitution.name}${myInstitution.isCoach ? ' - You can register members as a coach' : ''}`
                : 'You are not a member of any institution'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!myInstitution ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Institution</h3>
            <p className="text-muted-foreground mb-4">
              You need to be a member of an institution to register participants
            </p>
            <Link href="/institutions">
              <Button>Browse Institutions</Button>
            </Link>
          </div>
        ) : !myInstitution.isCoach ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Coach Access Required</h3>
            <p className="text-muted-foreground">
              Only coaches can register members to tournaments
            </p>
          </div>
        ) : availableMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Members Registered</h3>
            <p className="text-muted-foreground">
              All members from your institution are already registered
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="role">Select Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: 'DEBATER' | 'JUDGE') => setSelectedRole(value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBATER">Debater</SelectItem>
                    <SelectItem value="JUDGE">Judge</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedRole === 'DEBATER'
                    ? 'Debaters will be assigned to teams later'
                    : 'Judges participate independently'}
                </p>
              </div>

              <Button
                onClick={handleRegisterMembers}
                disabled={isRegistering || selectedMembers.size === 0}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    Register Selected ({selectedMembers.size})
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedMembers.size === availableMembers.length && availableMembers.length > 0}
                        onChange={handleToggleAll}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role in Institution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.userId)}
                          onChange={() => handleToggleMember(member.userId)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {member.user.username || 'N/A'}
                      </TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>
                        {member.isCoach ? (
                          <Badge variant="default">Coach</Badge>
                        ) : (
                          <Badge variant="secondary">Member</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
