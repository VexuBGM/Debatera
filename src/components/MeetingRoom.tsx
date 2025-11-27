"use client"

import React, { useEffect, useMemo, useCallback } from "react"
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
  FIRST_SPEAKER: "1st Speaker",
  SECOND_SPEAKER: "2nd Speaker",
  THIRD_SPEAKER: "3rd Speaker",
  REPLY_SPEAKER: "Reply",
  JUDGE: "Judge",
};

const ROLE_ORDER: Record<string, number> = {
  FIRST_SPEAKER: 0,
  SECOND_SPEAKER: 1,
  THIRD_SPEAKER: 2,
  REPLY_SPEAKER: 3,
  JUDGE: 4,
};

type Team = "prop" | "opp" | "judge" | "spectator" | "unknown"

const norm = (v?: string) => (typeof v === "string" ? v.trim().toLowerCase() : "")

const getTeam = (p: any): Team => {
  const roles: string[] = Array.isArray(p?.roles)
    ? p.roles.map((r: string) => r.toLowerCase())
    : []
  const userRole = norm(p?.user?.role)
  const customTeam = norm(p?.user?.custom?.team)

  // main role from RoleChangeButton: 'judge' / 'debater' / 'spectator'
  if (roles.includes("judge") || userRole === "judge") return "judge"
  if (roles.includes("spectator") || userRole === "spectator") return "spectator"

  // side from RoleChangeButton custom.team
  if (customTeam === "prop" || customTeam === "proposition") return "prop"
  if (customTeam === "opp" || customTeam === "opposition") return "opp"

  return "unknown"
}

const isJudge = (p: any) => getTeam(p) === "judge"
const isSpectator = (p: any) => getTeam(p) === "spectator"
const isDebater = (p: any) => !isJudge(p) && !isSpectator(p)

/**
 * Get the debate role key for a Stream participant.
 * - In tournament debates: from debateInfo (DB).
 * - In standalone meetings: from participant.user.custom.debaterRole set by RoleChangeButton.
 */
const getParticipantRoleKey = (
  streamParticipant: any,
  debateInfo: DebateInfo | null | undefined,
  isStandaloneMeeting: boolean
): string | null => {
  // 1) DB-based roles when debateInfo is present
  if (debateInfo && streamParticipant?.userId) {
    const allDbParticipants = [
      ...debateInfo.propTeam.participants,
      ...debateInfo.oppTeam.participants,
      ...debateInfo.judges,
    ]
    const match = allDbParticipants.find((p) => p.userId === streamParticipant.userId)
    if (match?.role) return match.role
  }

  // 2) Standalone meetings – use custom.debaterRole from RoleChangeButton
  if (isStandaloneMeeting) {
    const metaRole = streamParticipant?.user?.custom?.debaterRole
    if (!metaRole) return null
    const key = metaRole.toString().trim().toUpperCase()
    return ROLE_ORDER[key] !== undefined ? key : null
  }

  return null
}

const roleSort = (
  a: any,
  b: any,
  debateInfo: DebateInfo | null | undefined,
  isStandaloneMeeting: boolean
) => {
  const rA = getParticipantRoleKey(a, debateInfo, isStandaloneMeeting)
  const rB = getParticipantRoleKey(b, debateInfo, isStandaloneMeeting)
  const oA = rA ? ROLE_ORDER[rA] ?? 999 : 999
  const oB = rB ? ROLE_ORDER[rB] ?? 999 : 999
  return oA - oB
}

const getRoleLabelForParticipant = (
  streamParticipant: any,
  debateInfo: DebateInfo | null | undefined,
  isStandaloneMeeting: boolean,
  teamSide: "prop" | "opp",
  fallbackIndex: number
): string => {
  // 1) DB-based label
  if (debateInfo && streamParticipant?.userId) {
    const teamParticipants =
      teamSide === "prop"
        ? debateInfo.propTeam.participants
        : debateInfo.oppTeam.participants
    const dbParticipant = teamParticipants.find(
      (dbP) => dbP.userId === streamParticipant.userId
    )
    if (dbParticipant?.role) {
      return ROLE_LABELS[dbParticipant.role] || dbParticipant.role
    }
  }

  // 2) Standalone metadata-based label
  const key = getParticipantRoleKey(streamParticipant, debateInfo, isStandaloneMeeting)
  if (key) return ROLE_LABELS[key] || key

  // 3) Generic fallback
  return `Speaker ${fallbackIndex + 1}`
}

