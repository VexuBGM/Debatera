'use client';

import Loader from '@/components/Loader';
import MeetingRoom from '@/components/MeetingRoom';
import MeetingSetup from '@/components/MeetingSetup';
import { useGetCallByID } from '@/hooks/useGetCallByID';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RoomInfo {
  id: string;
  streamCallId: string;
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
      institution: { name: string };
    };
    negRegistration: {
      institution: { name: string };
    } | null;
  };
  canAccess: boolean;
}

export default function DebatePage() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id;

  const { user, isLoaded } = useUser();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { call, isCallLoading } = useGetCallByID(roomInfo?.streamCallId);

  useEffect(() => {
    if (roomId && user) {
      fetchRoomInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  async function fetchRoomInfo() {
    if (!roomId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setRoomInfo(data);
      } else if (response.status === 404) {
        setError('Room not found');
      } else if (response.status === 403) {
        setError('You do not have access to this room');
      } else {
        setError('Failed to load room');
      }
    } catch (err) {
      console.error('Error fetching room info:', err);
      setError('Failed to load room');
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || loading) return <Loader />;

  if (error || !roomInfo) {
    return (
      <main className="min-h-screen w-full flex-center px-3 sm:px-4 py-4 bg-linear-to-b from-dark-2 to-dark-1">
        <div className="max-w-2xl w-full rounded-lg sm:rounded-xl border bg-card/60 backdrop-blur p-4 sm:p-6 lg:p-8 text-center shadow-lg">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-orange-500 mb-3 sm:mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">
            {error === 'Room not found' ? 'Room Not Found' : 'Access Denied'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            {error || 'Unable to load room information.'}
          </p>
          <Link href="/tournaments">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournaments
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!roomInfo.canAccess) {
    return (
      <main className="min-h-screen w-full flex-center px-3 sm:px-4 py-4 bg-linear-to-b from-dark-2 to-dark-1">
        <div className="max-w-2xl w-full rounded-lg sm:rounded-xl border bg-card/60 backdrop-blur p-4 sm:p-6 lg:p-8 text-center shadow-lg">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-orange-500 mb-3 sm:mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Access Restricted</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            You are not authorized to join this debate room. Only participants from registered institutions can join.
          </p>
          <Link href={`/tournaments/${roomInfo.match.round.tournament.id}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournament
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (isCallLoading) return <Loader />;
  
  if (!call) {
    return (
      <main className="min-h-screen w-full flex-center px-3 sm:px-4">
        <div className="max-w-md w-full rounded-lg sm:rounded-xl border bg-card/60 backdrop-blur p-4 sm:p-6 text-center shadow">
          <h1 className="text-lg sm:text-xl font-semibold">Meeting not found</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            The video call could not be found. It may not have been created yet.
          </p>
          <Button className="mt-4" onClick={() => fetchRoomInfo()}>
            Retry
          </Button>
        </div>
      </main>
    );
  }

  const matchLabel = roomInfo.match.negRegistration 
    ? `${roomInfo.match.affRegistration.institution.name} vs ${roomInfo.match.negRegistration.institution.name}`
    : `${roomInfo.match.affRegistration.institution.name} (BYE)`;

  return (
    <main className="min-h-screen w-full bg-linear-to-b from-dark-2 to-dark-1">
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <MeetingSetup 
              setIsSetupComplete={setIsSetupComplete}
              userRole={matchLabel}
              streamRole="debater"
            />
          ) : (
            <MeetingRoom
              debateInfo={null}
              userParticipant={null}
              pairingId={roomId}
              isJudge={false}
            />
          )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
}
