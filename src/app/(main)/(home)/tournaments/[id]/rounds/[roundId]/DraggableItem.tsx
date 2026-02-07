'use client';

/**
 * Draggable Item Component
 *
 * A wrapper that makes an item draggable using dnd-kit.
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

interface DraggableItemProps {
  id: string;
  type: 'team' | 'judge';
  data?: Record<string, unknown>;
  children: ReactNode;
  disabled?: boolean;
}

export function DraggableItem({
  id,
  type,
  data = {},
  children,
  disabled = false,
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { type, ...data },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
