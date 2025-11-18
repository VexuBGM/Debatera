'use client';

import Loader from '@/components/Loader';
import MeetingRoom from '@/components/MeetingRoom';
import MeetingSetup from '@/components/MeetingSetup';
import { RoleSelectionDialog } from '@/components/tournaments/rounds/RoleSelectionDialog';
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

// Helper to get user's roles
function getUserRoles(participants: Participant[], userId: string): string[] {
  return participants
    .filter(p => p.userId === userId)
    .map(p => p.role);
}

// Helper to group participants by user (to avoid showing users twice if they have multiple roles)
function groupParticipantsByUser(participants: Participant[]): Array<{
  userId: string;
  user: Participant['user'];
  roles: string[];
  teamId: string | null;
}> {
  const userMap = new Map<string, {
    userId: string;
    user: Participant['user'];
    roles: string[];
    teamId: string | null;
  }>();

  for (const p of participants) {
    if (!userMap.has(p.userId)) {
      userMap.set(p.userId, {
        userId: p.userId,
        user: p.user,
        roles: [p.role],
        teamId: p.teamId,
      });
    } else {
      userMap.get(p.userId)!.roles.push(p.role);
    }
  }

  return Array.from(userMap.values());
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
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string>('');
  const [isJudge, setIsJudge] = useState(false);
  
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

        // Get the first participant record (for backward compatibility with UI)
        // Note: User might have multiple roles (e.g., FIRST_SPEAKER + REPLY_SPEAKER)
        const currentUserParticipant = allParticipants.find(
          (p: Participant) => p.userId === user?.id
        );

        setUserParticipant(currentUserParticipant || null);
        // Check eligibility from the response - the API will tell us
        setCanJoinCall(data.canJoin !== false); // default to true if not specified
        
        // Get team and judge info from API response
        setIsJudge(data.isJudge || false);
        
        if (data.userTeamId) {
          setUserTeamId(data.userTeamId);
        }
        
        // For debaters, show role selection if they don't have a participant record yet OR if entering the page
        if (data.userTeamId && !data.isJudge && data.canJoin) {
          // Only show dialog if user doesn't have an active participant record
          if (!currentUserParticipant) {
            setShowRoleSelection(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching debate info:', error);
    } finally {
      setLoadingDebateInfo(false);
    }
  }

  const handleRoleSelected = (roles: string[], callId: string) => {
    setCallId(callId);
    setShowRoleSelection(false);
    // Refresh debate info to get updated participant list
    fetchDebateInfo();
  };

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
                      {groupParticipantsByUser(debateInfo.propTeam.participants).map((p) => (
                        <div key={p.userId} className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user?.username || p.user?.email}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {p.roles.map(r => ROLE_LABELS[r] || r).join(' + ')}
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
                      {groupParticipantsByUser(debateInfo.oppTeam.participants).map((p) => (
                        <div key={p.userId} className="flex items-center gap-2 text-sm">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{p.user?.username || p.user?.email}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {p.roles.map(r => ROLE_LABELS[r] || r).join(' + ')}
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
                      {groupParticipantsByUser(debateInfo.judges).map((p) => (
                        <div key={p.userId} className="flex items-center gap-2 text-sm">
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
    <>
      <main className="min-h-screen w-full bg-linear-to-b from-dark-2 to-dark-1">
        <StreamCall call={call}>
          <StreamTheme>
            {!isSetupComplete ? (
              <MeetingSetup 
                setIsSetupComplete={setIsSetupComplete}
                userRole={userParticipant && debateInfo ? (() => {
                  // Get all roles for this user
                  const allParticipants = [
                    ...debateInfo.propTeam.participants,
                    ...debateInfo.oppTeam.participants,
                    ...debateInfo.judges,
                  ];
                  const userRoles = getUserRoles(allParticipants, user?.id || '');
                  return userRoles.map(r => ROLE_LABELS[r] || r).join(' + ');
                })() : undefined}
                streamRole={
                  userParticipant?.role === 'JUDGE' 
                    ? 'judge' 
                    : userParticipant?.role 
                    ? 'debater' 
                    : 'spectator'
                }
              />
            ) : (
              <MeetingRoom debateInfo={debateInfo} userParticipant={userParticipant} pairingId={id} />
            )}
          </StreamTheme>
        </StreamCall>
      </main>
      
      {/* Role Selection Dialog for Debaters */}
      {showRoleSelection && !isJudge && userTeamId && id && (
        <RoleSelectionDialog
          open={showRoleSelection}
          onClose={() => setShowRoleSelection(false)}
          pairingId={id}
          userTeamId={userTeamId}
          onRoleSelected={handleRoleSelected}
        />
      )}
    </>
  );
};

export default Meeting;