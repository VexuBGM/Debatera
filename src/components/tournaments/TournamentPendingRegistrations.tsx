'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Building, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  description: string | null;
}

interface PendingInstitution {
  id: string;
  registeredAt: string;
  institution: Institution;
  registeredById: string;
}

interface User {
  id: string;
  username: string | null;
  email: string | null;
  imageUrl: string | null;
}

interface PendingParticipant {
  id: string;
  createdAt: string;
  role: 'DEBATER' | 'JUDGE';
  user: User;
  institution: {
    id: string;
    name: string;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
}

interface PendingRegistrationsProps {
  tournamentId: string;
  isOwner: boolean;
}

export default function TournamentPendingRegistrations({ tournamentId, isOwner }: PendingRegistrationsProps) {
  const [pendingInstitutions, setPendingInstitutions] = useState<PendingInstitution[]>([]);
  const [pendingParticipants, setPendingParticipants] = useState<PendingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOwner) {
      fetchPendingRegistrations();
    }
  }, [tournamentId, isOwner]);

  const fetchPendingRegistrations = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registrations/pending`);
      if (!res.ok) throw new Error('Failed to fetch pending registrations');
      
      const data = await res.json();
      setPendingInstitutions(data.institutions || []);
      setPendingParticipants(data.participants || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionAction = async (registrationId: string, action: 'approve' | 'reject') => {
    setProcessingId(registrationId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registrations/institution/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process registration');
      }

      toast.success(`Institution ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      await fetchPendingRegistrations();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleParticipantAction = async (participationId: string, action: 'approve' | 'reject') => {
    setProcessingId(participationId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/registrations/participant/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participationId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process registration');
      }

      toast.success(`Participant ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      await fetchPendingRegistrations();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOwner) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPending = pendingInstitutions.length + pendingParticipants.length;

  if (totalPending === 0) {
    return null; // Don't show the component if there are no pending registrations
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Approvals
          <Badge variant="secondary">{totalPending}</Badge>
        </CardTitle>
        <CardDescription>
          Review and approve or reject pending registrations for this tournament
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="institutions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="institutions">
              Institutions ({pendingInstitutions.length})
            </TabsTrigger>
            <TabsTrigger value="participants">
              Participants ({pendingParticipants.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="institutions" className="space-y-3">
            {pendingInstitutions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending institution registrations
              </p>
            ) : (
              pendingInstitutions.map((reg) => (
                <div
                  key={reg.id}
                  className="border rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{reg.institution.name}</h4>
                    </div>
                    {reg.institution.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {reg.institution.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Registered {new Date(reg.registeredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleInstitutionAction(reg.id, 'approve')}
                      disabled={processingId === reg.id}
                    >
                      {processingId === reg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleInstitutionAction(reg.id, 'reject')}
                      disabled={processingId === reg.id}
                    >
                      {processingId === reg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-3">
            {pendingParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending participant registrations
              </p>
            ) : (
              pendingParticipants.map((participation) => (
                <div
                  key={participation.id}
                  className="border rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">
                        {participation.user.username || participation.user.email || 'Unknown User'}
                      </h4>
                      <Badge variant="outline">{participation.role}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {participation.institution && (
                        <p>Institution: {participation.institution.name}</p>
                      )}
                      {participation.team && (
                        <p>Team: {participation.team.name}</p>
                      )}
                      <p className="text-xs">
                        Registered {new Date(participation.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleParticipantAction(participation.id, 'approve')}
                      disabled={processingId === participation.id}
                    >
                      {processingId === participation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleParticipantAction(participation.id, 'reject')}
                      disabled={processingId === participation.id}
                    >
                      {processingId === participation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
