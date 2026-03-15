'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PaginationControls } from '@/components/ui/pagination';
import { Users } from 'lucide-react';
import type { TeamWithMembers } from '@/actions/teams.actions';
import { displayNameFromDbUser, initialsFromDbUser } from '@/lib/users/displayName';

interface AllTeamsListProps {
    allTeams: {
        institution: { id: string; name: string };
        teams: TeamWithMembers[];
    }[];
    teamMinSize: number;
    teamMaxSize: number;
}

const INSTITUTIONS_PAGE_SIZE = 9; // 3 columns × 3 rows

/**
 * Read-only view of all teams across all institutions.
 * Displayed as grouped cards by institution.
 */
export function AllTeamsList({ allTeams, teamMinSize, teamMaxSize }: AllTeamsListProps) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(allTeams.length / INSTITUTIONS_PAGE_SIZE));
    const pagedInstitutions = allTeams.slice(
        (page - 1) * INSTITUTIONS_PAGE_SIZE,
        page * INSTITUTIONS_PAGE_SIZE,
    );

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
        <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white">All Teams</h2>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {pagedInstitutions.map(({ institution, teams }) => (
                    <Card key={institution.id} className="gap-0 border-white/10 bg-white/5 py-0">
                        <CardHeader className="px-4 py-3">
                            <CardTitle className="text-sm font-medium text-white/70">
                                {institution.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 px-4 py-3">
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
                                            className="space-y-2 rounded-lg bg-white/5 p-2.5"
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
                                                <div className="flex flex-wrap gap-1.5">
                                                    {team.members.map(member => {
                                                        const displayName = displayNameFromDbUser(member.participant.user);
                                                        const initials = initialsFromDbUser(member.participant.user);

                                                        return (
                                                            <div
                                                                key={member.id}
                                                                className="flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1"
                                                            >
                                                                <Avatar className="h-4.5 w-4.5">
                                                                    <AvatarImage
                                                                        src={member.participant.user.imageUrl ?? undefined}
                                                                        alt={displayName}
                                                                    />
                                                                    <AvatarFallback className="bg-brand/20 text-brand text-[10px]">
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
            {allTeams.length > INSTITUTIONS_PAGE_SIZE && (
                <PaginationControls
                    pagination={{
                        page,
                        pageSize: INSTITUTIONS_PAGE_SIZE,
                        total: allTeams.length,
                        totalPages,
                        hasNextPage: page < totalPages,
                        hasPreviousPage: page > 1,
                    }}
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}
