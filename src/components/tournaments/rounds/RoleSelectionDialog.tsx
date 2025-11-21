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
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

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
  pairingId?: string;
  userTeamId?: string;
  onRoleSelected?: (roles: string[], callId?: string) => void;
  isStandaloneMeeting?: boolean;
  trigger?: React.ReactNode;
}

const MAIN_SPEAKER_ROLES = [
  { value: 'FIRST_SPEAKER', label: 'First Speaker', description: 'Opening arguments' },
  { value: 'SECOND_SPEAKER', label: 'Second Speaker', description: 'Rebuttals and extensions' },
  { value: 'THIRD_SPEAKER', label: 'Third Speaker', description: 'Summary and closing' },
] as const;

const ROLE_MAPPING = {
  'FIRST_SPEAKER': 'first',
  'SECOND_SPEAKER': 'second',
  'THIRD_SPEAKER': 'third',
  'REPLY_SPEAKER': 'reply',
  'JUDGE': 'judge',
} as const;

export function RoleSelectionDialog({
  open,
  onClose,
  pairingId,
  userTeamId,
  onRoleSelected,
  isStandaloneMeeting = false,
  trigger,
}: RoleSelectionDialogProps) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const call = useCall();
  const { useParticipants } = useCallStateHooks();
  const streamParticipants = useParticipants();
  
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [baseRole, setBaseRole] = useState<'debater' | 'judge' | 'spectator'>('debater');
  const [selectedTeam, setSelectedTeam] = useState<'prop' | 'opp'>('prop');
  const [selectedMainRole, setSelectedMainRole] = useState<string | null>(null);
  const [includeReply, setIncludeReply] = useState(false);
  const [participants, setParticipants] = useState<{
    propTeam: TeamParticipants;
    oppTeam: TeamParticipants;
    judges: Participant[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      if (isStandaloneMeeting) {
        // For standalone meetings, we don't need to fetch from API
        setLoading(false);
      } else {
        fetchParticipants();
      }
    }
  }, [open, pairingId, isStandaloneMeeting]);

  async function fetchParticipants() {
    if (!pairingId) return;
    
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
    // For judge and spectator, no speech role needed
    if (baseRole === 'judge' || baseRole === 'spectator') {
      setReserving(true);
      try {
        if (isStandaloneMeeting && call && clerkUser) {
          await call.updateCallMembers({
            update_members: [
              {
                user_id: clerkUser.id,
                role: baseRole,
              },
            ],
          });
          
          toast.success(`Role updated to ${baseRole}`);
          
          if (onRoleSelected) {
            onRoleSelected([baseRole.toUpperCase()]);
          }
          
          onClose();
        }
      } catch (error) {
        console.error('Error updating role:', error);
        toast.error('Failed to update role');
      } finally {
        setReserving(false);
      }
      return;
    }

    // For debaters, require speech role selection
    if (!selectedMainRole) return;

    // Check if reply speaker is selected with third speaker
    if (includeReply && selectedMainRole === 'THIRD_SPEAKER') {
      toast.error('Third speaker cannot be the reply speaker');
      return;
    }

    setReserving(true);
    try {
      const roles = includeReply ? [selectedMainRole, 'REPLY_SPEAKER'] : [selectedMainRole];
      
      if (isStandaloneMeeting && call && clerkUser) {
        // For standalone meetings, update Stream directly
        const mainSpeechRole = ROLE_MAPPING[selectedMainRole as keyof typeof ROLE_MAPPING];
        
        await call.updateCallMembers({
          update_members: [
            {
              user_id: clerkUser.id,
              role: 'debater',
              custom: {
                speechRole: mainSpeechRole,
                includeReply: includeReply,
                team: selectedTeam,
              },
            },
          ],
        });
        
        toast.success('Role updated successfully');
        
        if (onRoleSelected) {
          onRoleSelected(roles);
        }
        
        onClose();
      } else if (pairingId) {
        // For tournament debates, use the API
        const response = await fetch(`/api/debates/${pairingId}/reserve-role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles }),
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error || 'Failed to reserve roles');
          
          // If role was just taken, refresh the participants list
          if (response.status === 409) {
            await fetchParticipants();
            setSelectedMainRole(null);
            setIncludeReply(false);
          }
          return;
        }

        toast.success(data.message || 'Roles reserved successfully');
        
        if (onRoleSelected && data.callId) {
          onRoleSelected(data.roles, data.callId);
        } else if (data.callId) {
          // Navigate to the debate room
          router.push(`/debate/${pairingId}`);
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Error reserving role:', error);
      toast.error('Failed to reserve roles');
    } finally {
      setReserving(false);
    }
  }

  if (!open) return null;

  function getRoleLabel(role: string): string {
    const mainRole = MAIN_SPEAKER_ROLES.find((r) => r.value === role);
    if (mainRole) return mainRole.label;
    if (role === 'REPLY_SPEAKER') return 'Reply Speaker';
    return role;
  }

  // For standalone meetings, analyze current Stream participants
  let myTeamParticipants: Participant[] = [];
  let takenMainRoles = new Set<string>();
  let uniqueDebaters = new Set<string>();
  let teamFull = false;
  let replyRoleTaken = false;
  let replyRoleTaker: Participant | undefined;

  if (isStandaloneMeeting && clerkUser) {
    // Analyze Stream participants for standalone meetings
    const debaters = streamParticipants.filter(p => 
      p.roles?.includes('debater') || p.roles?.[0] === 'debater'
    );
    
    debaters.forEach(p => {
      const speechRole = (p as any)?.custom?.speechRole;
      const hasReply = (p as any)?.custom?.includeReply;
      
      if (speechRole && p.userId !== clerkUser.id) {
        const dbRole = Object.entries(ROLE_MAPPING).find(([_, v]) => v === speechRole)?.[0];
        if (dbRole) {
          takenMainRoles.add(dbRole);
        }
      }
      
      if (hasReply && p.userId !== clerkUser.id) {
        replyRoleTaken = true;
      }
      
      uniqueDebaters.add(p.userId);
    });
    
    // Remove current user from count if they're already a debater
    if (streamParticipants.some(p => p.userId === clerkUser.id && p.roles?.includes('debater'))) {
      uniqueDebaters.delete(clerkUser.id);
    }
    
    teamFull = false; // No team limit for standalone meetings
  } else {
    // For tournament debates, use participants from API
    myTeamParticipants = participants
      ? participants.propTeam.id === userTeamId
        ? participants.propTeam.participants
        : participants.oppTeam.id === userTeamId
        ? participants.oppTeam.participants
        : []
      : [];

    takenMainRoles = new Set(myTeamParticipants.filter(p => p.role !== 'REPLY_SPEAKER' && p.role !== 'JUDGE').map((p) => p.role));
    uniqueDebaters = new Set(myTeamParticipants.filter(p => p.role !== 'JUDGE').map(p => p.userId));
    teamFull = uniqueDebaters.size >= 3;
    
    // Check if reply speaker role is taken by someone else
    replyRoleTaken = myTeamParticipants.some(p => p.role === 'REPLY_SPEAKER');
    replyRoleTaker = myTeamParticipants.find(p => p.role === 'REPLY_SPEAKER');
  }

  function getRoleTaker(role: string): User | null {
    const participant = myTeamParticipants.find((p) => p.role === role);
    return participant?.user || null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose Your Role</DialogTitle>
          <DialogDescription>
            {isStandaloneMeeting 
              ? 'Select your role for this meeting.'
              : 'Select your role for this debate. Only 3 debaters per team can join.'
            }
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
                      {getRoleLabel(p.role)}
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
              {isStandaloneMeeting && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Base Role:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setBaseRole('debater')}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        baseRole === 'debater'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Debater</div>
                      <div className="text-xs text-muted-foreground mt-1">Choose speech role</div>
                    </button>
                    <button
                      onClick={() => setBaseRole('judge')}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        baseRole === 'judge'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Judge</div>
                      <div className="text-xs text-muted-foreground mt-1">Moderate & evaluate</div>
                    </button>
                    <button
                      onClick={() => setBaseRole('spectator')}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        baseRole === 'spectator'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Spectator</div>
                      <div className="text-xs text-muted-foreground mt-1">Watch only</div>
                    </button>
                  </div>
                </div>
              )}
              
              {baseRole === 'debater' && isStandaloneMeeting && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Team:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedTeam('prop')}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedTeam === 'prop'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Proposition</div>
                      <div className="text-xs text-muted-foreground mt-1">Supporting the motion</div>
                    </button>
                    <button
                      onClick={() => setSelectedTeam('opp')}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedTeam === 'opp'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                          : 'border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Opposition</div>
                      <div className="text-xs text-muted-foreground mt-1">Opposing the motion</div>
                    </button>
                  </div>
                </div>
              )}
              
              {baseRole === 'debater' && (
                <>
                  <p className="text-sm font-medium mb-2">Select your main speaker role:</p>
              {MAIN_SPEAKER_ROLES.map((role) => {
                const isTaken = takenMainRoles.has(role.value);
                const taker = getRoleTaker(role.value);
                const isSelected = selectedMainRole === role.value;

                return (
                  <button
                    key={role.value}
                    onClick={() => !isTaken && setSelectedMainRole(role.value)}
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
              
              {/* Reply Speaker Checkbox */}
              {selectedMainRole && selectedMainRole !== 'THIRD_SPEAKER' && (
                <div className={`mt-4 p-4 rounded-lg border-2 ${
                  replyRoleTaken 
                    ? 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 opacity-70' 
                    : 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20'
                }`}>
                  <label className={`flex items-start gap-3 ${replyRoleTaken ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={includeReply}
                      onChange={(e) => setIncludeReply(e.target.checked)}
                      disabled={reserving || replyRoleTaken}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className={`font-semibold ${replyRoleTaken ? 'text-gray-700 dark:text-gray-400' : 'text-purple-900 dark:text-purple-100'}`}>
                        Also serve as Reply Speaker
                        {replyRoleTaken && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Taken
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${replyRoleTaken ? 'text-gray-600 dark:text-gray-500' : 'text-purple-700 dark:text-purple-300'}`}>
                        Reply speakers give the final rebuttal speech. Only first or second speakers can take this role.
                      </p>
                      {replyRoleTaken && replyRoleTaker && (
                        <div className="mt-2 flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Taken by {replyRoleTaker.user?.username || replyRoleTaker.user?.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
              
              {selectedMainRole === 'THIRD_SPEAKER' && (
                <div className="mt-4 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-orange-900 dark:text-orange-100">Third speakers cannot be reply speakers</div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        In debate format rules, only the first or second speaker can deliver the reply speech.
                      </p>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {!isStandaloneMeeting && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  <strong>Team capacity:</strong> {uniqueDebaters.size} / 3 speakers joined
                </p>
              </div>
            )}

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
                disabled={(baseRole === 'debater' && !selectedMainRole) || reserving}
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
