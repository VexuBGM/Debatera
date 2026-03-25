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
import { PaginationControls } from '@/components/ui/pagination';
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
import { Users, Plus, Upload, Trash2, UserPlus, Link2, Copy, AlertTriangle, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import {
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { HelpTopics } from '@/components/docs/HelpLink';
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
  const PARTICIPANTS_PAGE_SIZE = 25;
  const [judgesPage, setJudgesPage] = useState(1);
  const [debatersPage, setDebatersPage] = useState(1);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [tournament, setTournament] = useState<{ id: string; name: string; createdByUserId: string } | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Single add state (judges only from this page)
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addInstitutionId, setAddInstitutionId] = useState<string>('');
  const [addNewInstName, setAddNewInstName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Bulk add state (judges only from this page)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkInstitutionId, setBulkInstitutionId] = useState<string>('');
  const [bulkNewInstName, setBulkNewInstName] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<
    Array<{ line: number; name: string; success: boolean; error?: string }> | null
  >(null);

  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);

  // Portal link state
  interface PortalLinkInfo {
    participantId: string;
    status: 'active' | 'expired' | 'revoked';
    url: string | null;
    expiresAt: string;
    lastUsedAt: string | null;
    createdAt: string;
  }
  const [portalLinks, setPortalLinks] = useState<Map<string, PortalLinkInfo>>(new Map());
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState<{ id: string; name: string } | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [allLinksDialogOpen, setAllLinksDialogOpen] = useState(false);
  const [allLinks, setAllLinks] = useState<Array<{ participantId: string; judgeName: string; url: string }>>([]);
  const [generatingAllLinks, setGeneratingAllLinks] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

      // Fetch existing portal link statuses (non-blocking)
      if (result.data.isOrganizer) {
        fetch(`/api/tournaments/${tournamentId}/portal/links`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.links) {
              const map = new Map<string, PortalLinkInfo>();
              for (const link of data.links) {
                map.set(link.participantId, link);
              }
              setPortalLinks(map);
            }
          })
          .catch(() => { /* non-critical */ });
      }
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

    const isNew = addInstitutionId === '__new__';
    try {
      const result = await addGuestParticipant({
        tournamentId,
        role: 'JUDGE',
        displayName: addName.trim(),
        institutionId: isNew || !addInstitutionId || addInstitutionId === '__default__' ? undefined : addInstitutionId,
        institutionName: isNew ? addNewInstName.trim() || undefined : undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to add judge');
        return;
      }
      toast.success(`Added judge "${addName.trim()}"`);
      setAddName('');
      setAddDialogOpen(false);
      await fetchData();
    } catch {
      toast.error('Failed to add judge');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleBulkAdd() {
    if (!tournamentId || !bulkNames.trim()) return;
    setBulkLoading(true);
    setBulkResults(null);

    const isNew = bulkInstitutionId === '__new__';
    try {
      const result = await bulkAddGuestParticipants({
        tournamentId,
        role: 'JUDGE',
        names: bulkNames,
        institutionId: isNew || !bulkInstitutionId || bulkInstitutionId === '__default__' ? undefined : bulkInstitutionId,
        institutionName: isNew ? bulkNewInstName.trim() || undefined : undefined,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to bulk add');
        return;
      }
      if (result.data) {
        setBulkResults(result.data.results);
        toast.success(`Created ${result.data.totalCreated} judge(s)`);
        if (result.data.totalCreated > 0) {
          await fetchData();
        }
      }
    } catch {
      toast.error('Failed to bulk add judges');
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

  function handleViewLink(participantId: string, judgeName: string) {
    setSelectedJudge({ id: participantId, name: judgeName });
    setLinkDialogOpen(true);
  }

  async function handleGenerateLink(participantId: string) {
    if (!tournamentId) return;
    setGeneratingLinkId(participantId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/portal/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate link');

      // Update local link state
      setPortalLinks((prev) => {
        const next = new Map(prev);
        next.set(participantId, {
          participantId,
          status: 'active',
          url: data.url,
          expiresAt: data.expiresAt,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        });
        return next;
      });
      toast.success('Portal link generated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setGeneratingLinkId(null);
    }
  }

  async function handleGenerateAllLinks() {
    if (!tournamentId) return;
    setGeneratingAllLinks(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/portal/generate-all-links`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate links');
      setAllLinks(data.links);
      setAllLinksDialogOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate links');
    } finally {
      setGeneratingAllLinks(false);
    }
  }

  function handleCopyLink(url: string, id?: string) {
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard');
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    });
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
    const page = role === 'JUDGE' ? judgesPage : debatersPage;
    const setPage = role === 'JUDGE' ? setJudgesPage : setDebatersPage;
    const total = participants.length;
    const totalPages = Math.max(1, Math.ceil(total / PARTICIPANTS_PAGE_SIZE));
    const paged = participants.slice(
      (page - 1) * PARTICIPANTS_PAGE_SIZE,
      page * PARTICIPANTS_PAGE_SIZE,
    );

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
      <>
        <div className="divide-y">
          {paged.map((p) => (
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
                <div className="flex items-center gap-1">
                  {role === 'JUDGE' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        portalLinks.get(p.id)?.status === 'active'
                          ? 'text-green-500 hover:text-green-400'
                          : 'text-muted-foreground hover:text-blue-500'
                      }`}
                      onClick={() => handleViewLink(p.id, getDisplayName(p.user))}
                      disabled={generatingLinkId === p.id}
                      title={
                        portalLinks.get(p.id)?.status === 'active'
                          ? 'View portal link'
                          : 'Generate portal link'
                      }
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(p.id)}
                    disabled={removeLoadingId === p.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        {total > PARTICIPANTS_PAGE_SIZE && (
          <PaginationControls
            pagination={{
              page,
              pageSize: PARTICIPANTS_PAGE_SIZE,
              total,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            }}
            onPageChange={setPage}
            className="mt-3"
          />
        )}
      </>
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
            {/* Single Add Judge Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Judge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Judge</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
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
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Select value={addInstitutionId} onValueChange={setAddInstitutionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Independent Adjudicators (default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Independent Adjudicators (default)</SelectItem>
                        {institutions.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__">
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Create new…
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {addInstitutionId === '__new__' && (
                      <Input
                        placeholder="Institution name"
                        value={addNewInstName}
                        onChange={(e) => setAddNewInstName(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddSingle}
                    disabled={addLoading || !addName.trim()}
                  >
                    {addLoading ? 'Adding…' : 'Add Judge'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk Add Judges Dialog */}
            <Dialog open={bulkDialogOpen} onOpenChange={(open) => {
              setBulkDialogOpen(open);
              if (!open) setBulkResults(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Add Judges
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk Add Judges</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Select value={bulkInstitutionId} onValueChange={setBulkInstitutionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Independent Adjudicators (default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Independent Adjudicators (default)</SelectItem>
                        {institutions.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__">
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Create new…
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {bulkInstitutionId === '__new__' && (
                      <Input
                        placeholder="Institution name"
                        value={bulkNewInstName}
                        onChange={(e) => setBulkNewInstName(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
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
                    {bulkLoading ? 'Adding…' : 'Add All Judges'}
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

      <HelpTopics
        topics={[
          { section: 'Managing Participants' },
          { section: 'Judge Portal Links' },
        ]}
      />

      {/* Portal Link Dialog (View / Generate / Regenerate) */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Judge Portal Link</DialogTitle>
            <DialogDescription>
              Portal link for <strong>{selectedJudge?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const linkInfo = selectedJudge ? portalLinks.get(selectedJudge.id) : null;
            const hasActiveLink = linkInfo?.status === 'active' && linkInfo.url;

            if (hasActiveLink) {
              return (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                    <code className="text-xs flex-1 break-all select-all">{linkInfo.url}</code>
                    <Button size="icon" variant="outline" className="shrink-0" onClick={() => handleCopyLink(linkInfo.url!)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Active — expires {new Date(linkInfo.expiresAt).toLocaleDateString()}
                    </span>
                    {linkInfo.lastUsedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last used {new Date(linkInfo.lastUsedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Anyone with this link can submit ballots as this judge. Keep it private.</span>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedJudge && handleGenerateLink(selectedJudge.id)}
                      disabled={generatingLinkId === selectedJudge?.id}
                    >
                      <RefreshCw className={`h-3 w-3 mr-2 ${generatingLinkId === selectedJudge?.id ? 'animate-spin' : ''}`} />
                      {generatingLinkId === selectedJudge?.id ? 'Regenerating…' : 'Regenerate'}
                    </Button>
                  </DialogFooter>
                </div>
              );
            }

            // No active link — show generate option
            return (
              <div className="space-y-3 pt-2">
                {linkInfo?.status === 'expired' && (
                  <p className="text-sm text-muted-foreground">
                    Previous link expired on {new Date(linkInfo.expiresAt).toLocaleDateString()}.
                  </p>
                )}
                {linkInfo?.status === 'revoked' && (
                  <p className="text-sm text-muted-foreground">
                    Previous link was revoked.
                  </p>
                )}
                {!linkInfo && (
                  <p className="text-sm text-muted-foreground">
                    No portal link has been generated for this judge yet.
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={() => selectedJudge && handleGenerateLink(selectedJudge.id)}
                  disabled={generatingLinkId === selectedJudge?.id}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {generatingLinkId === selectedJudge?.id ? 'Generating…' : 'Generate Portal Link'}
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={allLinksDialogOpen} onOpenChange={setAllLinksDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Judge Portal Links</DialogTitle>
            <DialogDescription>
              {allLinks.length} link(s) generated. Each link gives full ballot access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Anyone with these links can submit ballots. Keep them private.</span>
            </div>
            {allLinks.map((link) => (
              <div key={link.participantId} className="flex items-center gap-2 rounded-md border p-2">
                <span className="font-medium text-sm min-w-30">{link.judgeName}</span>
                <code className="text-[11px] flex-1 break-all text-muted-foreground select-all">{link.url}</code>
                <Button
                  size="icon"
                  variant="outline"
                  className="shrink-0 h-7 w-7"
                  onClick={() => handleCopyLink(link.url, link.participantId)}
                >
                  {copiedId === link.participantId ? <span className="text-green-500 text-xs">✓</span> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs: Judges / Debaters */}
      <Tabs defaultValue="judges">
        <TabsList>
          <TabsTrigger value="judges">
            Judges ({judges.length})
          </TabsTrigger>
          <TabsTrigger value="debaters">
            Debaters ({debaters.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="judges">
          {canManage && judges.length > 0 && (
            <div className="mb-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAllLinks}
                disabled={generatingAllLinks}
              >
                <Link2 className="h-4 w-4 mr-2" />
                {generatingAllLinks ? 'Generating…' : 'Generate Links for All Judges'}
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="pt-4">
              {renderParticipantList(judges, 'JUDGE')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debaters">
          {canManage && (
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
              To add debaters, go to the <strong>Teams</strong> page and use &quot;Add Debaters&quot; on each team. Debaters inherit the team&apos;s institution automatically.
            </div>
          )}
          <Card>
            <CardContent className="pt-4">
              {renderParticipantList(debaters, 'DEBATER')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
