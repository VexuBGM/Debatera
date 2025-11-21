"use client"

import React, { useEffect, useMemo } from "react"
import {
  CallingState,
  ParticipantView,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import Loader from "@/components/Loader"
import CustomCallControls from "./CustomCallControls"
import { Badge } from "./ui/badge"

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
  FIRST_SPEAKER: '1st Speaker',
  SECOND_SPEAKER: '2nd Speaker',
  THIRD_SPEAKER: '3rd Speaker',
  REPLY_SPEAKER: 'Reply',
  JUDGE: 'Judge',
};

type Team = "prop" | "opp" | "judge" | "spectator" | "unknown"

const norm = (v?: string) => (typeof v === "string" ? v.trim().toLowerCase() : "")

const getTeam = (p: any): Team => {
  const roles: string[] = Array.isArray(p?.roles) ? p.roles.map((r: string) => r.toLowerCase()) : []
  const userRole = norm(p?.user?.role)
  const customTeam = norm(p?.user?.custom?.team)

  if (roles.includes("judge") || userRole === "judge") return "judge"
  if (roles.includes("spectator") || userRole === "spectator") return "spectator"
  if (customTeam === "prop" || customTeam === "proposition" || userRole === "prop" || userRole === "proposition")
    return "prop"
  if (customTeam === "opp" || customTeam === "opposition" || userRole === "opp" || userRole === "opposition")
    return "opp"
  return "unknown"
}

const isJudge = (p: any) => getTeam(p) === "judge"
const isSpectator = (p: any) => getTeam(p) === "spectator"
const isDebater = (p: any) => !isJudge(p) && !isSpectator(p)

