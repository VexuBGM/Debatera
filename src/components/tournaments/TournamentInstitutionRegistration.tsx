'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, CheckCircle2, XCircle, Loader2, AlertCircle, Users, Trophy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface RegisteredInstitution {
  id: string;
  tournamentId: string;
  institutionId: string;
  registeredAt: string;
  registeredById: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string | null;
  rejectedAt?: string | null;
  institution: {
    id: string;
    name: string;
    description: string | null;
    _count: {
      members: number;
      teams: number;
    };
  };
}

interface MyInstitution {
  id: string;
  name: string;
  isCoach: boolean;
}

interface TournamentInstitutionRegistrationProps {
  tournamentId: string;
  myInstitution: MyInstitution | null;
  onRegistrationChange: () => void;
  isRosterFrozen?: boolean;
}

interface DeletionStats {
  teams: number;
  participations: number;
}

export default function TournamentInstitutionRegistration({
  tournamentId,
  myInstitution,
  onRegistrationChange,
  isRosterFrozen = false,
}: TournamentInstitutionRegistrationProps) {
  const [registeredInstitutions, setRegisteredInstitutions] = useState<RegisteredInstitution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [showUnregisterDialog, setShowUnregisterDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletionStats, setDeletionStats] = useState<DeletionStats | null>(null);

  const myInstitutionRegistration = registeredInstitutions.find(
    (reg) => reg.institutionId === myInstitution?.id
  );
  
  const isMyInstitutionRegistered = !!myInstitutionRegistration;
  const myRegistrationStatus = myInstitutionRegistration?.status;

  useEffect(() => {
    fetchRegisteredInstitutions();
  }, [tournamentId]);

  const fetchRegisteredInstitutions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/institutions`);
      if (!response.ok) throw new Error('Failed to fetch registered institutions');
      
      const data = await response.json();
      setRegisteredInstitutions(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterInstitution = async () => {
    if (!myInstitution) return;

    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register-institution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register institution');
      }

      // Show appropriate message based on registration type
      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success(`${myInstitution.name} registered successfully!`);
      }
      
      await fetchRegisteredInstitutions();
      onRegistrationChange();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregisterInstitution = async () => {
    if (!myInstitution) return;

    setIsUnregistering(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register-institution`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unregister institution');
      }

      const deleted = data.deleted as DeletionStats;
      const deletedItems: string[] = [];
      
      if (deleted.teams > 0) {
        deletedItems.push(`${deleted.teams} team${deleted.teams > 1 ? 's' : ''}`);
      }
      if (deleted.participations > 0) {
        deletedItems.push(`${deleted.participations} participant${deleted.participations > 1 ? 's' : ''}`);
      }

      const message = deletedItems.length > 0
        ? `${myInstitution.name} unregistered. Removed: ${deletedItems.join(' and ')}`
        : `${myInstitution.name} unregistered successfully`;

      toast.success(message);
      setShowUnregisterDialog(false);
      await fetchRegisteredInstitutions();
      onRegistrationChange();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsUnregistering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Registration Process:</strong> Institutions must register first before coaches can register users or create teams.
          This ensures proper organization and tracking of tournament participation.
        </AlertDescription>
      </Alert>

      {/* Registration Flow Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
          <CardDescription>Follow these steps to participate in the tournament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center text-center flex-1">
              <div className={`rounded-full p-4 mb-3 ${
                isMyInstitutionRegistered 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-cyan-100 dark:bg-cyan-900/20'
              }`}>
                <Building2 className={`h-8 w-8 ${
                  isMyInstitutionRegistered ? 'text-green-600' : 'text-cyan-600'
                }`} />
              </div>
              <h3 className="font-semibold mb-1">1. Register Institution</h3>
              <p className="text-sm text-muted-foreground">
                Coaches register their institution for the tournament
              </p>
              {isMyInstitutionRegistered && (
                <Badge variant="default" className="mt-2 bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />
            
            <div className="flex flex-col items-center text-center flex-1">
              <div className={`rounded-full p-4 mb-3 ${
                isMyInstitutionRegistered 
                  ? 'bg-cyan-100 dark:bg-cyan-900/20' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Users className={`h-8 w-8 ${
                  isMyInstitutionRegistered 
                    ? 'text-cyan-600' 
                    : 'text-gray-400'
                }`} />
              </div>
              <h3 className="font-semibold mb-1">2. Register Users</h3>
              <p className="text-sm text-muted-foreground">
                Add debaters and judges from your institution
              </p>
              {!isMyInstitutionRegistered && (
                <Badge variant="outline" className="mt-2">
                  Locked
                </Badge>
              )}
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />
            
            <div className="flex flex-col items-center text-center flex-1">
              <div className={`rounded-full p-4 mb-3 ${
                isMyInstitutionRegistered 
                  ? 'bg-cyan-100 dark:bg-cyan-900/20' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <Trophy className={`h-8 w-8 ${
                  isMyInstitutionRegistered 
                    ? 'text-cyan-600' 
                    : 'text-gray-400'
                }`} />
              </div>
              <h3 className="font-semibold mb-1">3. Create Teams</h3>
              <p className="text-sm text-muted-foreground">
                Form teams and assign debaters
              </p>
              {!isMyInstitutionRegistered && (
                <Badge variant="outline" className="mt-2">
                  Locked
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {!isLoading && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Registered Institutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registeredInstitutions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registeredInstitutions.reduce((sum, reg) => sum + reg.institution._count.members, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Total Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registeredInstitutions.reduce((sum, reg) => sum + reg.institution._count.teams, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Registration Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Institution Registration</CardTitle>
          <CardDescription>
            Register your institution to participate in this tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRosterFrozen ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Registration is closed. The tournament roster has been frozen and no new institutions can register.
              </AlertDescription>
            </Alert>
          ) : !myInstitution ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You must be a member of an institution to register for tournaments.
              </AlertDescription>
            </Alert>
          ) : !myInstitution.isCoach ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only coaches can register institutions for tournaments. Contact your institution's coach.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-cyan-500" />
                  <div>
                    <h3 className="font-semibold">{myInstitution.name}</h3>
                    <p className="text-sm text-muted-foreground">Your Institution</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isMyInstitutionRegistered ? (
                    <>
                      {myRegistrationStatus === 'APPROVED' && (
                        <Badge variant="default" className="bg-green-500 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </Badge>
                      )}
                      {myRegistrationStatus === 'PENDING' && (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Pending Approval
                        </Badge>
                      )}
                      {myRegistrationStatus === 'REJECTED' && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnregisterDialog(true)}
                        disabled={isUnregistering || isRosterFrozen}
                      >
                        {isUnregistering ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Unregistering...
                          </>
                        ) : (
                          'Unregister'
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Not Registered
                      </Badge>
                      <Button
                        onClick={handleRegisterInstitution}
                        disabled={isRegistering || isRosterFrozen}
                        className="bg-cyan-500 hover:bg-cyan-600"
                      >
                        {isRegistering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                          </>
                        ) : (
                          'Register Institution'
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isMyInstitutionRegistered && (
                <Alert className="bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                  <AlertDescription className="text-cyan-900 dark:text-cyan-100">
                    Your institution is registered! You can now register users and create teams in the other tabs.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Institutions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Institutions</CardTitle>
              <CardDescription>
                All institutions participating in this tournament
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-base">
              {registeredInstitutions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : registeredInstitutions.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No institutions registered yet</h3>
              <p className="text-muted-foreground">
                Be the first to register your institution!
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Teams</TableHead>
                    <TableHead>Registered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registeredInstitutions.map((registration) => {
                    const isMyInst = registration.institutionId === myInstitution?.id;
                    
                    return (
                      <TableRow
                        key={registration.id}
                        className={isMyInst ? 'bg-cyan-50 dark:bg-cyan-950/20' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-cyan-500" />
                            <span className="font-medium">
                              {registration.institution.name}
                            </span>
                            {isMyInst && (
                              <Badge variant="outline" className="text-xs">
                                Your Institution
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {registration.institution.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {registration.status === 'APPROVED' && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {registration.status === 'PENDING' && (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {registration.status === 'REJECTED' && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {registration.institution._count.members}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {registration.institution._count.teams}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(registration.registeredAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unregister Confirmation Dialog */}
      <Dialog open={showUnregisterDialog} onOpenChange={setShowUnregisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unregister Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to unregister <strong>{myInstitution?.name}</strong> from this tournament?
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action will permanently delete:
              <ul className="list-disc list-inside mt-2 ml-2">
                <li>All teams created by your institution</li>
                <li>All user participations (debaters and judges) from your institution</li>
                <li>The institution registration record</li>
              </ul>
              <p className="mt-2">This action cannot be undone.</p>
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowUnregisterDialog(false);
                setError(null);
              }}
              disabled={isUnregistering}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnregisterInstitution}
              disabled={isUnregistering}
            >
              {isUnregistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unregistering...
                </>
              ) : (
                'Yes, Unregister'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
