'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface Participation {
  id: string;
  userId: string;
  role: 'DEBATER' | 'JUDGE';
}

interface TournamentMyParticipantsProps {
  tournamentId: string;
  myInstitution: MyInstitution | null;
  institutionMembers: InstitutionMember[];
  participations: { debaters: Participation[]; judges: Participation[]; total: number } | null;
  onRegistrationComplete: () => void;
}

export default function TournamentMyParticipants({
  tournamentId,
  myInstitution,
  institutionMembers,
  participations,
  onRegistrationComplete,
}: TournamentMyParticipantsProps) {
  const [selectedMembers, setSelectedMembers] = useState<Map<string, boolean>>(new Map());
  const [selectedRole, setSelectedRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [isSaving, setIsSaving] = useState(false);
  const [isInstitutionRegistered, setIsInstitutionRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  // Initialize selected members based on current participations
  useState(() => {
    if (participations && institutionMembers.length > 0) {
      const allParticipants = [...participations.debaters, ...participations.judges];
      const initialSelection = new Map<string, boolean>();
      
      institutionMembers.forEach(member => {
        const isRegistered = allParticipants.some(p => p.userId === member.userId);
        initialSelection.set(member.userId, isRegistered);
      });
      
      setSelectedMembers(initialSelection);
    }
  });

  // Check if institution is registered
  useState(() => {
    const checkInstitutionRegistration = async () => {
      if (!myInstitution) {
        setIsCheckingRegistration(false);
        return;
      }

      try {
        const response = await fetch(`/api/tournaments/${tournamentId}/institutions`);
        if (response.ok) {
          const data = await response.json();
          const isRegistered = data.some((reg: any) => reg.institutionId === myInstitution.id);
          setIsInstitutionRegistered(isRegistered);
        }
      } catch (err) {
        console.error('Failed to check institution registration:', err);
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    checkInstitutionRegistration();
  });

  // Get registered participants for styling
  const getRegisteredUserIds = () => {
    if (!participations) return new Set<string>();
    const allParticipants = [...participations.debaters, ...participations.judges];
    return new Set(allParticipants.map(p => p.userId));
  };

  // Get user role from participations
  const getUserRole = (userId: string): 'DEBATER' | 'JUDGE' | null => {
    if (!participations) return null;
    const allParticipants = [...participations.debaters, ...participations.judges];
    const participation = allParticipants.find(p => p.userId === userId);
    return participation ? participation.role : null;
  };

  const registeredUserIds = getRegisteredUserIds();

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const newMap = new Map(prev);
      const currentValue = newMap.get(userId) || false;
      newMap.set(userId, !currentValue);
      return newMap;
    });
  };

  const handleToggleAll = () => {
    const allChecked = institutionMembers.every(m => selectedMembers.get(m.userId) === true);
    const newMap = new Map<string, boolean>();
    
    institutionMembers.forEach(member => {
      newMap.set(member.userId, !allChecked);
    });
    
    setSelectedMembers(newMap);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Determine which users to register and which to unregister
      const toRegister: string[] = [];
      const toUnregister: string[] = [];

      institutionMembers.forEach(member => {
        const isCurrentlySelected = selectedMembers.get(member.userId) || false;
        const wasRegistered = registeredUserIds.has(member.userId);

        if (isCurrentlySelected && !wasRegistered) {
          toRegister.push(member.userId);
        } else if (!isCurrentlySelected && wasRegistered) {
          toUnregister.push(member.userId);
        }
      });

      let successCount = 0;
      let errorCount = 0;

      // Handle registrations
      if (toRegister.length > 0) {
        const registrations = toRegister.map((userId) => ({
          userId,
          role: selectedRole,
          teamId: null,
        }));

        const registerResponse = await fetch(`/api/tournaments/${tournamentId}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrations }),
        });

        const registerData = await registerResponse.json();

        if (registerResponse.ok) {
          successCount += registerData.success || 0;
          errorCount += registerData.failed || 0;
        } else {
          throw new Error(registerData.error || 'Failed to register members');
        }
      }

      // Handle unregistrations
      if (toUnregister.length > 0) {
        const unregisterResponse = await fetch(`/api/tournaments/${tournamentId}/participations`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: toUnregister }),
        });

        const unregisterData = await unregisterResponse.json();

        if (unregisterResponse.ok) {
          successCount += unregisterData.success || 0;
        } else {
          throw new Error(unregisterData.error || 'Failed to unregister members');
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully updated ${successCount} member${successCount > 1 ? 's' : ''}`);
      }

      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} member${errorCount > 1 ? 's' : ''}`);
      }

      if (successCount === 0 && errorCount === 0) {
        toast.info('No changes to save');
      }

      onRegistrationComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
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
        ) : isCheckingRegistration ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isInstitutionRegistered ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your institution must be registered for this tournament first. Go to the "Registration" tab to register your institution.
            </AlertDescription>
          </Alert>
        ) : institutionMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Members</h3>
            <p className="text-muted-foreground">
              Your institution has no members to register
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
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
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
                        checked={institutionMembers.every(m => selectedMembers.get(m.userId) === true)}
                        onChange={handleToggleAll}
                        className="cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role in Institution</TableHead>
                    <TableHead>Tournament Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institutionMembers.map((member) => {
                    const isChecked = selectedMembers.get(member.userId) || false;
                    const isRegistered = registeredUserIds.has(member.userId);
                    const tournamentRole = getUserRole(member.userId);
                    
                    return (
                      <TableRow 
                        key={member.id}
                        className={isRegistered ? 'bg-gray-800 dark:bg-cyan-950/20' : ''}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMember(member.userId)}
                            className={`cursor-pointer ${
                              isRegistered 
                                ? 'accent-slate-600 dark:accent-slate-400 scale-110' 
                                : 'accent-cyan-500'
                            }`}
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
                        <TableCell>
                          {tournamentRole ? (
                            <Badge variant={tournamentRole === 'DEBATER' ? 'default' : 'secondary'}>
                              {tournamentRole}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isRegistered ? (
                            <Badge variant="default" className="bg-cyan-500">
                              Registered
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Not Registered
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
