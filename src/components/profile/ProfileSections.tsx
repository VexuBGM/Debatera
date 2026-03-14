import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PublicProfileData } from '@/lib/services/profile';
import { Trophy, Users, Gavel, Building2 } from 'lucide-react';

interface ProfileSectionsProps {
  user: PublicProfileData;
  /** Show owner-only sections */
  isOwner?: boolean;
}

export default function ProfileSections({ user, isOwner }: ProfileSectionsProps) {
  const participations = user.tournamentParticipants ?? [];
  const debaterCount = participations.filter((p) => p.role === 'DEBATER').length;
  const judgeCount = participations.filter((p) => p.role === 'JUDGE').length;
  const institutions = user.institutionMemberships ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Bio */}
      {user.bio && (
        <Card className="bg-white/5 border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-white/80">{user.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Role summary */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Roles summary</CardTitle>
          <CardDescription className="text-white/50">
            Across all tournaments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <span className="text-sm text-white/80">
                <span className="font-semibold text-white">{debaterCount}</span>{' '}
                as Debater
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white/80">
                <span className="font-semibold text-white">{judgeCount}</span>{' '}
                as Judge
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournaments participated */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand" />
            Tournaments
          </CardTitle>
          <CardDescription className="text-white/50">
            {participations.length} participation{participations.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participations.length === 0 ? (
            <p className="text-sm text-white/40">No tournament participations yet.</p>
          ) : (
            <ul className="space-y-2">
              {participations.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {p.tournament.name}
                    </span>
                    <span className="text-xs text-white/50">
                      via {p.institution.name}
                    </span>
                    {p.teamMembership?.team && (
                      <span className="text-xs text-white/50">
                        {' · '}Team: {p.teamMembership.team.name}
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={p.role === 'JUDGE' ? 'outline' : 'secondary'}
                    className="ml-2 shrink-0 text-xs"
                  >
                    {p.role}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Institutions */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand" />
            Institutions
          </CardTitle>
          <CardDescription className="text-white/50">
            {institutions.length} institution{institutions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {institutions.length === 0 ? (
            <p className="text-sm text-white/40">No institution memberships.</p>
          ) : (
            <ul className="space-y-2">
              {institutions.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {m.institution.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                    {m.role}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Private section (owner only) */}
      {isOwner && (
        <Card className="bg-white/5 border-white/10 md:col-span-2 border-dashed border-brand/30">
          <CardHeader>
            <CardTitle className="text-brand">Private section</CardTitle>
            <CardDescription className="text-white/50">
              Only you can see this section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/60">
              {/* TODO: Add "Upcoming debates" (derive from TournamentRound status + TournamentDebate assignments). */}
              {/* TODO: Add judge feedback history / ballots summary. */}
              {/* TODO: Add profile privacy settings per field. */}
              Nothing here yet — upcoming debates, feedback history, and more will appear here in a future update.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
