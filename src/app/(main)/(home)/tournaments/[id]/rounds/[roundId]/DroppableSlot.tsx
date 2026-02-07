'use client';

/**
 * Droppable Slot Component
 *
 * A slot in a debate card that accepts teams or judges.
 */

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DroppableSlotProps {
  id: string;
  type: 'team' | 'judge';
  debateId: string;
  slot: 'prop' | 'opp' | 'judges';
  children: ReactNode;
  className?: string;
  isEmpty?: boolean;
}

export function DroppableSlot({
  id,
  type,
  debateId,
  slot,
  children,
  className,
  isEmpty = false,
}: DroppableSlotProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: { accepts: type, debateId, slot },
  });

  // Only highlight if dragging the correct type
  const isValidDrop = active?.data.current?.type === type;
  const shouldHighlight = isOver && isValidDrop;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-10 rounded-md transition-all',
        isEmpty && 'border-2 border-dashed border-muted-foreground/30',
        shouldHighlight && 'bg-primary/10 border-primary border-solid',
        className
      )}
    >
      {children}
    </div>
  );
}
