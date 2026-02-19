'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Copy, Plus, RefreshCw, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface InstitutionOption {
  id: string;
  name: string;
  source?: string;
}

interface RosterEntry {
  id: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    emailNormalized: string | null;
    claimed: boolean;
  };
}

interface ParticipantItem {
  id: string;
  role: 'DEBATER' | 'JUDGE';
  createdAt: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    claimed: boolean;
  };
  institution: {
    id: string;
    name: string;
  };
  privateLink: {
    id: string;
    active: boolean;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    expiresAt: string | null;
  } | null;
}

export default function TournamentParticipantsManagementPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const router = useRouter();

  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | undefined>();
  const [role, setRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [createMode, setCreateMode] = useState<'roster' | 'new'>('roster');
  const [rosterPersonId, setRosterPersonId] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [placeholderName, setPlaceholderName] = useState('');
  const [creatingPlaceholder, setCreatingPlaceholder] = useState(false);
  const [linkByParticipantId, setLinkByParticipantId] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    if (!tournamentId) return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function loadData() {
    try {
      setLoading(true);
      const [participantsRes, institutionsRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/manage-participants`),
        fetch(`/api/tournaments/${tournamentId}/institution-registrations/admin?status=APPROVED`),
      ]);

      if (participantsRes.status === 403) {
        toast.error('You are not authorized to manage participants.');
        router.push(`/tournaments/${tournamentId}`);
        return;
      }

      const participantsJson = await participantsRes.json();
      if (!participantsRes.ok) throw new Error(participantsJson?.error || 'Failed to load participants');
      setParticipants(participantsJson);

      const institutionsJson = await institutionsRes.json();
      if (!institutionsRes.ok) throw new Error(institutionsJson?.error || 'Failed to load institutions');
      const items = institutionsJson.items ?? [];
      const institutionOptions = items.map((item: any) => ({
        id: item.institution.id,
        name: item.institution.name,
      }));
      setInstitutions(institutionOptions);

      if (!selectedInstitutionId && institutionOptions.length > 0) {
        setSelectedInstitutionId(institutionOptions[0].id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedInstitutionId) return;
    void loadRoster(selectedInstitutionId);
  }, [selectedInstitutionId]);

  async function loadRoster(institutionId: string) {
    try {
      const res = await fetch(
        `/api/institutions/${institutionId}/roster?tournamentId=${encodeURIComponent(
          tournamentId ?? ''
        )}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load roster');
      setRoster(json);
    } catch (err: unknown) {
      setRoster([]);
    }
  }

  const rosterOptions = useMemo(() => {
    return roster.map((entry) => ({
      id: entry.person.id,
      label: `${entry.person.firstName} ${entry.person.lastName}`.trim(),
      email: entry.person.emailNormalized,
    }));
  }, [roster]);

  async function handleCreateParticipant() {
    if (!selectedInstitutionId) return;

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        institutionId: selectedInstitutionId,
        role,
      };

      if (createMode === 'roster') {
        if (!rosterPersonId) throw new Error('Please select a roster person');
        body.personId = rosterPersonId;
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error('First and last name are required');
        }
        body.firstName = firstName.trim();
        body.lastName = lastName.trim();
        body.email = email.trim() ? email.trim() : null;
      }

      const res = await fetch(`/api/tournaments/${tournamentId}/manage-participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create participant');

      if (json.privateLink?.url) {
        setLinkByParticipantId((prev) => ({
          ...prev,
          [json.participant.id]: json.privateLink.url,
        }));
        await navigator.clipboard.writeText(`${window.location.origin}${json.privateLink.url}`);
        toast.success('Participant created and private link copied');
      } else {
        toast.success('Participant created');
      }

      setFirstName('');
      setLastName('');
      setEmail('');
      setRosterPersonId(undefined);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create participant');
    } finally {
      setCreating(false);
    }
  }

  async function handleCreatePlaceholder() {
    if (!placeholderName.trim()) {
      toast.error('Institution name is required');
      return;
    }

    setCreatingPlaceholder(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/placeholder-institutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: placeholderName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create institution');

      const newInstitution = {
        id: json.institution.id,
        name: json.institution.name,
      };
      setInstitutions((prev) => [newInstitution, ...prev]);
      setSelectedInstitutionId(json.institution.id);
      setPlaceholderName('');
      toast.success('Placeholder institution created');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create institution');
    } finally {
      setCreatingPlaceholder(false);
    }
  }

  async function handlePrivateLinkAction(participantId: string, action: 'create' | 'regenerate' | 'revoke') {
    if (action !== 'create') {
      const confirmed = window.confirm(
        action === 'regenerate'
          ? 'Regenerate private URL? The old link will stop working.'
          : 'Revoke this private URL?'
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/manage-participants/${participantId}/private-link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update private link');

      if (json.url) {
        setLinkByParticipantId((prev) => ({
          ...prev,
          [participantId]: json.url,
        }));
        await navigator.clipboard.writeText(`${window.location.origin}${json.url}`);
        toast.success('Private URL copied');
      } else {
        toast.success('Private link updated');
      }

      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update private link');
    }
  }

  async function handleCopyLink(participantId: string) {
    const link = linkByParticipantId[participantId];
    if (!link) {
      toast.error('No private URL available. Regenerate to create a new one.');
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}${link}`);
    toast.success('Private URL copied');
  }

  async function handleDeleteParticipant(participantId: string) {
    const confirmed = window.confirm('Are you sure you want to delete this participant?');
    if (!confirmed) return;

    setDeletingId(participantId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || 'Failed to delete participant');
      }

      toast.success('Participant deleted');
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete participant');
    } finally {
      setDeletingId('');
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-6 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/tournaments/${tournamentId}/settings`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Participants Management</h1>
          <p className="text-sm text-muted-foreground">
            Create participants, manage private links, and add placeholder institutions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Participant</CardTitle>
          <CardDescription>Add a judge or debater without requiring a Clerk account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Institution</Label>
              <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'DEBATER' | 'JUDGE')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBATER">Debater</SelectItem>
                  <SelectItem value="JUDGE">Judge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as 'roster' | 'new')}>
            <TabsList>
              <TabsTrigger value="roster">Pick From Roster</TabsTrigger>
              <TabsTrigger value="new">Create New Person</TabsTrigger>
            </TabsList>
            <TabsContent value="roster" className="space-y-3">
              <div className="space-y-2">
                <Label>Roster Person</Label>
                <Select value={rosterPersonId} onValueChange={setRosterPersonId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select roster person" />
                  </SelectTrigger>
                  <SelectContent>
                    {rosterOptions.length === 0 && (
                      <SelectItem value="none" disabled>
                        No roster entries
                      </SelectItem>
                    )}
                    {rosterOptions.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label} {entry.email ? `(${entry.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="new" className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleCreateParticipant} disabled={creating || !selectedInstitutionId}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? 'Creating...' : 'Create Participant'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Placeholder Institution</CardTitle>
          <CardDescription>Create a placeholder for institutions that refuse to register.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label>Institution Name</Label>
            <Input value={placeholderName} onChange={(e) => setPlaceholderName(e.target.value)} />
          </div>
          <Button onClick={handleCreatePlaceholder} disabled={creatingPlaceholder}>
            {creatingPlaceholder ? 'Creating...' : 'Create Placeholder'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>Manage private links and claim status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Claimed</TableHead>
                <TableHead>Private Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{`${p.person.firstName} ${p.person.lastName}`.trim()}</TableCell>
                  <TableCell>{p.person.email ?? '—'}</TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell>{p.institution.name}</TableCell>
                  <TableCell>
                    {p.person.claimed ? (
                      <Badge variant="secondary">Claimed</Badge>
                    ) : (
                      <Badge variant="outline">Unclaimed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.privateLink ? (
                      <Badge variant={p.privateLink.active ? 'secondary' : 'outline'}>
                        {p.privateLink.active ? 'Active' : p.privateLink.revokedAt ? 'Revoked' : 'Expired'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Missing</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(p.id)}
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </Button>
                      {!p.privateLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrivateLinkAction(p.id, 'create')}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Create
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrivateLinkAction(p.id, 'regenerate')}
                      >
                        <RefreshCw className="mr-1 h-4 w-4" />
                        Regenerate
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePrivateLinkAction(p.id, 'revoke')}>
                            Revoke Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteParticipant(p.id)}
                            disabled={deletingId === p.id}
                            className="text-red-600"
                          >
                            {deletingId === p.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
