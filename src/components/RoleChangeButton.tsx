'use client';

import React, { useState } from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

const MAIN_SPEAKER_ROLES = [
  { value: 'FIRST_SPEAKER', label: 'First Speaker', description: 'Opening arguments' },
  { value: 'SECOND_SPEAKER', label: 'Second Speaker', description: 'Rebuttals and extensions' },
  { value: 'THIRD_SPEAKER', label: 'Third Speaker', description: 'Summary and closing' },
] as const;

type MainRole = 'judge' | 'debater' | 'spectator';
type DebaterRole = 'FIRST_SPEAKER' | 'SECOND_SPEAKER' | 'THIRD_SPEAKER';
type TeamSide = 'prop' | 'opp';

export function RoleChangeButton() {
  const { user } = useUser();
  const call = useCall();
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'main' | 'team' | 'debater'>('main');
  const [selectedMainRole, setSelectedMainRole] = useState<MainRole | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamSide | null>(null);
  const [selectedDebaterRole, setSelectedDebaterRole] = useState<DebaterRole | null>(null);
  const [includeReply, setIncludeReply] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!call || !user) return null;

  // Get current user's role
  const currentParticipant = participants.find((p) => p.userId === user.id);
  const currentRole = currentParticipant?.roles?.[0] || 'spectator';

  const handleOpenDialog = () => {
    setOpen(true);
    setStep('main');
    setSelectedMainRole(null);
    setSelectedTeam(null);
    setSelectedDebaterRole(null);
    setIncludeReply(false);
  };

  const handleMainRoleSelect = async (role: MainRole) => {
    setSelectedMainRole(role);

    if (role === 'debater') {
      // Show team selection
      setStep('team');
    } else {
      // For judge and spectator, apply immediately
      await applyRole(role);
    }
  };

  const handleTeamSelect = (team: TeamSide) => {
    setSelectedTeam(team);
    // Move to debater role selection
    setStep('debater');
  };

  const handleDebaterRoleConfirm = async () => {
    if (!selectedDebaterRole || !selectedTeam) return;
    await applyRole('debater', selectedTeam, selectedDebaterRole, includeReply);
  };

  const applyRole = async (
    mainRole: MainRole,
    team?: TeamSide,
    debaterRole?: DebaterRole,
    withReply?: boolean
  ) => {
    setUpdating(true);
    try {
      // Update the Stream call member with the new role
      await call.updateCallMembers({
        update_members: [
          {
            user_id: user.id,
            role: mainRole,
            custom: debaterRole && team
              ? {
                  team,
                  debaterRole,
                  includeReply: withReply || false,
                }
              : undefined,
          },
        ],
      });

      let roleDescription = mainRole.charAt(0).toUpperCase() + mainRole.slice(1);
      if (debaterRole && team) {
        const roleLabel = MAIN_SPEAKER_ROLES.find((r) => r.value === debaterRole)?.label;
        const teamName = team === 'prop' ? 'Proposition' : 'Opposition';
        roleDescription = `${teamName} - ${roleLabel || debaterRole}`;
        if (withReply) {
          roleDescription += ' + Reply Speaker';
        }
      }

      toast.success(`Role changed to ${roleDescription}`);
      setOpen(false);
      setStep('main');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to change role. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleBack = () => {
    if (step === 'debater') {
      // Go back to team selection
      setStep('team');
      setSelectedDebaterRole(null);
      setIncludeReply(false);
    } else if (step === 'team') {
      // Go back to main role selection
      setStep('main');
      setSelectedTeam(null);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        variant="outline"
        size="sm"
        className="gap-2 text-black hover:bg-gray-100"
      >
        <UserCircle className="h-4 w-4" />
        Change Role
        <Badge variant="secondary" className="ml-1 text-xs">
          {currentRole}
        </Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {step === 'main' ? (
            <>
              <DialogHeader>
                <DialogTitle>Change Your Role</DialogTitle>
                <DialogDescription>
                  Select your role for this debate session
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <button
                  onClick={() => handleMainRoleSelect('debater')}
                  disabled={updating}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${
                      selectedMainRole === 'debater'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">Debater</h4>
                        {currentRole === 'debater' && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Participate in the debate with a specific speaking role
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMainRoleSelect('judge')}
                  disabled={updating}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${
                      selectedMainRole === 'judge'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">Judge</h4>
                        {currentRole === 'judge' && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full audio/video access, can moderate and provide feedback
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMainRoleSelect('spectator')}
                  disabled={updating}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${
                      selectedMainRole === 'spectator'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">Spectator</h4>
                        {currentRole === 'spectator' && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        View-only mode, watch the debate without speaking
                      </p>
                    </div>
                  </div>
                </button>

                {updating && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Updating role...
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setOpen(false)}
                  variant="outline"
                  disabled={updating}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : step === 'team' ? (
            <>
              <DialogHeader>
                <DialogTitle>Choose Your Team</DialogTitle>
                <DialogDescription>
                  Select which side you'll be debating for
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <button
                  onClick={() => handleTeamSelect('prop')}
                  disabled={updating}
                  className={`
                    w-full text-left p-6 rounded-lg border-2 transition-all
                    ${
                      selectedTeam === 'prop'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <h4 className="font-bold text-lg">Proposition</h4>
                        {selectedTeam === 'prop' && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500 ml-auto" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Argue in favor of the motion
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleTeamSelect('opp')}
                  disabled={updating}
                  className={`
                    w-full text-left p-6 rounded-lg border-2 transition-all
                    ${
                      selectedTeam === 'opp'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                        : 'border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-700'
                    }
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <h4 className="font-bold text-lg">Opposition</h4>
                        {selectedTeam === 'opp' && (
                          <CheckCircle2 className="h-5 w-5 text-red-500 ml-auto" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Argue against the motion
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  disabled={updating}
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Select Your Speaking Role</DialogTitle>
                <DialogDescription>
                  Choose your specific role as a {selectedTeam === 'prop' ? 'Proposition' : 'Opposition'} debater
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-4">
                <p className="text-sm font-medium mb-2">Select your main speaker role:</p>

                {MAIN_SPEAKER_ROLES.map((role) => {
                  const isSelected = selectedDebaterRole === role.value;

                  return (
                    <button
                      key={role.value}
                      onClick={() => setSelectedDebaterRole(role.value)}
                      disabled={updating}
                      className={`
                        w-full text-left p-4 rounded-lg border-2 transition-all
                        ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                            : 'border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                        }
                        disabled:opacity-60 disabled:cursor-not-allowed
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
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Reply Speaker Checkbox */}
                {selectedDebaterRole && selectedDebaterRole !== 'THIRD_SPEAKER' && (
                  <div className="mt-4 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeReply}
                        onChange={(e) => setIncludeReply(e.target.checked)}
                        disabled={updating}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-purple-900 dark:text-purple-100">
                          Also serve as Reply Speaker
                        </div>
                        <p className="text-sm mt-1 text-purple-700 dark:text-purple-300">
                          Reply speakers give the final rebuttal speech. Only first or
                          second speakers can take this role.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {selectedDebaterRole === 'THIRD_SPEAKER' && (
                  <div className="mt-4 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      <strong>Note:</strong> Third speakers cannot be reply speakers.
                      Only the first or second speaker can deliver the reply speech.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  disabled={updating}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleDebaterRoleConfirm}
                  disabled={!selectedDebaterRole || updating}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600"
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Confirm Role'
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
