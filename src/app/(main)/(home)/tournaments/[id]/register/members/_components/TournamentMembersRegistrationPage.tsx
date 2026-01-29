'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronsUpDown, Check, Users, UserPlus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';

type AdminInstitution = {
  id: string;
  name: string;
};

type InstitutionMember = {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  };
};

type TournamentInstitutionRegistration =
  | null
  | {
      id: string;
      tournamentId: string;
      institutionId: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      createdAt: string;
      requestedByUserId: string;
    };

type TournamentParticipant = {
  id: string;
  role: 'DEBATER' | 'JUDGE';
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  };
};

async function readJsonOrError(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { error: text };
  }
}

function displayUser(u: InstitutionMember['user'] | TournamentParticipant['user']) {
  return u.username || u.email || u.id;
}

export function TournamentMembersRegistrationPage({ tournamentId }: { tournamentId: string }) {
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(true);

  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);

  const selectedInstitution = useMemo(
    () => institutions.find(i => i.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId]
  );

  const [registration, setRegistration] = useState<TournamentInstitutionRegistration>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [requestingRegistration, setRequestingRegistration] = useState(false);

  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersSearch, setMembersSearch] = useState('');

  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [roleByUserId, setRoleByUserId] = useState<Record<string, 'DEBATER' | 'JUDGE'>>({});
  const [registeringUserId, setRegisteringUserId] = useState<string | null>(null);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);

  useEffect(() => {
    void loadAdminInstitutions();
  }, []);

  useEffect(() => {
    if (!selectedInstitutionId) return;
    void loadInstitutionData(selectedInstitutionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstitutionId]);

  async function loadAdminInstitutions() {
    setInstitutionsLoading(true);
    try {
      const res = await fetch('/api/institutions/admin');
      const json = await readJsonOrError(res);
      if (!res.ok) throw new Error(json?.error || 'Failed to load institutions');
      setInstitutions(json);
      if (Array.isArray(json) && json.length > 0) {
        setSelectedInstitutionId(prev => prev ?? json[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load institutions');
      setInstitutions([]);
    } finally {
      setInstitutionsLoading(false);
    }
  }

  async function loadInstitutionData(institutionId: string) {
    await Promise.all([
      loadRegistration(institutionId),
      loadMembers(institutionId),
      loadParticipants(institutionId),
    ]);
  }

  async function loadRegistration(institutionId: string) {
    setRegistrationLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/institution-registrations?institutionId=${encodeURIComponent(
          institutionId
        )}`
      );
      const json = await readJsonOrError(res);
      if (!res.ok) throw new Error(json?.error || 'Failed to load registration');
      setRegistration(json);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load registration');
      setRegistration(null);
    } finally {
      setRegistrationLoading(false);
    }
  }

  async function loadMembers(institutionId: string) {
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/institutions/${institutionId}/members`);
      const json = await readJsonOrError(res);
      if (!res.ok) throw new Error(json?.error || 'Failed to load members');
      setMembers(json);
      setRoleByUserId(prev => {
        const next = { ...prev };
        for (const m of json as InstitutionMember[]) {
          if (!next[m.user.id]) next[m.user.id] = 'DEBATER';
        }
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load members');
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadParticipants(institutionId: string) {
    setParticipantsLoading(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/participants?institutionId=${encodeURIComponent(institutionId)}`
      );
      const json = await readJsonOrError(res);
      if (!res.ok) throw new Error(json?.error || 'Failed to load participants');
      setParticipants(json);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load participants');
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  }

  const registrationStatus = registration?.status ?? 'NOT_REQUESTED';

  const filteredMembers = useMemo(() => {
    const q = membersSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const label = `${m.user.username ?? ''} ${m.user.email ?? ''} ${m.user.id}`.toLowerCase();
      return label.includes(q);
    });
  }, [members, membersSearch]);

  const registeredUserIdSet = useMemo(() => {
    return new Set(participants.map(p => p.user.id));
  }, [participants]);

  async function requestRegistration() {
    if (!selectedInstitutionId) return;
    setRequestingRegistration(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/institution-registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: selectedInstitutionId }),
      });
      const json = await readJsonOrError(res);
      if (!res.ok) throw new Error(json?.error || 'Failed to request registration');
      toast.success('Registration request sent');
      setRegistration(json);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to request registration');
    } finally {
      setRequestingRegistration(false);
    }
  }

  async function registerMember(userId: string) {
    if (!selectedInstitutionId) return;
    if (!selectedInstitution) return;

    setRegisteringUserId(userId);
    try {
      const role = roleByUserId[userId] ?? 'DEBATER';
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, institutionId: selectedInstitutionId, role }),
      });
      const json = await readJsonOrError(res);

      if (!res.ok) {
        if (res.status === 409) {
          // backend message includes institution name
          toast.error(json?.error || `User already registered by another institution`);
          return;
        }
        throw new Error(json?.error || 'Failed to register participant');
      }

      toast.success('Participant registered');
      await loadParticipants(selectedInstitutionId);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to register participant');
    } finally {
      setRegisteringUserId(null);
    }
  }

  async function removeParticipant(participantId: string) {
    if (!selectedInstitutionId) return;

    setRemovingParticipantId(participantId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
        method: 'DELETE',
      });
      const json = await readJsonOrError(res);
      if (!res.ok) throw new Error(json?.error || 'Failed to remove participant');

      toast.success('Participant removed');
      await loadParticipants(selectedInstitutionId);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to remove participant');
    } finally {
      setRemovingParticipantId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Institution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xl">
            <Popover open={institutionOpen} onOpenChange={setInstitutionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                  disabled={institutionsLoading || institutions.length === 0}
                >
                  {selectedInstitution ? selectedInstitution.name : 'Select institution...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search institutions..." />
                  <CommandList>
                    <CommandEmpty>No institutions found.</CommandEmpty>
                    <CommandGroup>
                      {institutions.map(inst => (
                        <CommandItem
                          key={inst.id}
                          value={inst.name}
                          onSelect={() => {
                            setSelectedInstitutionId(inst.id);
                            setInstitutionOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedInstitutionId === inst.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {inst.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {!institutionsLoading && institutions.length === 0 && (
            <div className="text-sm text-muted-foreground">
              You don’t administer any institutions yet.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInstitution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Institution registration</span>
              <Badge
                variant={
                  registrationStatus === 'APPROVED'
                    ? 'default'
                    : registrationStatus === 'REJECTED'
                      ? 'destructive'
                      : registrationStatus === 'PENDING'
                        ? 'secondary'
                        : 'outline'
                }
              >
                {registrationLoading ? 'Loading…' : registrationStatus.replaceAll('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {registrationStatus === 'NOT_REQUESTED' && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  This institution is not registered for the tournament.
                </div>
                <Button
                  onClick={requestRegistration}
                  disabled={requestingRegistration || registrationLoading}
                >
                  Request registration
                </Button>
              </div>
            )}

            {registrationStatus === 'PENDING' && (
              <div className="text-sm text-muted-foreground">
                Registration request is pending approval.
              </div>
            )}

            {registrationStatus === 'REJECTED' && (
              <div className="text-sm text-muted-foreground">
                Registration request was rejected. Contact tournament organizers.
              </div>
            )}

            {registrationStatus === 'APPROVED' && (
              <div className="text-sm text-muted-foreground">
                Approved. You can register members as participants.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedInstitution && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Members
                </span>
                <Badge variant="secondary">{members.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search members..."
                value={membersSearch}
                onChange={e => setMembersSearch(e.target.value)}
                disabled={membersLoading}
              />

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="w-[120px]">Role</TableHead>
                      <TableHead className="w-[140px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersLoading && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Loading members…
                        </TableCell>
                      </TableRow>
                    )}

                    {!membersLoading && filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No members found.
                        </TableCell>
                      </TableRow>
                    )}

                    {!membersLoading &&
                      filteredMembers.map(m => {
                        const disabled =
                          registrationStatus !== 'APPROVED' || registeredUserIdSet.has(m.user.id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="font-medium">{displayUser(m.user)}</div>
                              <div className="text-xs text-muted-foreground">{m.role}</div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={roleByUserId[m.user.id] ?? 'DEBATER'}
                                onValueChange={v =>
                                  setRoleByUserId(prev => ({
                                    ...prev,
                                    [m.user.id]: v as 'DEBATER' | 'JUDGE',
                                  }))
                                }
                                disabled={registrationStatus !== 'APPROVED'}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DEBATER">DEBATER</SelectItem>
                                  <SelectItem value="JUDGE">JUDGE</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              {registeredUserIdSet.has(m.user.id) ? (
                                <Badge variant="outline">Registered</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => registerMember(m.user.id)}
                                  disabled={disabled || registeringUserId === m.user.id}
                                >
                                  Register
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {registrationStatus !== 'APPROVED' && (
                <div className="text-xs text-muted-foreground">
                  Member registration is available only after institution registration is approved.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Participants (this institution)</span>
                <Badge variant="secondary">{participants.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="w-[120px]">Role</TableHead>
                      <TableHead className="w-[120px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participantsLoading && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Loading participants…
                        </TableCell>
                      </TableRow>
                    )}

                    {!participantsLoading && participants.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No participants registered yet.
                        </TableCell>
                      </TableRow>
                    )}

                    {!participantsLoading &&
                      participants.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium">{displayUser(p.user)}</div>
                            <div className="text-xs text-muted-foreground">{p.user.id}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.role}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeParticipant(p.id)}
                              disabled={removingParticipantId === p.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
