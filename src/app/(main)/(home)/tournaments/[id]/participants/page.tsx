'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, Upload, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getTournamentParticipants,
  addGuestParticipant,
  bulkAddGuestParticipants,
  removeParticipant,
} from '@/actions/participants.actions';
import type { ParticipantWithUser } from '@/lib/validations/participants';

function getDisplayName(user: ParticipantWithUser['user']): string {
  if (user.displayName) return user.displayName;
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  if (user.email) return user.email.split('@')[0];
  return user.id;
}

export default function ParticipantsPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params?.id;
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [debaters, setDebaters] = useState<ParticipantWithUser[]>([]);
  const [judges, setJudges] = useState<ParticipantWithUser[]>([]);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [tournament, setTournament] = useState<{ id: string; name: string; createdByUserId: string } | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Single add state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addRole, setAddRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [addName, setAddName] = useState('');
  const [addInstitutionId, setAddInstitutionId] = useState<string>('__auto__');
  const [addLoading, setAddLoading] = useState(false);

  // Bulk add state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<'DEBATER' | 'JUDGE'>('DEBATER');
  const [bulkNames, setBulkNames] = useState('');
  const [bulkInstitutionId, setBulkInstitutionId] = useState<string>('__auto__');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<
    Array<{ line: number; name: string; success: boolean; error?: string }> | null
  >(null);

  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const result = await getTournamentParticipants(tournamentId);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to load participants');
        return;
      }
      setDebaters(result.data.debaters);
      setJudges(result.data.judges);
      setInstitutions(result.data.institutions);
      setTournament(result.data.tournament);
      setIsOrganizer(result.data.isOrganizer);
    } catch {
      toast.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleAddSingle() {
    if (!tournamentId || !addName.trim()) return;
    setAddLoading(true);
    try {
      const result = await addGuestParticipant({
        tournamentId,
        role: addRole,
        displayName: addName.trim(),
        institutionId: addInstitutionId === '__auto__' ? undefined : addInstitutionId || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to add participant');
        return;
      }
      toast.success(`Added ${addRole.toLowerCase()} "${addName.trim()}"`);
      setAddName('');
      setAddDialogOpen(false);
      await fetchData();
    } catch {
      toast.error('Failed to add participant');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleBulkAdd() {
    if (!tournamentId || !bulkNames.trim()) return;
    setBulkLoading(true);
    setBulkResults(null);
    try {
      const result = await bulkAddGuestParticipants({
        tournamentId,
        role: bulkRole,
        names: bulkNames,
        institutionId: bulkInstitutionId === '__auto__' ? undefined : bulkInstitutionId || undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to bulk add');
        return;
      }
      if (result.data) {
        setBulkResults(result.data.results);
        toast.success(`Created ${result.data.totalCreated} ${bulkRole.toLowerCase()}(s)`);
        if (result.data.totalCreated > 0) {
          await fetchData();
        }
      }
    } catch {
      toast.error('Failed to bulk add participants');
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleRemove(participantId: string) {
    if (!tournamentId) return;
    setRemoveLoadingId(participantId);
    try {
      const result = await removeParticipant(tournamentId, participantId);
      if (!result.success) {
        toast.error(result.error || 'Failed to remove participant');
        return;
      }
      toast.success('Participant removed');
      await fetchData();
    } catch {
      toast.error('Failed to remove participant');
    } finally {
      setRemoveLoadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="max-w-5xl mx-auto p-4">
        <p className="text-muted-foreground">Tournament not found or access denied.</p>
      </main>
    );
  }

  const canManage = isOrganizer || (userId && tournament.createdByUserId === userId);

  function renderParticipantList(participants: ParticipantWithUser[], role: 'DEBATER' | 'JUDGE') {
    if (participants.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No {role.toLowerCase()}s yet.</p>
          {canManage && (
            <p className="text-sm mt-1">Use the buttons above to add {role.toLowerCase()}s.</p>
          )}
        </div>
      );
    }

    return (
      <div className="divide-y">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-3 px-1">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {getDisplayName(p.user).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{getDisplayName(p.user)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.institution.name}
                  {p.user.id.startsWith('guest_') && (
                    <Badge variant="outline" className="ml-2 text-[10px] py-0">Guest</Badge>
                  )}
                  {role === 'DEBATER' && p.teamMembership && (
                    <Badge variant="secondary" className="ml-2 text-[10px] py-0">In team</Badge>
                  )}
                  {role === 'DEBATER' && !p.teamMembership && (
                    <Badge variant="destructive" className="ml-2 text-[10px] py-0">Unassigned</Badge>
                  )}
                </p>
              </div>
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(p.id)}
                disabled={removeLoadingId === p.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Participants — {tournament.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {debaters.length} debater(s), {judges.length} judge(s)
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            {/* Single Add Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Participant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={addRole} onValueChange={(v) => setAddRole(v as 'DEBATER' | 'JUDGE')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBATER">Debater</SelectItem>
                        <SelectItem value="JUDGE">Judge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. Ivan Ivanov"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && addName.trim()) handleAddSingle();
                      }}
                    />
                  </div>
                  {institutions.length > 1 && (
                    <div className="space-y-2">
                      <Label>Institution (optional)</Label>
                      <Select value={addInstitutionId} onValueChange={setAddInstitutionId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto (Guests)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">Auto (Guests)</SelectItem>
                          {institutions.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleAddSingle}
                    disabled={addLoading || !addName.trim()}
                  >
                    {addLoading ? 'Adding…' : 'Add Participant'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk Add Dialog */}
            <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
              setBulkDialogOpen(open);
              if (!open) setBulkResults(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Add Participants</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as 'DEBATER' | 'JUDGE')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBATER">Debaters</SelectItem>
                        <SelectItem value="JUDGE">Judges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {institutions.length > 1 && (
                    <div className="space-y-2">
                      <Label>Institution (optional)</Label>
                      <Select value={bulkInstitutionId} onValueChange={setBulkInstitutionId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto (Guests)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">Auto (Guests)</SelectItem>
                          {institutions.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id}>
                              {inst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Names (one per line)</Label>
                    <Textarea
                      placeholder={'Ivan Ivanov\nMaria Petrova\nGeorgi Dimitrov'}
                      value={bulkNames}
                      onChange={(e) => setBulkNames(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      {bulkNames.split('\n').filter((l) => l.trim()).length} name(s) entered
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleBulkAdd}
                    disabled={bulkLoading || !bulkNames.trim()}
                  >
                    {bulkLoading ? 'Adding…' : 'Add All'}
                  </Button>

                  {/* Bulk results */}
                  {bulkResults && (
                    <div className="max-h-48 overflow-y-auto space-y-1 text-sm border rounded p-2">
                      {bulkResults.map((r) => (
                        <div key={r.line} className={`flex justify-between ${r.success ? 'text-green-600' : 'text-red-500'}`}>
                          <span>{r.line}. {r.name}</span>
                          <span>{r.success ? '✓' : r.error || 'Failed'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Tabs: Debaters / Judges */}
      <Tabs defaultValue="debaters">
        <TabsList>
          <TabsTrigger value="debaters">
            Debaters ({debaters.length})
          </TabsTrigger>
          <TabsTrigger value="judges">
            Judges ({judges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debaters">
          <Card>
            <CardContent className="pt-4">
              {renderParticipantList(debaters, 'DEBATER')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judges">
          <Card>
            <CardContent className="pt-4">
              {renderParticipantList(judges, 'JUDGE')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
