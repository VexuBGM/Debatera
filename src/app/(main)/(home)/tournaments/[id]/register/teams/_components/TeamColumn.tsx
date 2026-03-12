'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { DebaterCard } from './DebaterCard';
import type { DebaterParticipant } from '@/actions/teams.actions';

interface TeamColumnProps {
    id: string;
    title: string;
    debaters: DebaterParticipant[];
    teamMinSize: number;
    teamMaxSize: number;
    isLocked: boolean;
    onDelete?: () => void;
}

/**
 * A column in the team management board.
 * Can be the "Unassigned" pool or a specific team.
 */
export function TeamColumn({
    id,
    title,
    debaters,
    teamMinSize,
    teamMaxSize,
    isLocked,
    onDelete,
}: TeamColumnProps) {
    const isTeam = id !== 'unassigned';
    const memberCount = debaters.length;

    // Make the column a drop target
    const { setNodeRef, isOver } = useDroppable({ id });

    // Determine status badges
    const needsMore = isTeam && memberCount < teamMinSize;
    const isFull = isTeam && memberCount >= teamMaxSize;

    return (
        <Card
            ref={setNodeRef}
            className={`
        min-w-[280px] max-w-[320px] flex-shrink-0 
        bg-white/5 border-white/10
        transition-colors duration-200
        ${isOver ? 'border-brand/50 bg-brand/5' : ''}
      `}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium text-white">
                            {title}
                        </CardTitle>
                        <span className="text-xs text-white/50">({memberCount})</span>
                    </div>

                    {/* Status badges and delete button for teams */}
                    {isTeam && (
                        <div className="flex items-center gap-2">
                            {needsMore && (
                                <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-xs">
                                    Needs {teamMinSize - memberCount} more
                                </Badge>
                            )}
                            {isFull && (
                                <Badge variant="outline" className="text-green-400 border-green-400/50 text-xs">
                                    Full
                                </Badge>
                            )}
                            {onDelete && !isLocked && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                    onClick={onDelete}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <ScrollArea className="h-[300px]">
                    <SortableContext
                        items={debaters.map(d => `participant:${d.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2 pr-3">
                            {debaters.length === 0 ? (
                                <div className="py-8 text-center text-sm text-white/40">
                                    {isTeam ? 'Drop debaters here' : 'No unassigned debaters'}
                                </div>
                            ) : (
                                debaters.map(debater => (
                                    <DebaterCard
                                        key={debater.id}
                                        debater={debater}
                                        disabled={isLocked}
                                    />
                                ))
                            )}
                        </div>
                    </SortableContext>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
