'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  ArrowRight,
  Users,
  AlertCircle,
  CheckCircle,
  Layers3,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';

type TournamentRole = 'ORGANIZER' | 'DEBATER' | 'JUDGE' | 'INSTITUTION';
type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';
type InstitutionRole = 'ADMIN' | 'MEMBER';

interface DashboardStats {
  tournamentsCount: number;
  institutionsCount: number;
  upcomingTournamentsCount: number;
}

interface DashboardSummary {
  closingSoonCount: number;
  pendingApprovalsCount: number;
  liveRoundsCount: number;
}

interface DashboardTournamentPreview {
  id: string;
  name: string;
  createdAt: string;
  registrationClosesAt: string | null;
  role: TournamentRole;
  participantsCount: number;
  institutionsCount: number;
  roundsCount: number;
}

interface RecentTournament extends DashboardTournamentPreview {
  pendingRegistrationsCount: number;
  latestRound: {
    id: string;
    name: string;
    status: RoundStatus;
    updatedAt: string;
  } | null;
}

interface RecentInstitution {
  id: string;
  name: string;
  createdAt: string;
  joinedAt: string;
  role: InstitutionRole;
  membersCount: number;
  tournamentRegistrationsCount: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  summary: DashboardSummary;
  upcomingTournaments: DashboardTournamentPreview[];
  recentTournaments: RecentTournament[];
  recentInstitutions: RecentInstitution[];
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDate(value: string) {
  const then = new Date(value);
  const now = new Date();
  const diffMs = then.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) <= 1) {
    if (diffDays === 0) return 'today';
    return diffDays > 0 ? 'tomorrow' : 'yesterday';
  }

  if (diffDays > 1) {
    return `in ${diffDays} days`;
  }

  return `${Math.abs(diffDays)} days ago`;
}

function getTournamentRoleVariant(role: TournamentRole) {
  switch (role) {
    case 'ORGANIZER':
      return 'organizer';
    case 'JUDGE':
      return 'judge';
    case 'DEBATER':
      return 'debater';
    default:
      return 'outline';
  }
}

function getTournamentRoleLabel(role: TournamentRole) {
  switch (role) {
    case 'ORGANIZER':
      return 'Organizer';
    case 'JUDGE':
      return 'Judge';
    case 'DEBATER':
      return 'Debater';
    default:
      return 'Institution';
  }
}

function getRoundStatusVariant(status: RoundStatus) {
  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'PUBLISHED':
      return 'published';
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'COMPLETED':
      return 'completed';
  }
}

