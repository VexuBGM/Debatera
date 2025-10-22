'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Gavel, Eye, AlertCircle } from 'lucide-react';

interface RoleSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  onJoin: (role: 'DEBATER' | 'JUDGE' | 'SPECTATOR', teamId?: string) => Promise<void>;
  availableTeams?: { id: string; name: string }[];
  userTeams?: { id: string; name: string }[];
}

export function RoleSelectionModal({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  onJoin,
  availableTeams = [],
  userTeams = [],
}: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<'DEBATER' | 'JUDGE' | 'SPECTATOR' | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleJoin = async () => {
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    if (selectedRole === 'DEBATER' && !selectedTeam) {
      setError('Please select a team');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onJoin(selectedRole, selectedRole === 'DEBATER' ? selectedTeam : undefined);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join tournament');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'DEBATER',
      label: 'Participant',
      description: 'Debate as part of a team',
      icon: Users,
      available: userTeams.length > 0,
      unavailableMessage: 'You need to be part of a team to join as a participant',
    },
    {
      value: 'JUDGE',
      label: 'Judge',
      description: 'Evaluate debates and provide feedback',
      icon: Gavel,
      available: true,
    },
    {
      value: 'SPECTATOR',
      label: 'Spectator',
      description: 'Watch debates without participating',
      icon: Eye,
      available: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Join {tournamentName}</DialogTitle>
          <DialogDescription>
            Select your role in this tournament
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Select Role
            </label>
            <div className="grid gap-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-all ${
                      selectedRole === option.value
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (option.available) {
                        setSelectedRole(option.value as any);
                        setError('');
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`rounded-lg p-2 ${
                            selectedRole === option.value
                              ? 'bg-cyan-500/20'
                              : 'bg-white/10'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              selectedRole === option.value
                                ? 'text-cyan-400'
                                : 'text-white/70'
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`font-medium ${
                              selectedRole === option.value
                                ? 'text-cyan-400'
                                : 'text-white'
                            }`}
                          >
                            {option.label}
                          </h3>
                          <p className="text-sm text-white/60">
                            {option.description}
                          </p>
                          {!option.available && option.unavailableMessage && (
                            <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {option.unavailableMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Team Selection (only for DEBATER role) */}
          {selectedRole === 'DEBATER' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Select Team
              </label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your team" />
                </SelectTrigger>
                <SelectContent>
                  {userTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-white/50">
                Only teams you're a member of are shown
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={loading || !selectedRole}
            className="bg-cyan-500 text-black hover:bg-cyan-400"
          >
            {loading ? 'Joining...' : 'Join Tournament'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
