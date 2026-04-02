'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Gavel,
  Loader2,
  MapPin,
  Rocket,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  addGuestParticipant,
  bulkAddGuestParticipants,
  getTournamentParticipants,
  removeParticipant,
} from '@/actions/participants.actions';
import {
  createVenue,
  createVenueCategory,
  deleteVenue,
  getTournamentVenueCategories,
  getTournamentVenues,
  type VenueWithCategories,
} from '@/actions/venues.actions';
import {
  assignDebaterToTeam,
  createTeamAsOrganizer,
  deleteTeamAsOrganizer,
  getTeamManagementData,
  getTournamentTeamsPageData,
  type DebaterParticipant,
  type TeamWithMembers,
} from '@/actions/teams.actions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { useTournament } from '@/components/TournamentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import type { ParticipantWithUser } from '@/lib/validations/participants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type EventMode = 'ONLINE' | 'IRL';
type ParticipantRole = 'DEBATER' | 'JUDGE';
type StepKey = 'venues' | 'judges' | 'debaters' | 'teams';
type InstitutionOption = { id: string; name: string };
type VenueCategoryOption = { id: string; name: string; description: string | null };
type GroupedTeamSet = { institution: InstitutionOption; teams: TeamWithMembers[] };
type InstitutionParticipantGroup = {
  institution: InstitutionOption;
  participants: ParticipantWithUser[];
};

interface TournamentSummary {
  id: string;
  name: string;
  createdByUserId: string;
  settings?: {
    eventMode: EventMode;
  } | null;
}

interface SetupData {
  venues: VenueWithCategories[];
  judges: ParticipantWithUser[];
  debaters: ParticipantWithUser[];
  institutions: InstitutionOption[];
  groupedTeams: GroupedTeamSet[];
  teams: TeamWithMembers[];
  unassignedDebaters: DebaterParticipant[];
  teamSizeMin: number;
  teamSizeMax: number;
}

interface StepDefinition {
  key: StepKey;
  label: string;
  description: string;
  helper: string;
  icon: typeof MapPin;
}

const ALL_STEPS: StepDefinition[] = [
  {
    key: 'venues',
    label: 'Venues',
    description: 'Add rooms for debates',
    helper: 'Add the rooms where in-person debates will happen. One solid venue is enough to get rolling.',
    icon: MapPin,
  },
  {
    key: 'judges',
    label: 'Judges',
    description: 'Register adjudicators',
    helper: 'Start with a core judging pool so rounds have people ready to evaluate debates.',
    icon: Gavel,
  },
  {
    key: 'debaters',
    label: 'Participants',
    description: 'Add institutions & participants',
    helper: 'Register people under the right institutions and choose whether each one is a debater or a judge.',
    icon: Building2,
  },
  {
    key: 'teams',
    label: 'Teams',
    description: 'Create teams',
    helper: 'Create teams from your participant roster and assign any unassigned debaters.',
    icon: Users,
  },
];

const EMPTY_SETUP_DATA: SetupData = {
  venues: [],
  judges: [],
  debaters: [],
  institutions: [],
  groupedTeams: [],
  teams: [],
  unassignedDebaters: [],
  teamSizeMin: 2,
  teamSizeMax: 5,
};

const INDEPENDENT_ADJUDICATORS_NAME = 'Independent Adjudicators';

function isIndependentAdjudicatorsInstitution(institution: InstitutionOption) {
  return institution.name.trim().replace(/\s+/g, ' ') === INDEPENDENT_ADJUDICATORS_NAME;
}

function getVisibleSteps(eventMode: EventMode): StepDefinition[] {
  return eventMode === 'ONLINE'
    ? ALL_STEPS.filter((step) => step.key !== 'venues')
    : ALL_STEPS;
}

function getTeamCount(groupedTeams: GroupedTeamSet[]) {
  return groupedTeams.reduce((total, group) => total + group.teams.length, 0);
}

function getCompletionState(data: SetupData, eventMode: EventMode) {
  return {
    venues: eventMode === 'ONLINE' ? true : data.venues.length > 0,
    judges: data.judges.length > 0,
    debaters: data.debaters.length > 0,
    teams: getTeamCount(data.groupedTeams) > 0,
  } satisfies Record<StepKey, boolean>;
}

function getRecommendedStep(data: SetupData, eventMode: EventMode) {
  const completion = getCompletionState(data, eventMode);
  const visibleSteps = getVisibleSteps(eventMode);
  const firstIncompleteIndex = visibleSteps.findIndex((step) => !completion[step.key]);

  return firstIncompleteIndex === -1 ? visibleSteps.length - 1 : firstIncompleteIndex;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function SetupLoadingSkeleton() {
  return (
    <PageContainer size="lg">
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Card>
        <CardContent className="space-y-6 pt-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepStatusBadge({ complete, label }: { complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {complete ? (
        <span className="flex items-center gap-1.5 text-sm text-status-completed">
          <CheckCircle2 className="h-4 w-4" />
          Complete
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">In progress</span>
      )}
      <Badge variant={complete ? 'completed' : 'outline'}>{label}</Badge>
    </div>
  );
}

