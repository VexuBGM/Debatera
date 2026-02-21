'use client';

/**
 * Round Editor Page
 *
 * Main page for editing round pairings with drag-and-drop functionality.
 * Admin only for DRAFT rounds.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit2,
  MapPin,
  MessageSquare,
  Play,
  Save,
  Shuffle,
  Trophy,
  Upload,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { RoundEditor } from './RoundEditor';
import { autoAllocateVenuesAction } from '@/actions/venues.actions';
import type { RoundData, TeamData, JudgeData, VenueData, EditorDebate } from './types';

// =============================================================================
// Status Helpers
// =============================================================================

type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';

const ALL_ROUND_STATUSES: RoundStatus[] = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED'];

function getStatusBadgeVariant(status: RoundStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DRAFT': return 'secondary';
    case 'PUBLISHED': return 'default';
    case 'IN_PROGRESS': return 'destructive';
    case 'COMPLETED': return 'outline';
    default: return 'secondary';
  }
}

function getStatusLabel(status: RoundStatus): string {
  switch (status) {
    case 'DRAFT': return 'Draft';
    case 'PUBLISHED': return 'Published';
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    default: return status;
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function RoundEditorPage() {
  const params = useParams<{ id: string; roundId: string }>();
  const router = useRouter();
  const tournamentId = params?.id;
  const roundId = params?.roundId;
  const { userId } = useAuth();

  // Data state
  const [round, setRound] = useState<RoundData | null>(null);
  const [allTeams, setAllTeams] = useState<TeamData[]>([]);
  const [allJudges, setAllJudges] = useState<JudgeData[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stream call data
  const [eventMode, setEventMode] = useState<string>('IRL');
  const [userCallEligibility, setUserCallEligibility] = useState<Record<string, string>>({});
  const [showDebaterNames, setShowDebaterNames] = useState(false);

  // Editor state - local copy of debates for editing
  const [editorDebates, setEditorDebates] = useState<EditorDebate[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Motion editing
  const [isEditingMotion, setIsEditingMotion] = useState(false);
  const [editedMotion, setEditedMotion] = useState('');
  const [editedInfoSlide, setEditedInfoSlide] = useState('');
  const [savingMotion, setSavingMotion] = useState(false);

  // Operation states
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [allocatingVenues, setAllocatingVenues] = useState(false);

  // Venue data (debate ID -> venue info)
  const [venueMap, setVenueMap] = useState<Map<string, VenueData>>(new Map());
  const [allVenues, setAllVenues] = useState<VenueData[]>([]);

  // Confirmation dialogs
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // =============================================================================
  // Data Fetching
  // =============================================================================

  const fetchPairings = useCallback(async () => {
    if (!tournamentId || !roundId) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}/pairings`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('Round not found');
          router.push(`/tournaments/${tournamentId}/rounds`);
          return;
        }
        throw new Error('Failed to fetch pairings');
      }

      const data = await res.json();
      setRound(data.round);
      setAllTeams(data.allTeams);
      setAllJudges(data.allJudges);
      setIsAdmin(data.isAdmin);
      setEditedName(data.round.name);
      setEditedMotion(data.round.motion ?? '');
      setEditedInfoSlide(data.round.infoSlide ?? '');

      // Stream call data
      setEventMode(data.eventMode ?? 'IRL');
      setUserCallEligibility(data.userCallEligibility ?? {});
      setShowDebaterNames(data.showDebaterNames ?? false);

      // Initialize editor debates from server data
      const debates: EditorDebate[] = data.round.debates.map((d: RoundData['debates'][0]) => {
        // Split judges by role: first CHAIR becomes chairJudgeParticipantId, rest are panelists
        const chairJudge = d.judges.find((j: { role?: string; participantId: string }) => j.role === 'CHAIR');
        const panelistJudges = d.judges.filter((j: { role?: string; participantId: string }) => j.role !== 'CHAIR');

        return {
          id: d.id,
          order: d.order,
          propTeamId: d.propTeamId,
          oppTeamId: d.oppTeamId,
          isBye: d.isBye,
          venueId: d.venue?.id ?? null,
          chairJudgeParticipantId: chairJudge?.participantId ?? null,
          panelistJudgeParticipantIds: panelistJudges.map((j: { participantId: string }) => j.participantId),
        };
      });
      setEditorDebates(debates);
      setHasChanges(false);

      // Build venue map from all venues
      const newVenueMap = new Map<string, VenueData>();
      for (const v of (data.allVenues ?? [])) {
        newVenueMap.set(v.id, v);
      }
      // Also include any venue data from debates that might not be in allVenues
      for (const d of data.round.debates) {
        if (d.venue && !newVenueMap.has(d.venue.id)) {
          newVenueMap.set(d.venue.id, d.venue);
        }
      }
      setVenueMap(newVenueMap);
      setAllVenues(data.allVenues ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load pairings');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, roundId, router]);

  useEffect(() => {
    void fetchPairings();
  }, [fetchPairings]);

  // =============================================================================
  // Handlers
  // =============================================================================

  function handleDebatesChange(newDebates: EditorDebate[]) {
    setEditorDebates(newDebates);
    setHasChanges(true);
  }

  async function handleSave() {
    if (!round || round.status !== 'DRAFT') return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}/pairings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debates: editorDebates }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Show validation errors
        if (data.validationErrors?.length) {
          data.validationErrors.forEach((err: string) => toast.error(err));
        } else {
          throw new Error(data?.error || 'Failed to save pairings');
        }
        return;
      }

      // Show warnings if any
      if (data.warnings?.length) {
        data.warnings.forEach((w: string) => toast.warning(w));
      }

      toast.success('Pairings saved successfully');
      setHasChanges(false);
      await fetchPairings(); // Refresh data
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save pairings');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!round || round.status !== 'DRAFT') return;

    setGenerating(true);
    setGenerateDialogOpen(false);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}/generate`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to generate pairings');
      }

      // Show warnings if any
      if (data.warnings?.length) {
        data.warnings.forEach((w: string) => toast.warning(w));
      }

      toast.success(`Generated ${data.debatesCreated} debates`);
      await fetchPairings(); // Refresh data
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate pairings');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAllocateVenues() {
    if (!roundId) return;

    setAllocatingVenues(true);
    try {
      const result = await autoAllocateVenuesAction(roundId);

      if (!result.success) {
        toast.error(result.error || 'Failed to auto-allocate venues');
        return;
      }

      const data = result.data!;
      for (const warning of data.warnings) {
        toast.warning(warning);
      }

      toast.success(
        `Allocated ${data.allocatedCount} venue(s) to ${data.totalDebates} debate(s)`
      );
      await fetchPairings(); // Refresh to show venue assignments
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to auto-allocate venues');
    } finally {
      setAllocatingVenues(false);
    }
  }

  async function handleStatusChange(newStatus: RoundStatus) {
    if (!round) return;

    setUpdatingStatus(true);
    setPublishDialogOpen(false);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Show validation errors for publish
        if (data.validationErrors?.length) {
          data.validationErrors.forEach((err: string) => toast.error(err));
        } else {
          throw new Error(data?.error || 'Failed to update status');
        }
        return;
      }

      toast.success(`Round ${newStatus.toLowerCase().replace('_', ' ')}`);
      await fetchPairings(); // Refresh data
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleNameSave() {
    if (!round || editedName === round.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update name');

      setRound((prev) => (prev ? { ...prev, name: editedName } : null));
      toast.success('Round name updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
      setEditedName(round.name);
    } finally {
      setIsEditingName(false);
    }
  }

  async function handleMotionSave() {
    if (!round) return;

    const newMotion = editedMotion.trim() || null;
    const newInfoSlide = editedInfoSlide.trim() || null;

    if (newMotion === (round.motion ?? null) && newInfoSlide === (round.infoSlide ?? null)) {
      setIsEditingMotion(false);
      return;
    }

    setSavingMotion(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motion: newMotion, infoSlide: newInfoSlide }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update motion');

      setRound((prev) =>
        prev ? { ...prev, motion: newMotion, infoSlide: newInfoSlide } : null
      );
      toast.success('Motion updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update motion');
      setEditedMotion(round.motion ?? '');
      setEditedInfoSlide(round.infoSlide ?? '');
    } finally {
      setSavingMotion(false);
      setIsEditingMotion(false);
    }
  }

  // =============================================================================
  // Validation
  // =============================================================================

  function canPublish(): boolean {
    if (!round || round.status !== 'DRAFT') return false;
    if (hasChanges) return false; // Must save first

    // All non-bye debates must have both teams, a chair judge, and at least 1 total judge
    for (const debate of editorDebates) {
      if (!debate.isBye) {
        if (!debate.propTeamId || !debate.oppTeamId) return false;
        if (!debate.chairJudgeParticipantId) return false;
      }
    }

    return editorDebates.length > 0;
  }

  // =============================================================================
  // Render
  // =============================================================================

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-150 w-full" />
      </main>
    );
  }

  if (!round) {
    return (
      <main className="max-w-6xl mx-auto p-4">
        <p>Round not found</p>
      </main>
    );
  }

  const isDraft = round.status === 'DRAFT';
  const canEdit = isAdmin && isDraft;

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Trophy className="h-6 w-6 text-cyan-500" />
          <div>
            {isEditingName && canEdit ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="h-8 w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') {
                      setEditedName(round.name);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={handleNameSave}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{round.name}</h1>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {round.tournament.name} · Round {round.number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                  disabled={updatingStatus}
                >
                  <Badge variant={getStatusBadgeVariant(round.status)} className="mr-0">
                    {getStatusLabel(round.status)}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ALL_ROUND_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    disabled={status === round.status || updatingStatus}
                    onClick={() => {
                      if (status === 'PUBLISHED' && round.status === 'DRAFT') {
                        setPublishDialogOpen(true);
                      } else {
                        handleStatusChange(status);
                      }
                    }}
                  >
                    <Badge variant={getStatusBadgeVariant(status)} className="mr-2">
                      {getStatusLabel(status)}
                    </Badge>
                    {status === round.status && <Check className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge variant={getStatusBadgeVariant(round.status)} className="mr-2">
              {getStatusLabel(round.status)}
            </Badge>
          )}

          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved
            </Badge>
          )}
        </div>
      </div>

      {/* Motion / Topic */}
      <Card>
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-500" />
            Motion
            {isAdmin && !isEditingMotion && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-1"
                onClick={() => setIsEditingMotion(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          {isEditingMotion ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Motion
                </label>
                <Textarea
                  value={editedMotion}
                  onChange={(e) => setEditedMotion(e.target.value)}
                  placeholder="e.g. This House would ban social media for under-16s"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Info Slide (optional)
                </label>
                <Textarea
                  value={editedInfoSlide}
                  onChange={(e) => setEditedInfoSlide(e.target.value)}
                  placeholder="Background context for the motion..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleMotionSave} disabled={savingMotion}>
                  {savingMotion ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditedMotion(round.motion ?? '');
                    setEditedInfoSlide(round.infoSlide ?? '');
                    setIsEditingMotion(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : round.motion ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{round.motion}</p>
              {round.infoSlide && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 whitespace-pre-wrap">
                  {round.infoSlide}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No motion set for this round.
              {isAdmin && ' Click the edit button to add one.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isAdmin && (
        <Card>
          <CardContent className="py-3 flex flex-wrap gap-2">
            {isDraft && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setGenerateDialogOpen(true)}
                  disabled={generating}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Auto-Generate'}
                </Button>

                <Button onClick={handleSave} disabled={saving || !hasChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>

                <Button
                  variant="default"
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={!canPublish() || updatingStatus}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </>
            )}

            {round.status === 'PUBLISHED' && (
              <Button
                variant="default"
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={updatingStatus}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Round
              </Button>
            )}

            {round.status === 'IN_PROGRESS' && (
              <Button
                variant="default"
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={updatingStatus}
              >
                <Check className="h-4 w-4 mr-2" />
                Complete Round
              </Button>
            )}

            {/* Venue allocation — only available when drafting and not ONLINE */}
            {isDraft && editorDebates.length > 0 && eventMode !== 'ONLINE' && (
              <Button
                variant="outline"
                onClick={handleAllocateVenues}
                disabled={allocatingVenues}
                className="ml-auto"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {allocatingVenues ? 'Allocating...' : 'Allocate Venues'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation hints */}
      {canEdit && editorDebates.length > 0 && !canPublish() && !hasChanges && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cannot publish yet
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3 text-sm text-amber-600 dark:text-amber-500">
            <ul className="list-disc list-inside space-y-1">
              {editorDebates.some(
                (d) => !d.isBye && (!d.propTeamId || !d.oppTeamId)
              ) && <li>Some debates are missing teams</li>}
              {editorDebates.some(
                (d) => !d.isBye && !d.chairJudgeParticipantId
              ) && <li>Some debates have no chair judge assigned</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <RoundEditor
        debates={editorDebates}
        allTeams={allTeams}
        allJudges={allJudges}
        allVenues={allVenues}
        venueMap={venueMap}
        canEdit={canEdit}
        onDebatesChange={handleDebatesChange}
        tournamentId={tournamentId}
        roundId={roundId}
        roundStatus={round.status}
        eventMode={eventMode}
        userCallEligibility={userCallEligibility}
        showDebaterNames={showDebaterNames}
      />

      {/* Generate Confirmation Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Generate Pairings?</DialogTitle>
            <DialogDescription>
              This will randomly shuffle teams and judges to create pairings.
              {editorDebates.length > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Warning: This will replace all existing pairings for this round.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Round?</DialogTitle>
            <DialogDescription>
              Once published, the pairings will be visible to all participants.
              You won&apos;t be able to edit them after publishing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStatusChange('PUBLISHED')}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
