/**
 * Standings Table View (Client Component)
 *
 * Renders the standings rows in a shadcn/ui table.
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { StandingsRow } from '@/lib/domains/reporting';

interface StandingsTableViewProps {
  rows: StandingsRow[];
}

export function StandingsTableView({ rows }: StandingsTableViewProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead className="text-center w-20">Wins</TableHead>
            <TableHead className="text-center w-20">Losses</TableHead>
            <TableHead className="text-right w-24">Points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.teamId}>
              <TableCell className="text-center font-medium">{row.rank}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.teamName}</span>
                  {row.notes.length > 0 && (
                    <div className="flex gap-1">
                      {row.notes.map((note) => (
                        <Badge key={note} variant="secondary" className="text-xs">
                          {note}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.institutionName}</TableCell>
              <TableCell className="text-center">{row.wins}</TableCell>
              <TableCell className="text-center">{row.losses}</TableCell>
              <TableCell className="text-right tabular-nums">{row.totalPoints.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