function getRoundStatusLabel(status: RoundStatus) {
  switch (status) {
    case 'IN_PROGRESS':
      return 'In progress';
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

function getTournamentSecondaryText(tournament: RecentTournament) {
  if (tournament.pendingRegistrationsCount > 0 && tournament.role === 'ORGANIZER') {
    return `${tournament.pendingRegistrationsCount} pending institution ${tournament.pendingRegistrationsCount === 1 ? 'request' : 'requests'} to review`;
  }

  if (tournament.latestRound) {
    return `${tournament.latestRound.name} was updated ${formatRelativeDate(tournament.latestRound.updatedAt)}`;
  }

  if (tournament.registrationClosesAt) {
    return `Registration closes ${formatRelativeDate(tournament.registrationClosesAt)}`;
  }

  return `Created ${formatRelativeDate(tournament.createdAt)}`;
}

const quickActions = [
  {
    title: 'Browse Tournaments',
    description: 'Find and join upcoming tournaments',
    icon: Trophy,
    href: '/tournaments',
    color: 'text-yellow-500',
  },
  {
    title: 'Manage Institutions',
    description: 'View and manage your institutions',
    icon: Building2,
    href: '/institutions',
    color: 'text-brand',
  },
  {
    title: 'Create Tournament',
    description: 'Start organizing a new tournament',
    icon: Calendar,
    href: '/tournaments/new',
    color: 'text-green-500',
  },
];

const HomePage = () => {
  const { user, isLoaded } = useUser();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      void fetchDashboardData();
      return;
    }

    if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load dashboard');
      }

      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <PageContainer size="lg">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-72" />
      </PageContainer>
    );
  }

  const stats = dashboard?.stats;
  const summary = dashboard?.summary;
  const upcomingTournaments = dashboard?.upcomingTournaments ?? [];
  const recentTournaments = dashboard?.recentTournaments ?? [];
  const recentInstitutions = dashboard?.recentInstitutions ?? [];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'Debater'}!`}
        description="Here's what's happening with your debates today"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-linear-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tournamentsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Your active tournaments</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-brand/10 to-brand/5 border-brand/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Institutions</CardTitle>
            <Building2 className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.institutionsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Institutions you belong to</p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closing Soon</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingTournamentsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registration deadlines in the next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="transition-all hover:shadow-lg hover:scale-105 cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {upcomingTournaments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Closing Soon</h2>
            <Link href="/tournaments">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingTournaments.map((tournament) => (
              <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
                <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base line-clamp-1">{tournament.name}</CardTitle>
                      <Badge variant={getTournamentRoleVariant(tournament.role)}>
                        {getTournamentRoleLabel(tournament.role)}
                      </Badge>
                    </div>
                    {tournament.registrationClosesAt && (
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        Closes {formatShortDate(tournament.registrationClosesAt)} ({formatRelativeDate(tournament.registrationClosesAt)})
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>{tournament.participantsCount} participants</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        <span>{tournament.institutionsCount} institutions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Quick, useful updates about your tournaments and institutions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-green-500" />
                Closing Soon
              </div>
              <p className="mt-3 text-2xl font-semibold">{summary?.closingSoonCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Tournament deadlines in the next 30 days</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Pending Approvals
              </div>
              <p className="mt-3 text-2xl font-semibold">{summary?.pendingApprovalsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Institution requests waiting in your tournaments</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Layers3 className="h-4 w-4 text-brand" />
                Live Rounds
              </div>
              <p className="mt-3 text-2xl font-semibold">{summary?.liveRoundsCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Published or in-progress rounds across your tournaments</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Your Tournaments</h3>
                <Link href="/tournaments">
                  <Button variant="ghost" size="sm">Open</Button>
                </Link>
              </div>

              {recentTournaments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No tournament activity yet. Create one or join an institution registration to get started.
                </div>
              ) : (
                recentTournaments.map((tournament) => (
                  <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:border-primary/50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{tournament.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {getTournamentSecondaryText(tournament)}
                          </p>
                        </div>
                        <Badge variant={getTournamentRoleVariant(tournament.role)}>
                          {getTournamentRoleLabel(tournament.role)}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{tournament.participantsCount} participants</Badge>
                        <Badge variant="outline">{tournament.institutionsCount} institutions</Badge>
                        <Badge variant="outline">{tournament.roundsCount} rounds</Badge>
                        {tournament.latestRound && (
                          <Badge variant={getRoundStatusVariant(tournament.latestRound.status)}>
                            {getRoundStatusLabel(tournament.latestRound.status)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Your Institutions</h3>
                <Link href="/institutions">
                  <Button variant="ghost" size="sm">Open</Button>
                </Link>
              </div>

              {recentInstitutions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No institution activity yet. Create an institution to start managing teams and registrations.
                </div>
              ) : (
                recentInstitutions.map((institution) => (
                  <Link key={institution.id} href={`/institutions/${institution.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:border-primary/50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{institution.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Joined {formatRelativeDate(institution.joinedAt)} - Created {formatShortDate(institution.createdAt)}
                          </p>
                        </div>
                        <Badge variant={institution.role === 'ADMIN' ? 'organizer' : 'outline'}>
                          {institution.role === 'ADMIN' ? 'Admin' : 'Member'}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{institution.membersCount} members</Badge>
                        <Badge variant="outline">
                          {institution.tournamentRegistrationsCount} tournament {institution.tournamentRegistrationsCount === 1 ? 'registration' : 'registrations'}
                        </Badge>
                        {institution.role === 'ADMIN' && (
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3" />
                            Can manage
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default HomePage;