export default function TournamentSetupPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { tournamentId, userRole, eventMode: contextEventMode } = useTournament();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [setupData, setSetupData] = useState<SetupData>(EMPTY_SETUP_DATA);
  const [currentStep, setCurrentStep] = useState(0);

  const [venueName, setVenueName] = useState('');
  const [venuePriority, setVenuePriority] = useState('100');
  const [venueCategories, setVenueCategories] = useState<VenueCategoryOption[]>([]);
  const [selectedVenueCategoryIds, setSelectedVenueCategoryIds] = useState<string[]>([]);
  const [newVenueCategoryName, setNewVenueCategoryName] = useState('');
  const [addingVenue, setAddingVenue] = useState(false);
  const [addingVenueCategory, setAddingVenueCategory] = useState(false);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

  const [judgeName, setJudgeName] = useState('');
  const [judgeInstitutionId, setJudgeInstitutionId] = useState('__default__');
  const [judgeInstitutionName, setJudgeInstitutionName] = useState('');
  const [addingJudge, setAddingJudge] = useState(false);
  const [judgeBulkOpen, setJudgeBulkOpen] = useState(false);
  const [judgeBulkNames, setJudgeBulkNames] = useState('');
  const [judgeBulkInstitutionId, setJudgeBulkInstitutionId] = useState('__default__');
  const [judgeBulkInstitutionName, setJudgeBulkInstitutionName] = useState('');
  const [addingJudgesBulk, setAddingJudgesBulk] = useState(false);
  const [judgeBulkResults, setJudgeBulkResults] = useState<
    Array<{ line: number; name: string; success: boolean; error?: string }> | null
  >(null);

  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);

  const [debaterInstitutionMode, setDebaterInstitutionMode] = useState<'existing' | 'new'>('existing');
  const [selectedDebaterInstitutionId, setSelectedDebaterInstitutionId] = useState('');
  const [newDebaterInstitutionName, setNewDebaterInstitutionName] = useState('');
  const [debaterBulkOpen, setDebaterBulkOpen] = useState(false);
  const [debaterBulkNames, setDebaterBulkNames] = useState('');
  const [participantRole, setParticipantRole] = useState<ParticipantRole>('DEBATER');
  const [addingDebatersBulk, setAddingDebatersBulk] = useState(false);
  const [debaterBulkResults, setDebaterBulkResults] = useState<
    Array<{ line: number; name: string; success: boolean; error?: string }> | null
  >(null);
  const [participantSectionsOpen, setParticipantSectionsOpen] = useState<Record<string, boolean>>({});

  const [teamInstitutionId, setTeamInstitutionId] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [assigningParticipantId, setAssigningParticipantId] = useState<string | null>(null);

  const effectiveEventMode: EventMode = tournament?.settings?.eventMode ?? contextEventMode;
  const visibleSteps = useMemo(() => getVisibleSteps(effectiveEventMode), [effectiveEventMode]);
  const completion = useMemo(
    () => getCompletionState(setupData, effectiveEventMode),
    [effectiveEventMode, setupData]
  );
  const completedStepCount = visibleSteps.filter((step) => completion[step.key]).length;
  const allStepsComplete = visibleSteps.every((step) => completion[step.key]);

  const venueCount = setupData.venues.length;
  const judgeCount = setupData.judges.length;
  const debaterCount = setupData.debaters.length;
  const teamCount = getTeamCount(setupData.groupedTeams);

  const currentStepDef = visibleSteps[currentStep] ?? visibleSteps[0];
  const currentStepKey = currentStepDef?.key ?? visibleSteps[0]?.key;
  const currentStepComplete = currentStepKey ? completion[currentStepKey] : false;

  const institutionOptions = setupData.institutions;
  const teamInstitutionOptions = useMemo(
    () => institutionOptions.filter((institution) => !isIndependentAdjudicatorsInstitution(institution)),
    [institutionOptions]
  );

  const participantsByInstitution = useMemo(() => {
    const groups = new Map<string, InstitutionParticipantGroup>();
    const institutionParticipants = [...setupData.debaters, ...setupData.judges].filter(
      (participant) => participant.institutionId !== null
    );

    for (const participant of institutionParticipants) {
      const existing = groups.get(participant.institutionId);
      if (existing) {
        existing.participants.push(participant);
        continue;
      }

      groups.set(participant.institutionId, {
        institution: participant.institution,
        participants: [participant],
      });
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        participants: [...group.participants].sort((left, right) => {
          if (left.role !== right.role) {
            return left.role === 'DEBATER' ? -1 : 1;
          }

          return displayNameFromDbUser(left.user).localeCompare(displayNameFromDbUser(right.user));
        }),
      }))
      .sort((left, right) => left.institution.name.localeCompare(right.institution.name));
  }, [setupData.debaters, setupData.judges]);

  const assignableTeams = useMemo(() => {
    const map = new Map<string, TeamWithMembers[]>();

    for (const team of setupData.teams) {
      const list = map.get(team.institutionId) ?? [];
      list.push(team);
      map.set(team.institutionId, list);
    }

    for (const list of map.values()) {
      list.sort((left, right) => left.name.localeCompare(right.name));
    }

    return map;
  }, [setupData.teams]);

  const institutionNameById = useMemo(
    () => new Map(institutionOptions.map((institution) => [institution.id, institution.name])),
    [institutionOptions]
  );

  const loadSetupData = useCallback(
    async (preserveStep = false) => {
      if (!tournamentId) return null;

      if (!preserveStep) {
        setLoading(true);
      }

      try {
        setLoadError(null);

        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`, {
          cache: 'no-store',
        });

        if (!tournamentResponse.ok) {
          throw new Error('Failed to load tournament details');
        }

        const tournamentData = (await tournamentResponse.json()) as TournamentSummary;

        const [venuesResult, venueCategoriesResult, participantsResult, teamsResult, teamManagementResult] = await Promise.all([
          getTournamentVenues(tournamentId),
          getTournamentVenueCategories(tournamentId),
          getTournamentParticipants(tournamentId),
          getTournamentTeamsPageData(tournamentId),
          getTeamManagementData(tournamentId),
        ]);

        if (!venuesResult.success || !venuesResult.data) {
          throw new Error(venuesResult.error || 'Failed to load venues');
        }

        if (!venueCategoriesResult.success || !venueCategoriesResult.data) {
          throw new Error(venueCategoriesResult.error || 'Failed to load venue categories');
        }

        if (!participantsResult.success || !participantsResult.data) {
          throw new Error(participantsResult.error || 'Failed to load participants');
        }

        if (!teamsResult.success || !teamsResult.data) {
          throw new Error(teamsResult.error || 'Failed to load teams');
        }

        if (!teamManagementResult.success || !teamManagementResult.data) {
          throw new Error(teamManagementResult.error || 'Failed to load team assignments');
        }

        const nextData: SetupData = {
          venues: venuesResult.data,
          judges: participantsResult.data.judges,
          debaters: participantsResult.data.debaters,
          institutions: participantsResult.data.institutions,
          groupedTeams: teamsResult.data.allTeams,
          teams: [...teamManagementResult.data.teams].sort((left, right) => left.name.localeCompare(right.name)),
          unassignedDebaters: [...teamManagementResult.data.unassignedDebaters].sort((left, right) =>
            displayNameFromDbUser(left.user).localeCompare(displayNameFromDbUser(right.user))
          ),
          teamSizeMin: teamManagementResult.data.teamSizeMin,
          teamSizeMax: teamManagementResult.data.teamSizeMax,
        };

        setTournament(tournamentData);
        setSetupData(nextData);
        setVenueCategories(venueCategoriesResult.data);

        if (!preserveStep) {
          setCurrentStep(getRecommendedStep(nextData, tournamentData.settings?.eventMode ?? contextEventMode));
        }

        return {
          tournament: tournamentData,
          data: nextData,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load tournament setup';
        setLoadError(message);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [contextEventMode, tournamentId]
  );

  useEffect(() => {
    void loadSetupData();
  }, [loadSetupData]);

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, Math.max(visibleSteps.length - 1, 0)));
  }, [visibleSteps.length]);

  useEffect(() => {
    setParticipantSectionsOpen((current) => {
      const next = { ...current };

      for (const group of participantsByInstitution) {
        if (!(group.institution.id in next)) {
          next[group.institution.id] = true;
        }
      }

      for (const institutionId of Object.keys(next)) {
        if (!participantsByInstitution.some((group) => group.institution.id === institutionId)) {
          delete next[institutionId];
        }
      }

      return next;
    });
  }, [participantsByInstitution]);

  useEffect(() => {
    if (!institutionOptions.length) {
      setSelectedDebaterInstitutionId('');
      setTeamInstitutionId('');
      return;
    }

    setSelectedDebaterInstitutionId((currentValue) => {
      if (currentValue && institutionOptions.some((institution) => institution.id === currentValue)) {
        return currentValue;
      }

      return institutionOptions[0].id;
    });

    setTeamInstitutionId((currentValue) => {
      if (currentValue && teamInstitutionOptions.some((institution) => institution.id === currentValue)) {
        return currentValue;
      }

      return teamInstitutionOptions[0]?.id ?? '';
    });
  }, [institutionOptions, teamInstitutionOptions]);

  async function handleRefreshStep() {
    await loadSetupData(true);
  }

  async function handleAddVenue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = venueName.trim();
    if (!trimmedName) return;

    const priority = Number(venuePriority);

    setAddingVenue(true);

    try {
      const result = await createVenue({
        tournamentId,
        name: trimmedName,
        priority: Number.isFinite(priority) ? priority : 100,
        categoryIds: selectedVenueCategoryIds.length > 0 ? selectedVenueCategoryIds : undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to add venue');
        return;
      }

      toast.success(`Added venue "${trimmedName}"`);
      setVenueName('');
      setVenuePriority('100');
      setSelectedVenueCategoryIds([]);
      await handleRefreshStep();
    } catch {
      toast.error('Failed to add venue');
    } finally {
      setAddingVenue(false);
    }
  }

  function toggleVenueCategory(categoryId: string) {
    setSelectedVenueCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  async function handleCreateVenueCategory() {
    const trimmedName = newVenueCategoryName.trim();
    if (!trimmedName) return;

    setAddingVenueCategory(true);

    try {
      const result = await createVenueCategory(tournamentId, trimmedName);
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create category');
        return;
      }

      toast.success(`Category "${result.data.name}" created`);
      setVenueCategories((current) => [...current, result.data!].sort((left, right) => left.name.localeCompare(right.name)));
      setSelectedVenueCategoryIds((current) => [...new Set([...current, result.data!.id])]);
      setNewVenueCategoryName('');
    } catch {
      toast.error('Failed to create category');
    } finally {
      setAddingVenueCategory(false);
    }
  }

  async function handleDeleteVenue(venueId: string) {
    setDeletingVenueId(venueId);

    try {
      const result = await deleteVenue(venueId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete venue');
        return;
      }

      toast.success('Venue removed');
      await loadSetupData(true);
    } catch {
      toast.error('Failed to delete venue');
    } finally {
      setDeletingVenueId(null);
    }
  }

  async function handleAddJudge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = judgeName.trim();
    if (!trimmedName) return;

    const creatingInstitution = judgeInstitutionId === '__new__';

    setAddingJudge(true);

    try {
      const result = await addGuestParticipant({
        tournamentId,
        role: 'JUDGE',
        displayName: trimmedName,
        institutionId:
          creatingInstitution || judgeInstitutionId === '__default__'
            ? undefined
            : judgeInstitutionId,
        institutionName: creatingInstitution ? judgeInstitutionName.trim() || undefined : undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to add judge');
        return;
      }

      toast.success(`Added judge "${trimmedName}"`);
      setJudgeName('');
      setJudgeInstitutionId('__default__');
      setJudgeInstitutionName('');
      await handleRefreshStep();
    } catch {
      toast.error('Failed to add judge');
    } finally {
      setAddingJudge(false);
    }
  }

  async function handleBulkAddJudges() {
    if (!judgeBulkNames.trim()) return;

    const creatingInstitution = judgeBulkInstitutionId === '__new__';

    setAddingJudgesBulk(true);
    setJudgeBulkResults(null);

    try {
      const result = await bulkAddGuestParticipants({
        tournamentId,
        role: 'JUDGE',
        names: judgeBulkNames,
        institutionId:
          creatingInstitution || judgeBulkInstitutionId === '__default__'
            ? undefined
            : judgeBulkInstitutionId,
        institutionName: creatingInstitution ? judgeBulkInstitutionName.trim() || undefined : undefined,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to bulk add judges');
        return;
      }

      setJudgeBulkResults(result.data.results);
      toast.success(`Created ${result.data.totalCreated} judge(s)`);

      if (result.data.totalCreated > 0) {
        await handleRefreshStep();
        setJudgeBulkNames('');
      }
    } catch {
      toast.error('Failed to bulk add judges');
    } finally {
      setAddingJudgesBulk(false);
    }
  }

  async function handleRemoveParticipant(participantId: string, label: string) {
    setRemovingParticipantId(participantId);

    try {
      const result = await removeParticipant(tournamentId, participantId);
      if (!result.success) {
        toast.error(result.error || `Failed to remove ${label.toLowerCase()}`);
        return;
      }

      toast.success(`${label} removed`);
      await loadSetupData(true);
    } catch {
      toast.error(`Failed to remove ${label.toLowerCase()}`);
    } finally {
      setRemovingParticipantId(null);
    }
  }

  async function handleBulkAddDebaters() {
    if (!debaterBulkNames.trim()) return;

    if (debaterInstitutionMode === 'existing' && !selectedDebaterInstitutionId) {
      toast.error('Choose an institution first');
      return;
    }

    if (debaterInstitutionMode === 'new' && !newDebaterInstitutionName.trim()) {
      toast.error('Enter an institution name first');
      return;
    }

    setAddingDebatersBulk(true);
    setDebaterBulkResults(null);

    try {
      const roleToCreate: ParticipantRole = selectedInstitutionIsJudgeOnly ? 'JUDGE' : participantRole;
      const result = await bulkAddGuestParticipants({
        tournamentId,
        role: roleToCreate,
        names: debaterBulkNames,
        institutionId:
          debaterInstitutionMode === 'existing' ? selectedDebaterInstitutionId : undefined,
        institutionName:
          debaterInstitutionMode === 'new' ? newDebaterInstitutionName.trim() : undefined,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to add participants');
        return;
      }

      setDebaterBulkResults(result.data.results);
      toast.success(
        `Added ${result.data.totalCreated} ${roleToCreate === 'JUDGE' ? 'judge' : 'debater'}(s)`
      );

      if (result.data.totalCreated > 0) {
        setDebaterBulkNames('');
        setDebaterBulkOpen(false);
        setDebaterInstitutionMode('existing');
        setNewDebaterInstitutionName('');
        const refreshed = await loadSetupData(true);
        const createdInstitutionName =
          debaterInstitutionMode === 'new' ? newDebaterInstitutionName.trim() : null;

        if (debaterInstitutionMode === 'existing') {
          setSelectedDebaterInstitutionId(selectedDebaterInstitutionId);
          if (roleToCreate === 'DEBATER') {
            setTeamInstitutionId(selectedDebaterInstitutionId);
          }
        } else if (createdInstitutionName && refreshed?.data) {
          const matchedInstitution = refreshed.data.institutions.find(
            (institution) => institution.name === createdInstitutionName
          );

          if (matchedInstitution) {
            setSelectedDebaterInstitutionId(matchedInstitution.id);
            if (roleToCreate === 'DEBATER') {
              setTeamInstitutionId(matchedInstitution.id);
            }
          }
        }
      }
    } catch {
      toast.error('Failed to add participants');
    } finally {
      setAddingDebatersBulk(false);
    }
  }

  async function handleCreateTeam() {
    if (!teamInstitutionId) {
      toast.error('Choose an institution first');
      return;
    }

    setCreatingTeam(true);

    try {
      const result = await createTeamAsOrganizer({
        tournamentId,
        institutionId: teamInstitutionId,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create team');
        return;
      }

      toast.success(`Created ${result.data.team.name}`);
      await handleRefreshStep();
    } catch {
      toast.error('Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    setDeletingTeamId(teamId);

    try {
      const result = await deleteTeamAsOrganizer({ teamId });
      if (!result.success) {
        toast.error(result.error || 'Failed to delete team');
        return;
      }

      toast.success('Team removed');
      await loadSetupData(true);
    } catch {
      toast.error('Failed to delete team');
    } finally {
      setDeletingTeamId(null);
    }
  }

  async function handleAssignDebater(participantId: string, teamId: string) {
    setAssigningParticipantId(participantId);

    try {
      const result = await assignDebaterToTeam({
        tournamentId,
        participantId,
        teamId,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to assign debater');
        return;
      }

      toast.success('Debater assigned to team');
      await loadSetupData(true);
    } catch {
      toast.error('Failed to assign debater');
    } finally {
      setAssigningParticipantId(null);
    }
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function goToNextStep() {
    setCurrentStep((step) => Math.min(step + 1, visibleSteps.length - 1));
  }

  function handleSkipStep() {
    if (currentStep < visibleSteps.length - 1) {
      goToNextStep();
      return;
    }

    router.push(`/tournaments/${tournamentId}`);
  }

  function getStepStatusLabel(stepKey: StepKey) {
    switch (stepKey) {
      case 'venues':
        return effectiveEventMode === 'ONLINE'
          ? 'Skipped for online'
          : venueCount > 0
            ? `${formatCount(venueCount, 'venue')} added`
            : 'No venues yet';
      case 'judges':
        return judgeCount > 0 ? `${formatCount(judgeCount, 'judge')} added` : 'No judges yet';
      case 'debaters':
        return participantsByInstitution.length > 0
          ? `${formatCount(debaterCount + judgeCount, 'participant')} across ${formatCount(participantsByInstitution.length, 'institution')}`
          : 'No participants yet';
      case 'teams':
        return teamCount > 0 ? `${formatCount(teamCount, 'team')} created` : 'No teams yet';
    }
  }

  if (loading) {
    return <SetupLoadingSkeleton />;
  }

  if (loadError) {
    return (
      <PageContainer size="lg">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Rocket className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold">We couldn&apos;t load setup just yet</h1>
              <p className="max-w-lg text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button variant="brand" onClick={() => void loadSetupData()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const isOrganizer = userRole === 'ORGANIZER' && !!userId && tournament?.createdByUserId === userId;

  if (!isOrganizer || !tournament) {
    return (
      <PageContainer size="lg">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold">Setup is only available to organizers</h1>
              <p className="max-w-lg text-sm text-muted-foreground">
                If you were expecting organizer access, double-check that you&apos;re signed into the account that created this tournament.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push(`/tournaments/${tournamentId}`)}>
              Back to tournament
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const selectedInstitutionName = institutionOptions.find(
    (institution) => institution.id === selectedDebaterInstitutionId
  )?.name;
  const selectedExistingInstitution = institutionOptions.find(
    (institution) => institution.id === selectedDebaterInstitutionId
  );
  const selectedInstitutionIsJudgeOnly =
    debaterInstitutionMode === 'existing'
    && !!selectedExistingInstitution
    && isIndependentAdjudicatorsInstitution(selectedExistingInstitution);

  return (
    <PageContainer size="lg">
      <PageHeader
        icon={
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <Rocket className="h-6 w-6" />
          </div>
        }
        title="Tournament setup"
        description={`Guide ${tournament.name} through the essentials. A few quick additions here will make the rest of the tournament flow much smoother.`}
        actions={(
          <Button variant="outline" onClick={handleSkipStep}>
            Skip for now
          </Button>
        )}
      />

      <Card className="overflow-hidden">
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-brand" />
                <span>
                  Step {currentStep + 1} of {visibleSteps.length}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">You&apos;re making great progress</h2>
                <p className="text-sm text-muted-foreground">
                  {allStepsComplete
                    ? 'Everything essential is in place. Give the last step a quick review, then head back to the tournament overview.'
                    : `${completedStepCount} of ${visibleSteps.length} setup steps are complete.${
                        effectiveEventMode === 'ONLINE'
                          ? ' Online tournaments skip venue setup automatically.'
                          : ''
                      }`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {visibleSteps.map((step) => (
                <Badge
                  key={step.key}
                  variant={completion[step.key] ? 'completed' : 'outline'}
                  className="gap-1.5"
                >
                  {completion[step.key] && <CheckCircle2 className="h-3 w-3" />}
                  {step.label}
                </Badge>
              ))}
            </div>
          </div>

          <StepIndicator
            steps={visibleSteps.map((step) => ({
              label: step.label,
              description: step.description,
            }))}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            className="mb-2"
          />
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <currentStepDef.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">{currentStepDef.label}</CardTitle>
              <CardDescription>{currentStepDef.description}</CardDescription>
              <p className="text-sm text-muted-foreground">{currentStepDef.helper}</p>
            </div>
          </div>

          <StepStatusBadge
            complete={completion[currentStepDef.key]}
            label={getStepStatusLabel(currentStepDef.key)}
          />
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStepDef.key === 'venues' && (
            <>
              <form onSubmit={handleAddVenue} className="rounded-xl border bg-muted/20 p-4">
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_160px_auto] lg:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="venue-name">Venue name</Label>
                      <Input
                        id="venue-name"
                        placeholder="e.g. Room A201"
                        value={venueName}
                        onChange={(event) => setVenueName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-priority">Priority</Label>
                      <Input
                        id="venue-priority"
                        type="number"
                        min={0}
                        value={venuePriority}
                        onChange={(event) => setVenuePriority(event.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="brand" disabled={addingVenue || !venueName.trim()}>
                      {addingVenue ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Add Venue
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Categories</Label>
                      <p className="text-xs text-muted-foreground">Optional, but helpful for room planning.</p>
                    </div>

                    {venueCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {venueCategories.map((category) => {
                          const selected = selectedVenueCategoryIds.includes(category.id);

                          return (
                            <Badge
                              key={category.id}
                              variant={selected ? 'default' : 'outline'}
                              className="cursor-pointer select-none"
                              onClick={() => toggleVenueCategory(category.id)}
                            >
                              {category.name}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No categories yet. Create one below and it will be selected automatically.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-venue-category">Create a category</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="new-venue-category"
                        placeholder="e.g. Finals rooms, Accessible, Main building"
                        value={newVenueCategoryName}
                        onChange={(event) => setNewVenueCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleCreateVenueCategory();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleCreateVenueCategory()}
                        disabled={addingVenueCategory || !newVenueCategoryName.trim()}
                      >
                        {addingVenueCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Add Category
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Current venues</h3>
                  <p className="text-sm text-muted-foreground">
                    {venueCount > 0
                      ? `${formatCount(venueCount, 'venue')} ready for allocation`
                      : 'Add your first room to unlock the next step.'}
                  </p>
                </div>

                {setupData.venues.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No venues yet"
                    description="Start with your main debate rooms. You can always add more later."
                  />
                ) : (
                  <div className="divide-y rounded-xl border bg-card/50">
                    {setupData.venues.map((venue) => (
                      <div key={venue.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{venue.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">Priority {venue.priority}</Badge>
                            {!venue.isActive && <Badge variant="outline">Inactive</Badge>}
                            {venue.categories.map((category) => (
                              <Badge key={category.id} variant="secondary">
                                {category.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void handleDeleteVenue(venue.id)}
                          disabled={deletingVenueId === venue.id}
                        >
                          {deletingVenueId === venue.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentStepDef.key === 'judges' && (
            <>
              <form onSubmit={handleAddJudge} className="rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="judge-name">Judge name</Label>
                      <Input
                        id="judge-name"
                        placeholder="e.g. Amina Rahman"
                        value={judgeName}
                        onChange={(event) => setJudgeName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Institution</Label>
                      <Select value={judgeInstitutionId} onValueChange={setJudgeInstitutionId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Independent Adjudicators (default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Independent Adjudicators (default)</SelectItem>
                          {institutionOptions.map((institution) => (
                            <SelectItem key={institution.id} value={institution.id}>
                              {institution.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__">Create new institution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" variant="brand" disabled={addingJudge || !judgeName.trim()}>
                      {addingJudge ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Add Judge
                    </Button>
                  </div>

                  {judgeInstitutionId === '__new__' && (
                    <div className="space-y-2">
                      <Label htmlFor="judge-new-institution">New institution</Label>
                      <Input
                        id="judge-new-institution"
                        placeholder="e.g. Riverdale College"
                        value={judgeInstitutionName}
                        onChange={(event) => setJudgeInstitutionName(event.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Adding one judge at a time is great for quick edits. Use bulk add when you already have a list ready.
                    </p>
                    <Dialog
                      open={judgeBulkOpen}
                      onOpenChange={(open) => {
                        setJudgeBulkOpen(open);
                        if (!open) {
                          setJudgeBulkResults(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline">Bulk Add</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Bulk add judges</DialogTitle>
                          <DialogDescription>
                            Paste one name per line and we&apos;ll create the judge roster in one pass.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Institution</Label>
                            <Select
                              value={judgeBulkInstitutionId}
                              onValueChange={setJudgeBulkInstitutionId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Independent Adjudicators (default)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__default__">Independent Adjudicators (default)</SelectItem>
                                {institutionOptions.map((institution) => (
                                  <SelectItem key={institution.id} value={institution.id}>
                                    {institution.name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__new__">Create new institution</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {judgeBulkInstitutionId === '__new__' && (
                            <div className="space-y-2">
                              <Label htmlFor="judge-bulk-new-institution">New institution</Label>
                              <Input
                                id="judge-bulk-new-institution"
                                placeholder="e.g. Riverdale College"
                                value={judgeBulkInstitutionName}
                                onChange={(event) => setJudgeBulkInstitutionName(event.target.value)}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="judge-bulk-names">Judge names</Label>
                            <Textarea
                              id="judge-bulk-names"
                              rows={8}
                              placeholder={'Amina Rahman\nJonah Ellis\nPriya Kapoor'}
                              value={judgeBulkNames}
                              onChange={(event) => setJudgeBulkNames(event.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              {judgeBulkNames.split('\n').filter((line) => line.trim()).length} name(s) entered
                            </p>
                          </div>

                          {judgeBulkResults && (
                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
                              {judgeBulkResults.map((result) => (
                                <div
                                  key={result.line}
                                  className={cn(
                                    'flex justify-between gap-4',
                                    result.success ? 'text-status-completed' : 'text-destructive'
                                  )}
                                >
                                  <span>
                                    {result.line}. {result.name}
                                  </span>
                                  <span>{result.success ? 'Created' : result.error || 'Failed'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="brand"
                            onClick={() => void handleBulkAddJudges()}
                            disabled={addingJudgesBulk || !judgeBulkNames.trim()}
                          >
                            {addingJudgesBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Add All Judges
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Current judges</h3>
                  <p className="text-sm text-muted-foreground">
                    {judgeCount > 0
                      ? `${formatCount(judgeCount, 'judge')} ready for allocations and ballots`
                      : 'Add at least one adjudicator to continue.'}
                  </p>
                </div>

                {setupData.judges.length === 0 ? (
                  <EmptyState
                    icon={Gavel}
                    title="Your judge roster starts here"
                    description="Add chair judges, panels, or independent adjudicators now and refine the list later."
                  />
                ) : (
                  <div className="divide-y rounded-xl border bg-card/50">
                    {setupData.judges.map((judge) => (
                      <div key={judge.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{displayNameFromDbUser(judge.user)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{judge.institution.name}</span>
                            {judge.user.id.startsWith('guest_') && <Badge variant="outline">Guest</Badge>}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void handleRemoveParticipant(judge.id, 'Judge')}
                          disabled={removingParticipantId === judge.id}
                        >
                          {removingParticipantId === judge.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentStepDef.key === 'debaters' && (
            <>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium">Create an institution</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a new institution here, then add participants directly from the institution cards below.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="new-institution-name"
                    placeholder="e.g. Eastbridge Academy"
                    value={newDebaterInstitutionName}
                    onChange={(event) => setNewDebaterInstitutionName(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() => {
                      setDebaterInstitutionMode('new');
                      setDebaterBulkResults(null);
                      setDebaterBulkOpen(true);
                    }}
                    disabled={!newDebaterInstitutionName.trim()}
                  >
                    Create Institution
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The institution is created automatically when you add the first participants.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Participants by institution</h3>
                  <p className="text-sm text-muted-foreground">
                    {participantsByInstitution.length > 0
                      ? `${formatCount(debaterCount + judgeCount, 'participant')} across ${formatCount(participantsByInstitution.length, 'institution')}`
                      : 'Add your first institution and roster to unlock team creation.'}
                  </p>
                </div>

                {participantsByInstitution.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No participants yet"
                    description="Create an institution and register a few participants. Even a small starter roster is enough to keep moving."
                  />
                ) : (
                  <div className="space-y-4">
                    {participantsByInstitution.map((group) => (
                      <Collapsible
                        key={group.institution.id}
                        open={participantSectionsOpen[group.institution.id] ?? true}
                        onOpenChange={(open) =>
                          setParticipantSectionsOpen((current) => ({
                            ...current,
                            [group.institution.id]: open,
                          }))
                        }
                      >
                        <div className="rounded-xl border bg-card/50">
                          <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                >
                                  <ChevronDown
                                    className={cn(
                                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                      !(participantSectionsOpen[group.institution.id] ?? true) && '-rotate-90'
                                    )}
                                  />
                                  <div className="min-w-0">
                                    <p className="font-medium">{group.institution.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatCount(group.participants.length, 'participant')}
                                    </p>
                                  </div>
                                </button>
                              </CollapsibleTrigger>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDebaterInstitutionMode('existing');
                                  setSelectedDebaterInstitutionId(group.institution.id);
                                  setParticipantRole(
                                    isIndependentAdjudicatorsInstitution(group.institution) ? 'JUDGE' : 'DEBATER'
                                  );
                                  setDebaterBulkResults(null);
                                  setDebaterBulkOpen(true);
                                }}
                              >
                                {isIndependentAdjudicatorsInstitution(group.institution) ? 'Add Judges' : 'Add Participants'}
                              </Button>
                            </div>
                            <Badge variant="outline">
                              {isIndependentAdjudicatorsInstitution(group.institution) ? 'Judges only' : 'Institution'}
                            </Badge>
                          </div>
                          <CollapsibleContent>
                            <div className="divide-y">
                              {group.participants.map((participant) => (
                                <div key={participant.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-medium">{displayNameFromDbUser(participant.user)}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <Badge variant={participant.role === 'JUDGE' ? 'secondary' : 'outline'}>
                                        {participant.role === 'JUDGE' ? 'Judge' : 'Debater'}
                                      </Badge>
                                      {participant.role === 'DEBATER' && participant.teamMembership ? (
                                        <Badge variant="secondary">Already in a team</Badge>
                                      ) : null}
                                      {participant.role === 'DEBATER' && !participant.teamMembership ? (
                                        <Badge variant="outline">Unassigned</Badge>
                                      ) : null}
                                      {participant.user.id.startsWith('guest_') && <Badge variant="outline">Guest</Badge>}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      void handleRemoveParticipant(
                                        participant.id,
                                        participant.role === 'JUDGE' ? 'Judge' : 'Debater'
                                      )
                                    }
                                    disabled={removingParticipantId === participant.id}
                                  >
                                    {removingParticipantId === participant.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </div>

              <Dialog
                open={debaterBulkOpen}
                onOpenChange={(open) => {
                  setDebaterBulkOpen(open);
                  if (!open) {
                    setDebaterBulkResults(null);
                  }
                }}
              >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {debaterInstitutionMode === 'new'
                        ? `Create ${newDebaterInstitutionName.trim() || 'institution'} & add participants`
                        : selectedInstitutionIsJudgeOnly
                          ? `Add judges to ${selectedInstitutionName || 'institution'}`
                          : `Add participants to ${selectedInstitutionName || 'institution'}`}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedInstitutionIsJudgeOnly
                        ? 'Independent Adjudicators is reserved for judge-only entries. Add judges here, then manage debaters under a school or club institution so they can be placed on teams.'
                        : 'Paste one name per line, then choose whether they should be added as debaters or judges. Debaters can be assigned to teams in the next step.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {selectedInstitutionIsJudgeOnly ? (
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        Role is fixed to <span className="font-medium text-foreground">Judge</span> for Independent Adjudicators.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="participant-role">Role</Label>
                        <Select
                          value={participantRole}
                          onValueChange={(value) => setParticipantRole(value as ParticipantRole)}
                        >
                          <SelectTrigger id="participant-role">
                            <SelectValue placeholder="Choose a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBATER">Debater</SelectItem>
                            <SelectItem value="JUDGE">Judge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="debater-bulk-names">Participant names</Label>
                      <Textarea
                        id="debater-bulk-names"
                        rows={8}
                        placeholder={'Lina Chen\nMateo Silva\nNoor Hassan'}
                        value={debaterBulkNames}
                        onChange={(event) => setDebaterBulkNames(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {debaterBulkNames.split('\n').filter((line) => line.trim()).length} name(s) entered
                      </p>
                    </div>

                    {debaterBulkResults && (
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
                        {debaterBulkResults.map((result) => (
                          <div
                            key={result.line}
                            className={cn(
                              'flex justify-between gap-4',
                              result.success ? 'text-status-completed' : 'text-destructive'
                            )}
                          >
                            <span>
                              {result.line}. {result.name}
                            </span>
                            <span>{result.success ? 'Created' : result.error || 'Failed'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="brand"
                      onClick={() => void handleBulkAddDebaters()}
                      disabled={addingDebatersBulk || !debaterBulkNames.trim()}
                    >
                      {addingDebatersBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {debaterInstitutionMode === 'new'
                        ? `Create & Add ${participantRole === 'JUDGE' ? 'Judges' : 'Debaters'}`
                        : `Add ${(selectedInstitutionIsJudgeOnly ? 'JUDGE' : participantRole) === 'JUDGE' ? 'Judges' : 'Debaters'}`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          {currentStepDef.key === 'teams' && (
            <>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[260px_auto] lg:items-end">
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Select value={teamInstitutionId} onValueChange={setTeamInstitutionId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an institution" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamInstitutionOptions.map((institution) => (
                          <SelectItem key={institution.id} value={institution.id}>
                            {institution.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() => void handleCreateTeam()}
                    disabled={creatingTeam || !teamInstitutionId}
                  >
                    {creatingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create Team
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Teams are auto-named for you, so you can move quickly and tidy names later if needed.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Current teams</h3>
                  <p className="text-sm text-muted-foreground">
                    {teamCount > 0
                      ? `${formatCount(teamCount, 'team')} created · team size ${setupData.teamSizeMin}-${setupData.teamSizeMax}`
                      : 'Create your first team once you have debaters in place.'}
                  </p>
                </div>

                {setupData.teams.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No teams yet"
                    description="Pick an institution, create a team, and then assign any unassigned debaters below."
                  />
                ) : (
                  <div className="divide-y rounded-xl border bg-card/50">
                    {setupData.teams.map((team) => (
                      <div key={team.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{team.institution.name}</span>
                            <Badge variant="outline">
                              {formatCount(team.members.length, 'member')}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void handleDeleteTeam(team.id)}
                          disabled={deletingTeamId === team.id}
                        >
                          {deletingTeamId === team.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Unassigned participants</h3>
                  <p className="text-sm text-muted-foreground">
                    {setupData.unassignedDebaters.length > 0
                      ? `${formatCount(setupData.unassignedDebaters.length, 'participant')} still need a team`
                      : 'Everyone already has a team — nice work.'}
                  </p>
                </div>

                {setupData.unassignedDebaters.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="All participants are assigned"
                    description="Your roster is in good shape. If all four steps are complete, you can wrap up setup now."
                  />
                ) : (
                  <div className="divide-y rounded-xl border bg-card/50">
                    {setupData.unassignedDebaters.map((debater) => {
                      const institutionTeams = assignableTeams.get(debater.institutionId) ?? [];
                      const institutionName = institutionNameById.get(debater.institutionId) ?? 'Unknown institution';

                      return (
                        <div key={debater.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="font-medium">{displayNameFromDbUser(debater.user)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{institutionName}</p>
                          </div>

                          <div className="w-full max-w-xs">
                            <Select
                              value={undefined}
                              onValueChange={(value) => void handleAssignDebater(debater.id, value)}
                              disabled={assigningParticipantId === debater.id || institutionTeams.length === 0}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={
                                    institutionTeams.length > 0
                                      ? 'Assign to a team'
                                      : 'Create a team first'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {institutionTeams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {currentStepComplete
                ? 'Nice — this step has what it needs.'
                : `Add at least one ${currentStepDef.label.toLowerCase().slice(0, -1) || currentStepDef.label.toLowerCase()} to continue.`}
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <Button type="button" variant="ghost" onClick={handleSkipStep}>
                Skip for now
              </Button>

              <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentStep < visibleSteps.length - 1 ? (
                <Button type="button" variant="brand" onClick={goToNextStep} disabled={!currentStepComplete}>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : allStepsComplete ? (
                <Button type="button" variant="brand" onClick={() => router.push(`/tournaments/${tournamentId}`)}>
                  Complete Setup
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" variant="brand" disabled>
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

