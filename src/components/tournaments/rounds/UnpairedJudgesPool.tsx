'use client'

import React, { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Gavel, Search } from 'lucide-react'

interface Judge {
  id: string; // participation ID
  user: {
    id: string;
    username: string | null;
    email: string | null;
  };
  institution: {
    id: string;
    name: string;
  } | null;
}

interface UnpairedJudgesPoolProps {
  judges: Judge[];
  assignedJudgeIds: Set<string>;
}

function DraggableJudge({ judge }: { judge: Judge }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `judge-${judge.id}`,
    data: { type: 'judge', judge },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-purple-500 transition-colors touch-none"
      style={{
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 9999 : 'auto',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate flex items-center gap-1">
            <Gavel className="h-3 w-3 text-purple-500" />
            {judge.user.username || judge.user.email}
          </div>
          {judge.institution && (
            <div className="text-xs text-muted-foreground truncate">
              {judge.institution.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UnpairedJudgesPool({ judges, assignedJudgeIds }: UnpairedJudgesPoolProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter unassigned judges
  const unassignedJudges = useMemo(() => {
    return judges.filter(judge => !assignedJudgeIds.has(judge.id));
  }, [judges, assignedJudgeIds]);

  // Apply search filter
  const filteredJudges = useMemo(() => {
    if (!searchTerm.trim()) return unassignedJudges;

    const term = searchTerm.toLowerCase();
    return unassignedJudges.filter(judge => {
      const name = (judge.user.username || judge.user.email || '').toLowerCase();
      const institution = (judge.institution?.name || '').toLowerCase();
      return name.includes(term) || institution.includes(term);
    });
  }, [unassignedJudges, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-purple-500" />
              Judge Pool
              <Badge variant="secondary">{unassignedJudges.length}</Badge>
            </CardTitle>
            <CardDescription>
              Drag judges to assign them to rooms
            </CardDescription>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search judges..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredJudges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {unassignedJudges.length === 0 ? (
              <p>All judges assigned</p>
            ) : (
              <p>No judges match your search</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredJudges.map((judge) => (
              <DraggableJudge key={judge.id} judge={judge} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