const MeetingRoom = ({
  hideControls = false,
  debateInfo,
  userParticipant,
  pairingId,
  isStandaloneMeeting = false,
  isJudge: currentUserIsJudge = false,
}: {
  hideControls?: boolean;
  debateInfo?: DebateInfo | null;
  userParticipant?: Participant | null;
  pairingId?: string;
  isStandaloneMeeting?: boolean;
  isJudge?: boolean;
}) => {
  const {
    useParticipants,
    useDominantSpeaker,
    useCallCallingState,
    useCallCustomData,
  } = useCallStateHooks()

  const participants = useParticipants()
  const dominant = useDominantSpeaker()
  const callingState = useCallCallingState()
  const customData = useCallCustomData() as { currentSpeakerUserId?: string } | undefined
  const call = useCall()
  const router = useRouter()

  const canControlCurrentSpeaker = currentUserIsJudge

  // Shared setter for current speaker (judge clicks tiles)
  const setCurrentSpeaker = useCallback(
    async (userId: string | null) => {
      if (!call) return
      const currentCustom = (call.state.custom || {}) as Record<string, any>

      try {
        await call.update({
          custom: {
            ...currentCustom,
            currentSpeakerUserId: userId || undefined, // undefined clears it
          },
        })
      } catch (err) {
        console.error("Failed to update current speaker", err)
      }
    },
    [call]
  )

  // Handle updating participant status when user leaves
  useEffect(() => {
    if (!call) return
    if (callingState === CallingState.LEFT) {
      if (pairingId) {
        fetch(`/api/debates/${pairingId}/leave`, {
          method: "POST",
        }).catch((error) => {
          console.error("Error updating participant status on leave:", error)
        })
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

    if (debateInfo) {
      // Tournament mode – DB-based team mapping
      const dbParticipantMap = new Map<string, Participant>()
      ;[...debateInfo.propTeam.participants, ...debateInfo.oppTeam.participants].forEach(
        (p) => {
          dbParticipantMap.set(p.userId, p)
        }
      )

      const propStreamParticipants: any[] = []
      const oppStreamParticipants: any[] = []
      const unknownStreamParticipants: any[] = []

      for (const streamParticipant of debaters) {
        const dbInfo = dbParticipantMap.get(streamParticipant.userId)

        if (dbInfo) {
          if (dbInfo.role === "JUDGE") continue

          const isProp = debateInfo.propTeam.participants.some(
            (p) => p.userId === streamParticipant.userId && p.role !== "JUDGE"
          )
          const isOpp = debateInfo.oppTeam.participants.some(
            (p) => p.userId === streamParticipant.userId && p.role !== "JUDGE"
          )

          if (isProp) {
            propStreamParticipants.push(streamParticipant)
          } else if (isOpp) {
            oppStreamParticipants.push(streamParticipant)
          } else {
            unknownStreamParticipants.push(streamParticipant)
          }
        } else {
          unknownStreamParticipants.push(streamParticipant)
        }
      }

      // Sort each team by their speaking role (1st / 2nd / 3rd / Reply)
      propStreamParticipants.sort((a, b) => roleSort(a, b, debateInfo, isStandaloneMeeting))
      oppStreamParticipants.sort((a, b) => roleSort(a, b, debateInfo, isStandaloneMeeting))

      propArr = [...propStreamParticipants]
      oppArr = [...oppStreamParticipants]

      unknownStreamParticipants.forEach((p) => {
        if (propArr.length <= oppArr.length) propArr.push(p)
        else oppArr.push(p)
      })
    } else {
      // Standalone meeting – team & role from Stream metadata (RoleChangeButton)
      const propExplicit = debaters.filter((p) => getTeam(p) === "prop")
      const oppExplicit = debaters.filter((p) => getTeam(p) === "opp")
      const unknowns = debaters.filter((p) => getTeam(p) === "unknown")

      propExplicit.sort((a, b) => roleSort(a, b, debateInfo ?? null, isStandaloneMeeting))
      oppExplicit.sort((a, b) => roleSort(a, b, debateInfo ?? null, isStandaloneMeeting))

      propArr = [...propExplicit]
      oppArr = [...oppExplicit]

      unknowns.forEach((p) => {
        const team = getTeam(p)
        if (team === "prop") propArr.push(p)
        else if (team === "opp") oppArr.push(p)
        else if (propArr.length <= oppArr.length) propArr.push(p)
        else oppArr.push(p)
      })
    }

    const propSlots = Array.from({ length: SIDE_SLOTS }, (_, i) => propArr[i])
    const oppSlots = Array.from({ length: SIDE_SLOTS }, (_, i) => oppArr[i])

    return {
      propSlots,
      oppSlots,
      judges: judgeList,
      anyDebater: [...propArr, ...oppArr][0],
    }
  }, [participants, debateInfo, isStandaloneMeeting])

  // 🔴 Shared current speaker logic
  const centerParticipant = useMemo(() => {
    // 1) Shared explicit current speaker (same for everyone)
    const sharedId = customData?.currentSpeakerUserId
    if (sharedId) {
      const shared = participants.find((p) => p.userId === sharedId)
      if (shared && (isDebater(shared) || isJudge(shared))) return shared
    }

    // 2) Fallback: local dominant speaker (used only if shared is not set)
    if (dominant && (isDebater(dominant) || isJudge(dominant))) return dominant

    // 3) Last fallback: first debater we found
    return anyDebater
  }, [participants, customData?.currentSpeakerUserId, dominant, anyDebater])

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
                Your Role:{" "}
                {(() => {
                  const allParticipants = [
                    ...debateInfo.propTeam.participants,
                    ...debateInfo.oppTeam.participants,
                    ...debateInfo.judges,
                  ]
                  const userRoles = allParticipants
                    .filter((p) => p.userId === userParticipant.userId)
                    .map((p) => ROLE_LABELS[p.role] || p.role)
                  return userRoles.join(" + ")
                })()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!hideControls && (
            <CustomCallControls
              showRoleChange={isStandaloneMeeting}
              onLeave={async () => {
                if (pairingId) {
                  try {
                    await fetch(`/api/debates/${pairingId}/leave`, {
                      method: "POST",
                    })
                  } catch (error) {
                    console.error("Error updating participant status on leave:", error)
                  }
                }
              }}
            />
          )}
        </div>
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
              <p className="text-center text-xs text-muted-foreground">
                {debateInfo.propTeam.name}
              </p>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {propSlots.map((p, i) => {
              const isCenter =
                p && centerParticipant && p.sessionId === centerParticipant.sessionId

              // Placeholder card when this slot is the currently speaking participant
              if (p && isCenter) {
                const roleLabel = getRoleLabelForParticipant(
                  p,
                  debateInfo ?? null,
                  isStandaloneMeeting,
                  "prop",
                  i
                )
                return (
                  <div
                    key={p.userId ?? p.sessionId ?? `prop-active-${i}`}
                    className="flex-1 bg-blue-950/70 rounded-lg border border-blue-400/80 flex items-center justify-center text-xs"
                  >
                    <div className="text-center px-2">
                      <p className="text-[0.7rem] uppercase tracking-wide text-blue-300">
                        CURRENTLY SPEAKING
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {roleLabel} — Proposition
                      </p>
                    </div>
                  </div>
                )
              }

              if (!p) {
                return (
                  <div
                    key={`prop-placeholder-${i}`}
                    className="flex-1 bg-gray-800/40 rounded-lg border border-blue-600/30 flex items-center justify-center text-xs text-muted-foreground"
                  >
                    Waiting for participant
                  </div>
                )
              }

              const roleLabel = getRoleLabelForParticipant(
                p,
                debateInfo ?? null,
                isStandaloneMeeting,
                "prop",
                i
              )

              return (
                <div
                  key={p.userId ?? p.sessionId ?? `prop-${i}`}
                  onClick={
                    canControlCurrentSpeaker ? () => setCurrentSpeaker(p.userId) : undefined
                  }
                  className={cn(
                    "flex-1 rounded-lg border border-blue-600/50 overflow-hidden relative",
                    canControlCurrentSpeaker && "cursor-pointer hover:border-blue-400",
                    centerParticipant?.sessionId === p.sessionId && "ring-2 ring-blue-400"
                  )}
                >
                  <ParticipantView
                    participant={p}
                    className="w-full h-full object-cover"
                    trackType="videoTrack"
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                    <Badge variant="secondary" className="text-[0.65rem]">
                      {roleLabel}
                    </Badge>
                    <span className="text-[0.6rem] uppercase text-blue-200/80">
                      Proposition
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center (Active Speaker + Judges below) */}
        <div className="flex-2 flex flex-col gap-3 min-w-0 overflow-hidden">
          {/* Active Speaker */}
          <div className="flex-1 rounded-lg border-2 border-primary overflow-hidden relative bg-[#0A1A2B]">
            {centerParticipant ? (
              <>
                <ParticipantView
                  participant={centerParticipant}
                  className="w-full h-full object-contain"
                  trackType="videoTrack"
                />
                {/* Overlay label for who is speaking and which side */}
                <div className="absolute bottom-3 left-3 bg-black/50 px-3 py-1 rounded-lg text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-semibold">
                    {(() => {
                      const team = getTeam(centerParticipant)
                      const teamLabel =
                        team === "prop"
                          ? "Proposition"
                          : team === "opp"
                          ? "Opposition"
                          : "Judge"
                      const roleKey = getParticipantRoleKey(
                        centerParticipant,
                        debateInfo ?? null,
                        isStandaloneMeeting
                      )
                      const roleLabel =
                        (roleKey && ROLE_LABELS[roleKey]) || roleKey || "Speaker"
                      return `${roleLabel} — ${teamLabel}`
                    })()}
                  </span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-xl bg-primary/20 border-4 border-primary mb-4 flex items-center justify-center">
                    <span className="text-5xl font-bold text-primary">S</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    Waiting for speaker…
                  </h3>
                </div>
              </div>
            )}
          </div>

          {/* Judges Panel */}
          <div className="shrink-0 bg-[#0d2036] border border-blue-900 rounded-lg px-4 py-3">
            <h3 className="text-sm font-semibold text-center uppercase tracking-wide text-white mb-2">
              Judges Panel
            </h3>
            <div className="flex justify-center gap-3">
              {judges.length > 0 ? (
                judges
                  .filter(
                    (judge) =>
                      !centerParticipant ||
                      judge.sessionId !== centerParticipant.sessionId
                  )
                  .sort((a, b) => roleSort(a, b, debateInfo ?? null, isStandaloneMeeting))
                  .map((judge) => (
                    <div
                      key={judge.userId ?? judge.sessionId}
                      className="flex-1 max-w-[210px] aspect-video rounded-lg border border-blue-900/60 overflow-hidden relative bg-[#0c1e34]"
                    >
                      <ParticipantView
                        participant={judge}
                        className="w-full h-full object-contain"
                        trackType="videoTrack"
                      />
                    </div>
                  ))
              ) : (
                <div className="text-xs text-muted-foreground py-2">
                  No judges assigned
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (Opposition) */}
        <div className="flex flex-col flex-1 w-64 gap-3 overflow-hidden">
          <div className="bg-red-900/30 border-2 border-red-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">OPPOSITION</h2>
            {debateInfo?.oppTeam.name && (
              <p className="text-center text-xs text-muted-foreground">
                {debateInfo.oppTeam.name}
              </p>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {oppSlots.map((p, i) => {
              const isCenter =
                p && centerParticipant && p.sessionId === centerParticipant.sessionId

              // Placeholder card when this slot is the currently speaking participant
              if (p && isCenter) {
                const roleLabel = getRoleLabelForParticipant(
                  p,
                  debateInfo ?? null,
                  isStandaloneMeeting,
                  "opp",
                  i
                )
                return (
                  <div
                    key={p.userId ?? p.sessionId ?? `opp-active-${i}`}
                    className="flex-1 bg-red-950/70 rounded-lg border border-red-400/80 flex items-center justify-center text-xs"
                  >
                    <div className="text-center px-2">
                      <p className="text-[0.7rem] uppercase tracking-wide text-red-300">
                        CURRENTLY SPEAKING
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {roleLabel} — Opposition
                      </p>
                    </div>
                  </div>
                )
              }

              if (!p) {
                return (
                  <div
                    key={`opp-placeholder-${i}`}
                    className="flex-1 bg-gray-800/40 rounded-lg border border-red-600/30 flex items-center justify-center text-xs text-muted-foreground"
                  >
                    Waiting for participant
                  </div>
                )
              }

              const roleLabel = getRoleLabelForParticipant(
                p,
                debateInfo ?? null,
                isStandaloneMeeting,
                "opp",
                i
              )

              return (
                <div
                  key={p.userId ?? p.sessionId ?? `opp-${i}`}
                  onClick={
                    canControlCurrentSpeaker ? () => setCurrentSpeaker(p.userId) : undefined
                  }
                  className={cn(
                    "flex-1 rounded-lg border border-red-600/50 overflow-hidden relative",
                    canControlCurrentSpeaker && "cursor-pointer hover:border-red-400",
                    centerParticipant?.sessionId === p.sessionId && "ring-2 ring-red-400"
                  )}
                >
                  <ParticipantView
                    participant={p}
                    className="w-full h-full object-cover"
                    trackType="videoTrack"
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                    <Badge variant="secondary" className="text-[0.65rem]">
                      {roleLabel}
                    </Badge>
                    <span className="text-[0.6rem] uppercase text-red-200/80">
                      Opposition
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MeetingRoom
