'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GripVertical } from 'lucide-react';
import type { DebaterParticipant } from '@/actions/teams.actions';
import { displayNameFromDbUser, initialsFromDbUser } from '@/lib/users/displayName';

interface DebaterCardProps {
    debater: DebaterParticipant;
    disabled?: boolean;
    isDragging?: boolean;
}

/**
 * A draggable card representing a debater.
 * Shows avatar, name, and a drag handle.
 */
export function DebaterCard({ debater, disabled = false, isDragging = false }: DebaterCardProps) {
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

    const isCurrentlyDragging = isDragging || isSortableDragging;

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`
        flex items-center gap-3 p-2.5 
        bg-white/5 border-white/10 hover:bg-white/10
        transition-all duration-150
        ${isCurrentlyDragging ? 'opacity-90 shadow-lg scale-105 rotate-2 z-50' : ''}
        ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
      `}
            {...attributes}
            {...listeners}
        >
            {/* Drag handle */}
            {!disabled && (
                <GripVertical className="h-4 w-4 text-white/30 flex-shrink-0" />
            )}

            {/* Avatar */}
            <Avatar className="h-8 w-8">
                <AvatarImage src={debater.user.imageUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-brand/20 text-brand text-xs">
                    {initials}
                </AvatarFallback>
            </Avatar>

            {/* Name */}
            <span className="text-sm text-white truncate flex-1">
                {displayName}
            </span>
        </Card>
    );
}
