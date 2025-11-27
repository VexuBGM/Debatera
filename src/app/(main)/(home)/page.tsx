'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, Building2, Calendar, Users, Video, Bell, 
  TrendingUp, ArrowRight, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  tournamentsCount: number;
  institutionsCount: number;
  upcomingDebates: number;
  notifications: number;
}

interface UpcomingTournament {
  id: string;
  name: string;
  startDate: string;
  isVerified: boolean;
  _count: {
    participations: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'tournament' | 'institution' | 'debate';
  title: string;
  description: string;
  timestamp: string;
  href: string;
}

const HomePage = () => {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingTournaments, setUpcomingTournaments] = useState<UpcomingTournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData();
    }
  }, [isLoaded, user]);

  const fetchDashboardData = async () => {
    try {
      const [tournamentsRes, institutionsRes, notificationsRes] = await Promise.all([
        fetch('/api/tournaments'),
        fetch('/api/institutions'),
        fetch('/api/notifications')
      ]);

      const tournaments = await tournamentsRes.json();
      const institutions = await institutionsRes.json();
      const notifications = await notificationsRes.json();

      // Filter upcoming tournaments (within next 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcoming = tournaments.filter((t: UpcomingTournament) => {
        const startDate = new Date(t.startDate);
        return startDate >= now && startDate <= thirtyDaysFromNow;
      });

      setStats({
        tournamentsCount: tournaments.length,
        institutionsCount: institutions.length,
        upcomingDebates: 0, // Will be calculated when debates feature is implemented
        notifications: notifications.institutionInvites?.length || 0
      });

      setUpcomingTournaments(upcoming.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Browse Tournaments',
      description: 'Find and join upcoming tournaments',
      icon: Trophy,
      href: '/tournaments',
      color: 'text-yellow-500'
    },
    {
      title: 'Manage Institutions',
      description: 'View and manage your institutions',
      icon: Building2,
      href: '/institutions',
      color: 'text-cyan-500'
    },
    {
      title: 'Create Tournament',
      description: 'Start organizing a new tournament',
      icon: Calendar,
      href: '/tournaments/new',
      color: 'text-green-500'
    }
  ];

  if (!isLoaded || loading) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          Welcome back, {user?.firstName || user?.username || 'Debater'}!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Here's what's happening with your debates today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-linear-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournaments</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tournamentsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active tournaments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Institutions</CardTitle>
            <Building2 className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.institutionsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered institutions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTournaments.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.notifications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending invites
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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

      {/* Upcoming Tournaments */}
      {upcomingTournaments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Tournaments</h2>
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
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1">
                        {tournament.name}
                      </CardTitle>
                      {tournament.isVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3" />
                      {new Date(tournament.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{tournament._count?.participations || 0} participants</span>
                      </div>
                      <Badge variant={tournament.isVerified ? "default" : "secondary"} className="text-xs">
                        {tournament.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your recent tournaments and institution updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent activity to display</p>
            <p className="text-xs mt-1">Start by joining a tournament or creating an institution</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;
