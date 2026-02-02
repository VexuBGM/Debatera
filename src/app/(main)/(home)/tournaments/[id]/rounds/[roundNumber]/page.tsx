'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Video, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Match {
  id: string;
  affRegistration: {
    id: string;
    institution: { id: string; name: string };
  };
  negRegistration: {
    id: string;
    institution: { id: string; name: string };
  } | null;
  room: {
    id: string;
    streamCallId: string;
  } | null;
}

interface Round {
  id: string;
  number: number;
  createdAt: string;
  tournament: {
    id: string;
    name: string;
  };
  matches: Match[];
}

export default function RoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [round, setRound] = useState<Round | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tournamentId = params.id as string;
  const roundNumber = params.roundNumber as string;

  useEffect(() => {
    fetchRound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, roundNumber]);

  const fetchRound = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundNumber}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Round not found');
          router.push(`/tournaments/${tournamentId}`);
          return;
        }
        throw new Error('Failed to fetch round');
      }
      const data = await response.json();
      setRound(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-full max-w-md mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!round) {
    return null;
  }

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link href={`/tournaments/${tournamentId}`}>
          <Button variant="ghost" size="sm" className="mb-3 sm:mb-4 -ml-2 sm:-ml-3 h-8 sm:h-9 text-sm">
            <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back to Tournament
          </Button>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Round {round.number}</h1>
            <p className="text-sm text-muted-foreground">{round.tournament.name}</p>
          </div>
        </div>
      </div>

      {/* Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Matches
          </CardTitle>
          <CardDescription>
            {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''} in this round
          </CardDescription>
        </CardHeader>
        <CardContent>
          {round.matches.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No matches in this round.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Affirmative (AFF)</TableHead>
                    <TableHead className="text-xs sm:text-sm text-center">vs</TableHead>
                    <TableHead className="text-xs sm:text-sm">Negative (NEG)</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Room</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {round.matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-xs">AFF</Badge>
                          <span className="font-medium text-sm">
                            {match.affRegistration.institution.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        vs
                      </TableCell>
                      <TableCell>
                        {match.negRegistration ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-600 text-xs">NEG</Badge>
                            <span className="font-medium text-sm">
                              {match.negRegistration.institution.name}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">BYE</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {match.room ? (
                          <Link href={`/rooms/${match.room.id}`}>
                            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                              <Video className="mr-1.5 h-3.5 w-3.5" />
                              Open Room
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">No room</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
