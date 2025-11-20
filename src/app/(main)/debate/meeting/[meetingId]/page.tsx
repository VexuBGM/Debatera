'use client';

import Loader from '@/components/Loader';
import MeetingRoom from '@/components/MeetingRoom';
import StandaloneMeetingSetup from '@/components/StandaloneMeetingSetup';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStreamVideoClient } from '@stream-io/video-react-sdk';

interface Participant {
  inviteId: string;
  role: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;
}

interface MeetingInfo {
  id: string;
  title: string;
  description: string | null;
  callId: string;
  scheduledAt: string | null;
  status: string;
  isCreator: boolean;
  userRole: string;
}

const MeetingPage = () => {
  const params = useParams<{ meetingId: string }>();
  const router = useRouter();
  const meetingId = params?.meetingId;

  const { user, isLoaded } = useUser();
  const client = useStreamVideoClient();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingMeetingInfo, setLoadingMeetingInfo] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [call, setCall] = useState<any>(null);

  // Fetch meeting info and check access
  useEffect(() => {
    if (!meetingId || !isLoaded || !user) return;

    const fetchMeetingInfo = async () => {
      try {
        setLoadingMeetingInfo(true);
        const response = await fetch(`/api/meetings/${meetingId}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('Failed to fetch meeting info:', data.error);
          setHasAccess(false);
          return;
        }

        setMeetingInfo(data.meeting);
        setParticipants(data.participants || []);
        setHasAccess(true);
      } catch (error) {
        console.error('Error fetching meeting info:', error);
        setHasAccess(false);
      } finally {
        setLoadingMeetingInfo(false);
      }
    };

    fetchMeetingInfo();
  }, [meetingId, user, isLoaded]);

  // Initialize Stream call (but don't join yet - let setup handle that)
  useEffect(() => {
    if (!client || !meetingInfo?.callId || call) return;

    const initCall = async () => {
      try {
        const streamCall = client.call('default', meetingInfo.callId);
        await streamCall.getOrCreate({ data: { starts_at: new Date().toISOString() } });
        setCall(streamCall);
      } catch (error) {
        console.error('Error initializing call:', error);
      }
    };

    initCall();
  }, [client, meetingInfo?.callId, call]);

  if (!isLoaded || loadingMeetingInfo) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-1">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Authentication Required</h2>
          <p className="mt-2 text-white/70">Please sign in to join this meeting</p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccess || !meetingInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-1">
        <div className="text-center max-w-md px-4">
          <Shield className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-2xl font-bold text-white">Access Denied</h2>
          <p className="mt-2 text-white/70">
            You don't have permission to join this meeting. You need to accept an invitation first.
          </p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!call) {
    return <Loader />;
  }

  return (
    <main className="min-h-screen bg-dark-1">
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <div className="space-y-6">
              {/* Meeting Info Header */}
              <div className="bg-dark-2 border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-white">{meetingInfo.title}</h1>
                      {meetingInfo.description && (
                        <p className="mt-1 text-white/70">{meetingInfo.description}</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                          {meetingInfo.userRole === 'CREATOR' ? 'Host' : meetingInfo.userRole}
                        </Badge>
                        <Badge variant="secondary">
                          <Users className="mr-1 h-3 w-3" />
                          {participants.length} participant{participants.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Participants List */}
                  {participants.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-white/80 mb-2">Invited Participants:</h3>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((participant) => (
                          <div
                            key={participant.inviteId}
                            className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5"
                          >
                            <span className="text-sm text-white">
                              {participant.user?.username || participant.user?.email || 'Unknown'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {participant.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <StandaloneMeetingSetup 
                setIsSetupComplete={setIsSetupComplete}
                meetingTitle={meetingInfo.title}
                userInvitedRole={meetingInfo.userRole}
              />
            </div>
          ) : (
            <MeetingRoom />
          )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
};

export default MeetingPage;
