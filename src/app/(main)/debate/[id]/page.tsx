'use client';

import Loader from '@/components/Loader';
import MeetingRoom from '@/components/MeetingRoom';
import MeetingSetup from '@/components/MeetingSetup';
import { useGetCallByID } from '@/hooks/useGetCallByID';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Participant {
  id: string;
  userId: string;
  role: 'FIRST_SPEAKER' | 'SECOND_SPEAKER' | 'THIRD_SPEAKER' | 'REPLY_SPEAKER' | 'JUDGE';
  status: string;
  teamId: string | null;
  user: {
    id: string;
    username: string | null;
    email: string | null;
  } | null;
}

interface TeamInfo {
  id: string | null;
  name: string | null;
  institution: {
    id: string;
    name: string;
  } | null;
  participants: Participant[];
}

interface DebateInfo {
  propTeam: TeamInfo;
  oppTeam: TeamInfo;
  judges: Participant[];
}

const ROLE_LABELS: Record<string, string> = {
  FIRST_SPEAKER: 'First Speaker',
  SECOND_SPEAKER: 'Second Speaker',
  THIRD_SPEAKER: 'Third Speaker',
  REPLY_SPEAKER: 'Reply Speaker',
  JUDGE: 'Judge',
};

const Meeting = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { user, isLoaded } = useUser();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [debateInfo, setDebateInfo] = useState<DebateInfo | null>(null);
  const [loadingDebateInfo, setLoadingDebateInfo] = useState(true);
  const [userParticipant, setUserParticipant] = useState<Participant | null>(null);
  const [canJoinCall, setCanJoinCall] = useState(false);
  const [callId, setCallId] = useState<string | undefined>(undefined);
  
  const { call, isCallLoading } = useGetCallByID(callId);

  useEffect(() => {
    if (id && user) {
      fetchDebateInfo();
    }
  }, [id, user]);

  async function fetchDebateInfo() {
    if (!id) return;
    
    setLoadingDebateInfo(true);
    try {
      const response = await fetch(`/api/debates/${id}/participants`);
      if (response.ok) {
        const data = await response.json();
        setDebateInfo(data);
        
        // Set the callId from the response
        if (data.callId) {
          setCallId(data.callId);
        }

        // Check if current user is a participant
        const allParticipants = [
          ...data.propTeam.participants,
          ...data.oppTeam.participants,
          ...data.judges,
        ];

        const currentUserParticipant = allParticipants.find(
          (p: Participant) => p.userId === user?.id
        );

        setUserParticipant(currentUserParticipant || null);
        setCanJoinCall(!!currentUserParticipant);
      }
    } catch (error) {
      console.error('Error fetching debate info:', error);
    } finally {
      setLoadingDebateInfo(false);
    }
  }

  if (!isLoaded || isCallLoading || loadingDebateInfo) return <Loader />;

  // User is not a participant - show access denied
  if (!canJoinCall) {
    return (
      <main className="min-h-screen w-full flex-center px-4 bg-linear-to-b from-dark-2 to-dark-1">
        <div className="max-w-2xl w-full rounded-xl border bg-card/60 backdrop-blur p-8 text-center shadow-lg">
          <AlertCircle className="h-16 w-16 mx-auto text-orange-500 mb-4" />
          <h1 className="text-2xl font-bold mb-3">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            You are not authorized to join this debate room. Only assigned speakers (max 3 per team) and judges can participate in the video call.
          </p>

          {debateInfo && (
            <div className="bg-muted/50 rounded-lg p-6 text-left">
              <h3 className="font-semibold mb-4 text-center">Current Participants</h3>
              
              <div className="space-y-4">
                {/* Prop Team */}
                {debateInfo.propTeam.participants.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">PROP</Badge>
                      <span className="text-sm font-medium">{debateInfo.propTeam.name}</span>
                    </div>
                    <div className="space-y-1 ml-4">
                      {debateInfo.propTeam.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user?.username || p.user?.email}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {ROLE_LABELS[p.role] || p.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opp Team */}
                {debateInfo.oppTeam.participants.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-orange-500">OPP</Badge>
                      <span className="text-sm font-medium">{debateInfo.oppTeam.name}</span>
                    </div>
                    <div className="space-y-1 ml-4">
                      {debateInfo.oppTeam.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user?.username || p.user?.email}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {ROLE_LABELS[p.role] || p.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Judges */}
                {debateInfo.judges.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-500">JUDGES</Badge>
                    </div>
                    <div className="space-y-1 ml-4">
                      {debateInfo.judges.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user?.username || p.user?.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-6">
            If you believe this is an error, please contact the tournament administrator.
          </p>
        </div>
      </main>
    );
  }
  
  if (!call) return (
    <main className="min-h-screen w-full flex-center px-4">
      <div className="max-w-md w-full rounded-xl border bg-card/60 backdrop-blur p-6 text-center shadow">
        <h1 className="text-xl font-semibold">Meeting not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn&apos;t locate this meeting. It may have ended or the link is incorrect.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen w-full bg-linear-to-b from-dark-2 to-dark-1">
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <MeetingSetup 
              setIsSetupComplete={setIsSetupComplete}
              userRole={userParticipant ? ROLE_LABELS[userParticipant.role] : undefined}
              streamRole={
                userParticipant?.role === 'JUDGE' 
                  ? 'judge' 
                  : userParticipant?.role 
                  ? 'debater' 
                  : 'spectator'
              }
            />
          ) : (
            <MeetingRoom debateInfo={debateInfo} userParticipant={userParticipant} />
          )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
};

export default Meeting;