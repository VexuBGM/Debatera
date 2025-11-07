'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Participation {
  id: string;
  userId: string;
  role: 'DEBATER' | 'JUDGE';
  user: {
    id: string;
    username: string | null;
    email: string | null;
  };
  team: {
    id: string;
    name: string;
    institution: {
      id: string;
      name: string;
    };
  } | null;
}

interface TournamentParticipantsProps {
  participations: {
    debaters: Participation[];
    judges: Participation[];
    total: number;
  } | null;
}

export default function TournamentParticipants({ participations }: TournamentParticipantsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debaters ({participations?.debaters.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!participations || participations.debaters.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No debaters yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Institution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participations.debaters.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.user.username || p.user.email}</TableCell>
                    <TableCell>{p.team?.name || 'N/A'}</TableCell>
                    <TableCell>{p.team?.institution.name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Judges ({participations?.judges.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!participations || participations.judges.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No judges yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Institution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participations.judges.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.user.username || p.user.email}</TableCell>
                    <TableCell>{p.team?.institution.name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
