'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { DebaterParticipant } from '@/actions/teams.actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { displayNameFromDbUser, initialsFromDbUser } from '@/lib/users/displayName';

interface DebaterCardProps {
    debater: DebaterParticipant;
    disabled?: boolean;
    isDragging?: boolean;
}

export function DebaterCard({
    debater,
    disabled = false,
    isDragging = false,
}: DebaterCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({
        id: `participant:${debater.id}`,
        disabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const displayName = displayNameFromDbUser(debater.user);
    const initials = initialsFromDbUser(debater.user);
    const isGuest = debater.user.id.startsWith('guest_');
    const isCurrentlyDragging = isDragging || isSortableDragging;

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={[
                'border-white/10 bg-white/5 p-2.5 transition-all duration-150',
                isCurrentlyDragging ? 'scale-[1.02] rotate-1 opacity-90 shadow-lg' : 'hover:bg-white/10',
            ].join(' ')}
        >
            <div className="flex items-start gap-2.5">
                {!disabled && (
                    <button
                        type="button"
                        className="mt-0.5 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white/80"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}

                <Avatar className="h-8 w-8">
                    <AvatarImage src={debater.user.imageUrl ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-brand/20 text-brand text-xs">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">{displayName}</span>
                        {isGuest && (
                            <Badge variant="outline" className="border-brand/30 text-[10px] uppercase tracking-[0.18em] text-brand">
                                Guest
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
