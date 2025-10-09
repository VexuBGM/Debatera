'use client';

import Loader from '@/components/Loader';
import MeetingRoom from '@/components/MeetingRoom';
import MeetingSetup from '@/components/MeetingSetup';
import { useGetCallByID } from '@/hooks/useGetCallByID';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';

const Meeting = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { isLoaded } = useUser();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { call, isCallLoading } = useGetCallByID(id);

  if (!isLoaded || isCallLoading) return <Loader />;
  if (!call) return (
    <main className="min-h-screen w-full flex-center px-4">
      <div className="max-w-md w-full rounded-xl border bg-card/60 backdrop-blur p-6 text-center shadow">
        <h1 className="text-xl font-semibold">Meeting not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't locate this meeting. It may have ended or the link is incorrect.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-dark-2 to-dark-1">
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
          ) : (
            <MeetingRoom />
          )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
};

export default Meeting;