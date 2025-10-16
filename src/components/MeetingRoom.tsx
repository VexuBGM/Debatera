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

  const { propSlots, oppSlots, judges, anyDebater } = useMemo(() => {
    const visible = participants.filter((p) => !isSpectator(p))
    const judgeList = visible.filter((p) => isJudge(p))
    const debaters = visible.filter((p) => isDebater(p))

    const propExplicit = debaters.filter((p) => getTeam(p) === "prop")
    const oppExplicit = debaters.filter((p) => getTeam(p) === "opp")
    const unknowns = debaters.filter((p) => getTeam(p) === "unknown")

    const propArr = [...propExplicit]
    const oppArr = [...oppExplicit]
    unknowns.forEach((p, i) => {
      if (propArr.length <= oppArr.length) propArr.push(p)
      else oppArr.push(p)
    })

    const SIDE_SLOTS = 3
    const propSlots = Array.from({ length: SIDE_SLOTS }, (_, i) => propArr[i])
    const oppSlots = Array.from({ length: SIDE_SLOTS }, (_, i) => oppArr[i])

    return { propSlots, oppSlots, judges: judgeList, anyDebater: [...propArr, ...oppArr][0] }
  }, [participants])

  const centerParticipant = useMemo(() => {
    if (dominant && (isDebater(dominant) || isJudge(dominant))) return dominant
    return anyDebater
  }, [dominant, anyDebater])

  if (callingState === CallingState.JOINING) return <Loader />

  return (
    <section className="h-screen w-full flex flex-col bg-[#0a1a2b] text-white p-2 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-[#0d2036] border border-blue-900 rounded-lg px-6 py-1 mb-2 flex-shrink-0">
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

      {/* Main Debate Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left (Proposition) */}
        <div className="flex flex-col flex-1 w-64 gap-3 overflow-hidden">
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
                  className="flex-1 bg-gray-800/40 rounded-lg border border-blue-600/30 flex items-center justify-center text-xs text-muted-foreground"
                >
                  Waiting for participant
                </div>
              )
            )}
          </div>
        </div>

        {/* Center (Active Speaker + Judges below) */}
        <div className="flex-[2] flex flex-col gap-3 min-w-0 overflow-hidden">
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
          <div className="flex-shrink-0 bg-[#0d2036] border border-blue-900 rounded-lg px-4 py-3">
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
