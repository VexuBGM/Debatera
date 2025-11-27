'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Users } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  institution: {
    id: string;
    name: string;
  };
  participations: Array<{
    user: {
      id: string;
      username: string | null;
      email: string | null;
    };
  }>;
}

interface UnpairedTeamsPoolProps {
  teams: TournamentTeam[];
  pairedTeamIds: Set<string>;
}

function DraggableTeam({ team }: { team: TournamentTeam }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `team-${team.id}`,
    data: { type: 'team', team },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 9999 : 'auto',
    position: isDragging ? 'relative' as const : 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group relative cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 hover:border-cyan-500 hover:shadow-md transition-all touch-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{team.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {team.institution.name}
          </div>
          {team.participations.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="truncate">
                {team.participations.length} debater{team.participations.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <Badge variant="outline" className="shrink-0">
          #{team.teamNumber}
        </Badge>
      </div>
    </div>
  );
}

export function UnpairedTeamsPool({ teams, pairedTeamIds }: UnpairedTeamsPoolProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const unpairedTeams = teams.filter(team => !pairedTeamIds.has(team.id));

  const filteredTeams = unpairedTeams.filter(team => {
    const query = searchQuery.toLowerCase();
    return (
      team.name.toLowerCase().includes(query) ||
      team.institution.name.toLowerCase().includes(query) ||
      team.participations.some(p => 
        p.user.username?.toLowerCase().includes(query) ||
        p.user.email?.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Unpaired Teams</h3>
          <Badge variant="secondary">
            {unpairedTeams.length} / {teams.length}
          </Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams, institutions, or debaters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredTeams.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {unpairedTeams.length === 0 
              ? 'All teams have been paired!' 
              : 'No teams match your search.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 relative">
          {filteredTeams.map(team => (
            <DraggableTeam key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