const MeetingRoom = ({ 
  hideControls = false,
  debateInfo,
  userParticipant,
  pairingId,
  isStandaloneMeeting = false
}: { 
  hideControls?: boolean;
  debateInfo?: DebateInfo | null;
  userParticipant?: Participant | null;
  pairingId?: string;
  isStandaloneMeeting?: boolean;
}) => {
  const { useParticipants, useDominantSpeaker, useCallCallingState } = useCallStateHooks()
  const participants = useParticipants()
  const dominant = useDominantSpeaker()
  const callingState = useCallCallingState()
  const call = useCall()
  const router = useRouter()

  // Handle updating participant status when user leaves
  useEffect(() => {
    if (!call) return
    if (callingState === CallingState.LEFT) {
      // Update participant status in database before redirecting
      if (pairingId) {
        fetch(`/api/debates/${pairingId}/leave`, {
          method: 'POST',
        }).catch(error => {
          console.error('Error updating participant status on leave:', error);
        });
      }
      router.push("/")
    }
  }, [callingState, call, router, pairingId])

  const { propSlots, oppSlots, judges, anyDebater } = useMemo(() => {
    const visible = participants.filter((p) => !isSpectator(p))
    const judgeList = visible.filter((p) => isJudge(p))
    const debaters = visible.filter((p) => isDebater(p))

    const SIDE_SLOTS = 3
    let propArr: any[] = []
    let oppArr: any[] = []

    // If we have debate info from the database, use it to properly arrange speakers
    if (debateInfo) {
      // Map Stream participants to database participants
      const createSortedSlots = (teamParticipants: Participant[]) => {
        // Define the order of roles
        const roleOrder = {
          'FIRST_SPEAKER': 0,
          'SECOND_SPEAKER': 1,
          'THIRD_SPEAKER': 2,
          'REPLY_SPEAKER': 3, // In case we want to show reply speakers
        };

        // Sort by role order
        const sortedParticipants = [...teamParticipants].sort((a, b) => {
          const orderA = roleOrder[a.role as keyof typeof roleOrder] ?? 999;
          const orderB = roleOrder[b.role as keyof typeof roleOrder] ?? 999;
          return orderA - orderB;
        });

        // Match Stream participants with database participants by userId
        const slots: any[] = [];
        for (const dbParticipant of sortedParticipants) {
          // Skip judges and reply speakers for now
          if (dbParticipant.role === 'JUDGE' || dbParticipant.role === 'REPLY_SPEAKER') continue;
          
          // Find matching Stream participant by user ID
          const streamParticipant = debaters.find((sp) => {
            // Stream uses userId in the user object
            return sp.userId === dbParticipant.userId;
          });

          if (streamParticipant) {
            slots.push(streamParticipant);
          }
        }

        return slots;
      };

      propArr = createSortedSlots(debateInfo.propTeam.participants);
      oppArr = createSortedSlots(debateInfo.oppTeam.participants);
    } else {
      // Fallback to the old logic if no debate info
      const propExplicit = debaters.filter((p) => getTeam(p) === "prop")
      const oppExplicit = debaters.filter((p) => getTeam(p) === "opp")
      const unknowns = debaters.filter((p) => getTeam(p) === "unknown")

      propArr = [...propExplicit]
      oppArr = [...oppExplicit]
      unknowns.forEach((p, i) => {
        if (propArr.length <= oppArr.length) propArr.push(p)
        else oppArr.push(p)
      })
    }

    const propSlots = Array.from({ length: SIDE_SLOTS }, (_, i) => propArr[i])
    const oppSlots = Array.from({ length: SIDE_SLOTS }, (_, i) => oppArr[i])

    return { propSlots, oppSlots, judges: judgeList, anyDebater: [...propArr, ...oppArr][0] }
  }, [participants, debateInfo])

  const centerParticipant = useMemo(() => {
    if (dominant && (isDebater(dominant) || isJudge(dominant))) return dominant
    return anyDebater
  }, [dominant, anyDebater])

  if (callingState === CallingState.JOINING) return <Loader />

  return (
    <section className="h-screen w-full flex flex-col bg-[#0a1a2b] text-white p-2 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-[#0d2036] border border-blue-900 rounded-lg px-6 py-1 mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-sm">Debate Room</p>
            {userParticipant && debateInfo && (
              <p className="text-xs text-cyan-400">
                Your Role: {(() => {
                  // Get all roles for current user
                  const allParticipants = [
                    ...debateInfo.propTeam.participants,
                    ...debateInfo.oppTeam.participants,
                    ...debateInfo.judges,
                  ];
                  const userRoles = allParticipants
                    .filter(p => p.userId === userParticipant.userId)
                    .map(p => ROLE_LABELS[p.role] || p.role);
                  return userRoles.join(' + ');
                })()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">{!hideControls && <CustomCallControls 
          showRoleChange={isStandaloneMeeting}
          onLeave={async () => {
            // Update participant status before leaving
            if (pairingId) {
              try {
                await fetch(`/api/debates/${pairingId}/leave`, {
                  method: 'POST',
                });
              } catch (error) {
                console.error('Error updating participant status on leave:', error);
              }
            }
          }} 
        />}</div>
        <div className="text-center bg-blue-900/40 px-3 py-2 rounded-lg">
          <p className="text-xs text-muted-foreground">Participants</p>
          <p className="text-xl font-mono font-bold">{participants.length}</p>
        </div>
      </div>

      {/* Main Debate Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left (Proposition) */}
        <div className="flex flex-col flex-1 w-64 gap-3 overflow-hidden">
          <div className="bg-blue-900/30 border-2 border-blue-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">PROPOSITION</h2>
            {debateInfo?.propTeam.name && (
              <p className="text-center text-xs text-muted-foreground">{debateInfo.propTeam.name}</p>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {propSlots.map((p, i) =>
              p ? (
                <div
                  key={p.sessionId ?? `prop-${i}`}
                  className={cn(
                    "flex-1 rounded-lg border border-blue-600/50 overflow-hidden relative",
                    centerParticipant?.sessionId === p.sessionId && "ring-2 ring-blue-400"
                  )}
                >
                  <ParticipantView participant={p} className="w-full h-full object-cover" />
                  {debateInfo && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {(() => {
                          // Find the matching database participant to get their role
                          const dbParticipant = debateInfo.propTeam.participants.find(
                            (dbP) => dbP.userId === p.userId
                          );
                          return dbParticipant ? ROLE_LABELS[dbParticipant.role] || `Speaker ${i + 1}` : `Speaker ${i + 1}`;
                        })()}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={`prop-placeholder-${i}`}
                  className="flex-1 bg-gray-800/40 rounded-lg border border-blue-600/30 flex items-center justify-center text-xs text-muted-foreground"
                >
                  Waiting for participant
                </div>
              )
            )}
          </div>
        </div>

        {/* Center (Active Speaker + Judges below) */}
        <div className="flex-2 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Active Speaker (as large as possible without scrolling) */}
          <div className="flex-1 rounded-lg border-2 border-primary overflow-hidden relative bg-[#0A1A2B]">
            {centerParticipant ? (
              <ParticipantView participant={centerParticipant} className="w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-xl bg-primary/20 border-4 border-primary mb-4 flex items-center justify-center">
                    <span className="text-5xl font-bold text-primary">S</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Waiting for speaker…</h3>
                </div>
              </div>
            )}
          </div>

          {/* Judges Panel — directly below the active speaker */}
          <div className="shrink-0 bg-[#0d2036] border border-blue-900 rounded-lg px-4 py-3">
            <h3 className="text-sm font-semibold text-center uppercase tracking-wide text-white mb-2">
              Judges Panel
            </h3>
            <div className="flex justify-center gap-3">
              {judges.length > 0 ? (
                judges.map((judge) => (
                  <div
                    key={judge.sessionId}
                    className="flex-1 max-w-[210px] aspect-video rounded-lg border border-blue-900/60 overflow-hidden relative bg-[#0c1e34]"
                  >
                    <ParticipantView participant={judge} className="w-full h-full object-contain" />
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-2">No judges assigned</div>
              )}
            </div>
          </div>
        </div>

        {/* Right (Opposition) */}
        <div className="flex flex-col flex-1 w-64 gap-3 overflow-hidden">
          <div className="bg-red-900/30 border-2 border-red-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">OPPOSITION</h2>
            {debateInfo?.oppTeam.name && (
              <p className="text-center text-xs text-muted-foreground">{debateInfo.oppTeam.name}</p>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {oppSlots.map((p, i) =>
              p ? (
                <div
                  key={p.sessionId ?? `opp-${i}`}
                  className={cn(
                    "flex-1 rounded-lg border border-red-600/50 overflow-hidden relative",
                    centerParticipant?.sessionId === p.sessionId && "ring-2 ring-red-400"
                  )}
                >
                  <ParticipantView participant={p} className="w-full h-full object-cover" />
                  {debateInfo && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        {(() => {
                          // Find the matching database participant to get their role
                          const dbParticipant = debateInfo.oppTeam.participants.find(
                            (dbP) => dbP.userId === p.userId
                          );
                          return dbParticipant ? ROLE_LABELS[dbParticipant.role] || `Speaker ${i + 1}` : `Speaker ${i + 1}`;
                        })()}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={`opp-placeholder-${i}`}
                  className="flex-1 bg-gray-800/40 rounded-lg border border-red-600/30 flex items-center justify-center text-xs text-muted-foreground"
                >
                  Waiting for participant
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MeetingRoom
