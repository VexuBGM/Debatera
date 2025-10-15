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

type Team = "prop" | "opp" | "judge" | "spectator" | "unknown"

const norm = (v?: string) => (typeof v === "string" ? v.trim().toLowerCase() : "")

/**
 * Try *multiple* sources to resolve a participant's team/role.
 * Works if you set:
 *  - call-level roles (p.roles: string[])
 *  - or user-level role (p.user?.role)
 *  - or custom field (p.user?.custom?.team)
 */
const getTeam = (p: any): Team => {
  const roles: string[] = Array.isArray(p?.roles) ? p.roles.map((r: string) => r.toLowerCase()) : []
  const userRole = norm(p?.user?.role)
  const customTeam = norm(p?.user?.custom?.team)

  // Highest priority: explicit judge/spectator by call role or user role/custom
  if (roles.includes("judge") || userRole === "judge" || customTeam === "judge" || customTeam === "jury") {
    return "judge"
  }
  if (roles.includes("spectator") || userRole === "spectator" || customTeam === "spectator" || userRole === "viewer") {
    return "spectator"
  }

  // Debater side via custom or user role
  if (customTeam === "prop" || customTeam === "proposition" || userRole === "prop" || userRole === "proposition") {
    return "prop"
  }
  if (customTeam === "opp" || customTeam === "opposition" || userRole === "opp" || userRole === "opposition") {
    return "opp"
  }

  return "unknown"
}

const isJudge = (p: any) => getTeam(p) === "judge"
const isSpectator = (p: any) => getTeam(p) === "spectator"
const isDebater = (p: any) => !isJudge(p) && !isSpectator(p)

const MeetingRoom = ({ hideControls = false }: { hideControls?: boolean }) => {
  const { useParticipants, useDominantSpeaker, useCallCallingState } = useCallStateHooks()
  const participants = useParticipants()
  const dominant = useDominantSpeaker()
  const callingState = useCallCallingState()
  const call = useCall()
  const router = useRouter()

  useEffect(() => {
    if (!call) return
    if (callingState === CallingState.LEFT) router.push("/")
  }, [callingState, call, router])

  const {
    propSlots,
    oppSlots,
    judges,
    anyDebater,
  } = useMemo(() => {
    // Remove spectators entirely
    const visible = participants.filter((p) => !isSpectator(p))

    // Judges go only to the panel
    const judgeList = visible.filter((p) => isJudge(p))

    // Everyone else is a debater (even if team unknown)
    const debaters = visible.filter((p) => isDebater(p))

    // Split debaters by explicit side first
    const propExplicit = debaters.filter((p) => getTeam(p) === "prop")
    const oppExplicit = debaters.filter((p) => getTeam(p) === "opp")
    const unknowns = debaters.filter((p) => getTeam(p) === "unknown")

    // Distribute unknown debaters evenly to keep layout filled
    const propArr = [...propExplicit]
    const oppArr = [...oppExplicit]
    unknowns.forEach((p, i) => {
      if (propArr.length <= oppArr.length) propArr.push(p)
      else oppArr.push(p)
    })

    // Keep a fixed number of tiles per side (tweak if you want more)
    const SIDE_SLOTS = 3
    const propSlots: Array<any | undefined> = Array.from({ length: SIDE_SLOTS }, (_, i) => propArr[i])
    const oppSlots: Array<any | undefined> = Array.from({ length: SIDE_SLOTS }, (_, i) => oppArr[i])

    return {
      propSlots,
      oppSlots,
      judges: judgeList,
      anyDebater: [...propArr, ...oppArr][0],
    }
  }, [participants])

  // Center = dominant speaker if debater, else fallback to first available debater
  const centerParticipant = useMemo(() => {
    if (dominant && isDebater(dominant)) return dominant
    return anyDebater
  }, [dominant, anyDebater])

  if (callingState === CallingState.JOINING) return <Loader />

  return (
    <section className="h-screen w-full flex flex-col bg-[#0a1a2b] text-white p-2">
      {/* Top bar / Controls */}
      <div className="flex items-center justify-between bg-[#0d2036] border border-blue-900 rounded-lg px-6 py-1 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-sm">Debate Room</p>
            <p className="text-xs text-muted-foreground">Round 1 — Motion: Technology Benefits Society</p>
          </div>
        </div>
        <div className="flex items-center gap-3">{!hideControls && <CustomCallControls />}</div>
        <div className="text-center bg-blue-900/40 px-3 py-2 rounded-lg">
          <p className="text-xs text-muted-foreground">Time Remaining</p>
          <p className="text-xl font-mono font-bold">05:30</p>
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        {/* Left (Proposition) */}
        <div className="flex flex-col flex-1 w-64 gap-3">
          <div className="bg-blue-900/30 border-2 border-blue-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">PROPOSITION</h2>
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
                </div>
              ) : (
                <div
                  key={`prop-placeholder-${i}`}
                  className="flex-1 bg-gray-800/40 rounded-lg border border-blue-600/30 overflow-hidden flex items-center justify-center text-xs text-muted-foreground"
                >
                  Waiting for participant
                </div>
              )
            )}
          </div>
        </div>

        {/* Center (Active Speaker Area) */}
        <div className="flex-[2] flex flex-col gap-4 min-w-0">
          <div className="flex-1 rounded-lg border-2 border-primary overflow-hidden relative bg-[#0A1A2B]">
            {centerParticipant ? (
              <ParticipantView participant={centerParticipant} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-xl bg-primary/20 border-4 border-primary  mb-4 flex items-center justify-center">
                    <span className="text-5xl font-bold text-primary">S</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Waiting for speaker…</h3>
                </div>
              </div>
            )}
          </div>

          {/* Judges Panel */}
          <div className="h-40">
            <div className="px-4 mb-3 bg-[#0d2036] border border-blue-900 rounded-lg py-2">
              <h3 className="text-sm font-semibold text-center uppercase tracking-wide text-white">Judges Panel</h3>
            </div>
            <div className="flex gap-3 h-28">
              {judges.length > 0 ? (
                judges.map((judge) => (
                  <div
                    key={judge.sessionId}
                    className="flex-1 rounded-lg border border-blue-900/60 overflow-hidden relative bg-[#0c1e34]"
                  >
                    <ParticipantView participant={judge} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 right-1 text-[11px] px-2 py-1 bg-black/40 rounded">
                      <p className="truncate">
                        {judge?.name || judge?.userId || "Judge"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Judge</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-2">No judges assigned</div>
              )}
            </div>
          </div>
        </div>

        {/* Right (Opposition) */}
        <div className="flex flex-col flex-1 w-64 gap-3">
          <div className="bg-red-900/30 border-2 border-red-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">OPPOSITION</h2>
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
                </div>
              ) : (
                <div
                  key={`opp-placeholder-${i}`}
                  className="flex-1 bg-gray-800/40 rounded-lg border border-red-600/30 overflow-hidden flex items-center justify-center text-xs text-muted-foreground"
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
