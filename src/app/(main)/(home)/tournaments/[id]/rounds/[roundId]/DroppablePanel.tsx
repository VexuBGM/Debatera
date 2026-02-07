'use client';

/**
 * Droppable Panel Component
 *
 * A container that accepts draggable items.
 */

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DroppablePanelProps {
  id: string;
  type: 'team' | 'judge';
  children: ReactNode;
  className?: string;
}

export function DroppablePanel({ id, type, children, className }: DroppablePanelProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: { accepts: type },
  });

  // Only highlight if dragging the correct type
  const isValidDrop = active?.data.current?.type === type;
  const shouldHighlight = isOver && isValidDrop;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-25 transition-colors rounded-md',
        shouldHighlight && 'bg-primary/10 ring-2 ring-primary ring-inset',
        className
      )}
    >
      {children}
    </div>
  );
}
