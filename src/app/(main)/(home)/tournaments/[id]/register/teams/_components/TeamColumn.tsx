'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Trash2, UserPlus } from 'lucide-react';
import type { DebaterParticipant } from '@/actions/teams.actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DebaterCard } from './DebaterCard';

interface TeamColumnProps {
    id: string;
    title: string;
    debaters: DebaterParticipant[];
    teamMinSize: number;
    teamMaxSize: number;
    isLocked: boolean;
    onDelete?: () => void;
    onAddDebaters?: () => void;
    onAssignExisting?: () => void;
}

export function TeamColumn({
    id,
    title,
    debaters,
    teamMinSize,
    teamMaxSize,
    isLocked,
    onDelete,
    onAddDebaters,
    onAssignExisting,
}: TeamColumnProps) {
    const isTeam = id !== 'unassigned';
    const memberCount = debaters.length;
    const { setNodeRef, isOver } = useDroppable({ id });

    const needsMore = isTeam && memberCount < teamMinSize;
    const isFull = isTeam && memberCount >= teamMaxSize;

    return (
        <Card
            ref={setNodeRef}
            className={[
                'min-w-[320px] max-w-[340px] flex-shrink-0 border-white/10 bg-white/5 transition-colors duration-200',
                isOver ? 'border-brand/50 bg-brand/10' : '',
            ].join(' ')}
        >
            <CardHeader className="border-b border-white/10 pb-4">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium text-white">{title}</CardTitle>
                                <span className="text-xs text-white/45">({memberCount})</span>
                            </div>
                            <p className="text-xs text-white/40">
                                {isTeam ? 'Add debaters directly here or move existing ones in.' : 'Debaters removed from teams appear here.'}
                            </p>
                        </div>

                        {isTeam && (
                            <div className="flex items-center gap-2">
                                {needsMore && (
                                    <Badge variant="outline" className="border-amber-300/30 text-amber-200">
                                        Need {teamMinSize - memberCount}
                                    </Badge>
                                )}
                                {isFull && (
                                    <Badge variant="outline" className="border-emerald-300/30 text-emerald-200">
                                        Full
                                    </Badge>
                                )}
                                {onDelete && !isLocked && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-300 hover:bg-red-400/10 hover:text-red-200"
                                        onClick={onDelete}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {isTeam && !isLocked && (
                        <div className="flex flex-wrap gap-2">
                            {onAddDebaters && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-white/15 bg-white/10 text-white hover:bg-white/15"
                                    onClick={onAddDebaters}
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Add Debaters
                                </Button>
                            )}
                            {onAssignExisting && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white/80 hover:bg-white/10 hover:text-white"
                                    onClick={onAssignExisting}
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Assign Existing
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <ScrollArea className="h-[420px] pr-1">
                    <SortableContext
                        items={debaters.map((debater) => `participant:${debater.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3 pr-3">
                            {debaters.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center text-sm text-white/40">
                                    {isTeam ? 'Drop debaters here or use the actions above.' : 'No unassigned debaters right now.'}
                                </div>
                            ) : (
                                debaters.map((debater) => (
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
