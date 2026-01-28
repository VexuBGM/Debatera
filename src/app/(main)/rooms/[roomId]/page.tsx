'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Video, Trophy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface RoomInfo {
  id: string;
  streamCallId: string;
  matchId: string;
  match: {
    id: string;
    round: {
      id: string;
      number: number;
      tournament: {
        id: string;
        name: string;
      };
    };
    affRegistration: {
      id: string;
      institution: { id: string; name: string };
    };
    negRegistration: {
      id: string;
      institution: { id: string; name: string };
    } | null;
  };
  canAccess: boolean;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { } = useAuth();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const roomId = params.roomId as string;

  useEffect(() => {
    fetchRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Room not found');
          router.push('/tournaments');
          return;
        }
        throw new Error('Failed to fetch room');
      }
      const data = await response.json();
      setRoom(data);
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!room) {
    return null;
  }

  const isBye = !room.match.negRegistration;

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link href={`/tournaments/${room.match.round.tournament.id}/rounds/${room.match.round.number}`}>
          <Button variant="ghost" size="sm" className="mb-3 sm:mb-4 -ml-2 sm:-ml-3 h-8 sm:h-9 text-sm">
            <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back to Round {room.match.round.number}
          </Button>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Debate Room</h1>
            <p className="text-sm text-muted-foreground">
              {room.match.round.tournament.name} - Round {room.match.round.number}
            </p>
          </div>
        </div>
      </div>

      {/* Match Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <div className="text-center">
              <Badge className="bg-green-600 mb-2">AFF</Badge>
              <p className="font-semibold text-lg">{room.match.affRegistration.institution.name}</p>
            </div>
            <div className="text-2xl font-bold text-muted-foreground">vs</div>
            {isBye ? (
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">BYE</Badge>
                <p className="text-muted-foreground">No opponent</p>
              </div>
            ) : (
              <div className="text-center">
                <Badge className="bg-orange-600 mb-2">NEG</Badge>
                <p className="font-semibold text-lg">{room.match.negRegistration!.institution.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Join Call Button */}
      {room.canAccess && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Call
            </CardTitle>
            <CardDescription>Join the debate video call</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/debate/${room.id}`}>
              <Button className="bg-cyan-500 hover:bg-cyan-600 w-full sm:w-auto">
                <Video className="mr-2 h-4 w-4" />
                Join Video Call
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
