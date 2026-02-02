'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import type { TeamWithMembers } from '@/actions/teams.actions';

interface AllTeamsListProps {
    allTeams: {
        institution: { id: string; name: string };
        teams: TeamWithMembers[];
    }[];
    teamMinSize: number;
    teamMaxSize: number;
}

/**
 * Read-only view of all teams across all institutions.
 * Displayed as grouped cards by institution.
 */
export function AllTeamsList({ allTeams, teamMinSize, teamMaxSize }: AllTeamsListProps) {
    if (allTeams.length === 0) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="py-12 text-center">
                    <Users className="h-10 w-10 mx-auto text-white/30 mb-3" />
                    <p className="text-white/50">No teams have been created yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">All Teams</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allTeams.map(({ institution, teams }) => (
                    <Card key={institution.id} className="bg-white/5 border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-white/70">
                                {institution.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {teams.length === 0 ? (
                                <p className="text-sm text-white/40">No teams</p>
                            ) : (
                                teams.map(team => {
                                    const memberCount = team.members.length;
                                    const needsMore = memberCount < teamMinSize;
                                    const isFull = memberCount >= teamMaxSize;

                                    return (
                                        <div
                                            key={team.id}
                                            className="bg-white/5 rounded-lg p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-white">
                                                    {team.name}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {needsMore && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-yellow-400 border-yellow-400/50 text-xs"
                                                        >
                                                            Needs {teamMinSize - memberCount}
                                                        </Badge>
                                                    )}
                                                    {isFull && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-green-400 border-green-400/50 text-xs"
                                                        >
                                                            Full
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-white/40">
                                                        ({memberCount})
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Team members */}
                                            {team.members.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {team.members.map(member => {
                                                        const displayName =
                                                            member.participant.user.username ||
                                                            member.participant.user.email?.split('@')[0] ||
                                                            'Unknown';
                                                        const initials = displayName.slice(0, 2).toUpperCase();

                                                        return (
                                                            <div
                                                                key={member.id}
                                                                className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1"
                                                            >
                                                                <Avatar className="h-5 w-5">
                                                                    <AvatarImage
                                                                        src={member.participant.user.imageUrl ?? undefined}
                                                                        alt={displayName}
                                                                    />
                                                                    <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-[10px]">
                                                                        {initials}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs text-white/70">
                                                                    {displayName}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
