'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string | null;
  email: string | null;
}

interface Participant {
  id: string;
  userId: string;
  role: 'FIRST_SPEAKER' | 'SECOND_SPEAKER' | 'THIRD_SPEAKER' | 'REPLY_SPEAKER' | 'JUDGE';
  status: string;
  teamId: string | null;
  user: User | null;
}

interface TeamParticipants {
  id: string | null;
  name: string | null;
  participants: Participant[];
}

interface RoleSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  pairingId: string;
  userTeamId: string;
  onRoleSelected?: (role: string, callId: string) => void;
}

const SPEAKER_ROLES = [
  { value: 'FIRST_SPEAKER', label: 'First Speaker', description: 'Opening arguments' },
  { value: 'SECOND_SPEAKER', label: 'Second Speaker', description: 'Rebuttals and extensions' },
  { value: 'THIRD_SPEAKER', label: 'Third Speaker', description: 'Summary and closing' },
  { value: 'REPLY_SPEAKER', label: 'Reply Speaker', description: 'Final rebuttal (optional)' },
] as const;

export function RoleSelectionDialog({
  open,
  onClose,
  pairingId,
  userTeamId,
  onRoleSelected,
}: RoleSelectionDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [participants, setParticipants] = useState<{
    propTeam: TeamParticipants;
    oppTeam: TeamParticipants;
    judges: Participant[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchParticipants();
    }
  }, [open, pairingId]);

  async function fetchParticipants() {
    setLoading(true);
    try {
      const response = await fetch(`/api/debates/${pairingId}/participants`);
      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }
      const data = await response.json();
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to load participant information');
    } finally {
      setLoading(false);
    }
  }

  async function handleReserveRole() {
    if (!selectedRole) return;

    setReserving(true);
    try {
      const response = await fetch(`/api/debates/${pairingId}/reserve-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to reserve role');
        
        // If role was just taken, refresh the participants list
        if (response.status === 409) {
          await fetchParticipants();
          setSelectedRole(null);
        }
        return;
      }

      toast.success(data.message || 'Role reserved successfully');
      
      if (onRoleSelected && data.callId) {
        onRoleSelected(data.role, data.callId);
      } else if (data.callId) {
        // Navigate to the debate room
        router.push(`/debate/${pairingId}`);
      }
      
      onClose();
    } catch (error) {
      console.error('Error reserving role:', error);
      toast.error('Failed to reserve role');
    } finally {
      setReserving(false);
    }
  }

  if (!open) return null;

  const myTeamParticipants = participants
    ? participants.propTeam.id === userTeamId
      ? participants.propTeam.participants
      : participants.oppTeam.id === userTeamId
      ? participants.oppTeam.participants
      : []
    : [];

  const takenRoles = new Set(myTeamParticipants.map((p) => p.role));
  const debaterCount = myTeamParticipants.filter((p) => p.role !== 'JUDGE').length;
  const teamFull = debaterCount >= 3;

  function getRoleTaker(role: string): User | null {
    const participant = myTeamParticipants.find((p) => p.role === role);
    return participant?.user || null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose Your Speaker Role</DialogTitle>
          <DialogDescription>
            Select your role for this debate. Only 3 debaters per team can join.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : teamFull ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Team Full</h3>
            <p className="text-muted-foreground mb-4">
              Your team already has 3 debaters in this room. You cannot join as a speaker.
            </p>
            <div className="bg-muted rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Current speakers:</p>
              {myTeamParticipants
                .filter((p) => p.role !== 'JUDGE')
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{p.user?.username || p.user?.email}</span>
                    <Badge variant="outline" className="ml-auto">
                      {SPEAKER_ROLES.find((r) => r.value === p.role)?.label || p.role}
                    </Badge>
                  </div>
                ))}
            </div>
            <Button onClick={onClose} className="mt-4" variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 py-4">
              {SPEAKER_ROLES.map((role) => {
                const isTaken = takenRoles.has(role.value);
                const taker = getRoleTaker(role.value);
                const isSelected = selectedRole === role.value;

                return (
                  <button
                    key={role.value}
                    onClick={() => !isTaken && setSelectedRole(role.value)}
                    disabled={isTaken || reserving}
                    className={`
                      w-full text-left p-4 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                          : isTaken
                          ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-not-allowed opacity-60'
                          : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{role.label}</h4>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                        {isTaken && taker && (
                          <div className="mt-2 flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Taken by {taker.username || taker.email}
                            </span>
                          </div>
                        )}
                      </div>
                      {isTaken && (
                        <Badge variant="secondary" className="ml-2">
                          Taken
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                <strong>Team capacity:</strong> {debaterCount} / 3 speakers joined
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={reserving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReserveRole}
                disabled={!selectedRole || reserving}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
              >
                {reserving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  'Continue to Room'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
