'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check, Edit, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';

type RoundStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_BADGE_VARIANT: Record<RoundStatus, 'draft' | 'published' | 'in-progress' | 'completed'> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
};

const STATUS_LABEL: Record<RoundStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const ALL_ROUND_STATUSES: RoundStatus[] = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED'];

interface RoundCardProps {
  round: {
    id: string;
    number: number;
    name: string;
    status: RoundStatus;
  };
  tournamentId: string;
  isAdmin?: boolean;
  updatingStatus?: boolean;
  onStatusChange?: (roundId: string, status: RoundStatus) => void;
  onRename?: (round: { id: string; name: string }) => void;
  onDelete?: (round: { id: string; name: string }) => void;
}

export function RoundCard({
  round,
  tournamentId,
  isAdmin,
  updatingStatus,
  onStatusChange,
  onRename,
  onDelete,
}: RoundCardProps) {
  if (!isAdmin) {
    return (
      <Link href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{round.name}</p>
              <p className="text-sm text-muted-foreground">Round {round.number}</p>
            </div>
            <Badge variant={STATUS_BADGE_VARIANT[round.status]}>
              {STATUS_LABEL[round.status]}
            </Badge>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Card className="hover:bg-accent/50 transition-colors">
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {round.number}
          </div>
          <div>
            <p className="font-medium">{round.name}</p>
            <p className="text-sm text-muted-foreground">
              {round.status === 'DRAFT' ? 'Not published' : 'Published'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                disabled={updatingStatus}
              >
                <Badge variant={STATUS_BADGE_VARIANT[round.status]}>
                  {STATUS_LABEL[round.status]}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ALL_ROUND_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  disabled={status === round.status || updatingStatus}
                  onClick={() => onStatusChange?.(round.id, status)}
                >
                  <Badge variant={STATUS_BADGE_VARIANT[status]} className="mr-2">
                    {STATUS_LABEL[status]}
                  </Badge>
                  {status === round.status && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href={`/tournaments/${tournamentId}/rounds/${round.id}`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              {round.status === 'DRAFT' ? 'Edit' : 'View'}
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename?.({ id: round.id, name: round.name })}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={round.status !== 'DRAFT'}
                onClick={() => onDelete?.({ id: round.id, name: round.name })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
