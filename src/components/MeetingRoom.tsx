'use client'

import React, { useMemo } from 'react'
import {
  CallControls,
  CallingState,
  ParticipantView,
  useCallStateHooks,
} from '@stream-io/video-react-sdk'
import { cn } from '@/lib/utils'
import Loader from '@/components/Loader'

type Team = 'prop' | 'opp' | 'judge' | 'unknown'

// Helper: get team from participant user custom data (fallback unknown)
const getTeam = (p: any): Team => {
  const team = (p.user as any)?.custom?.team || (p.user as any)?.role
  if (team === 'prop' || team === 'proposition') return 'prop'
  if (team === 'opp' || team === 'opposition') return 'opp'
  if (team === 'judge' || team === 'jury') return 'judge'
  return 'unknown'
}

const PlaceholderTile = ({ side }: { side: 'prop' | 'opp' }) => (
  <div
    className={cn(
      'rounded-lg p-3 flex flex-col items-center justify-center text-center border-2 h-36',
      side === 'prop' ? 'border-blue-500' : 'border-red-500'
    )}
  >
    <div
      className={cn(
        'rounded-full w-10 h-10 flex items-center justify-center text-sm font-semibold border',
        side === 'prop' ? 'border-blue-400 text-blue-400' : 'border-red-400 text-red-400'
      )}
    >
      …
    </div>
    <p className="mt-2 text-xs text-muted-foreground">Waiting for participant</p>
  </div>
)

const Tile = ({ participant, side, highlight }: { participant: any; side: 'prop' | 'opp'; highlight?: boolean }) => (
  <div
    className={cn(
      'rounded-lg overflow-hidden border-2 transition-all h-36',
      side === 'prop' ? 'border-blue-500' : 'border-red-500',
      highlight && 'ring-2 ring-offset-0 ring-blue-400'
    )}
  >
    <ParticipantView participant={participant} />
  </div>
)

const JudgeTile = ({ participant }: { participant: any }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-blue-900 px-2 py-2 w-40 overflow-hidden">
    <div className="w-full aspect-video rounded-md overflow-hidden border border-blue-700">
      <ParticipantView participant={participant} />
    </div>
    <p className="text-xs mt-1 truncate max-w-full">{participant.user?.name || participant.userId}</p>
    <p className="text-[10px] text-muted-foreground">Judge</p>
  </div>
)

const MeetingRoom = () => {
  const { useParticipants, useDominantSpeaker, useCallCallingState } = useCallStateHooks()
  const participants = useParticipants()
  const dominant = useDominantSpeaker()
  const callingState = useCallCallingState()

  const centerParticipant = dominant || participants[0]

  const { propSlots, oppSlots, judges } = useMemo(() => {
    // Exclude center from side lists
    const others = participants.filter((p) => p.sessionId !== centerParticipant?.sessionId)

    const propExplicit = others.filter((p) => getTeam(p) === 'prop')
    const oppExplicit = others.filter((p) => getTeam(p) === 'opp')
    const judgeList = others.filter((p) => getTeam(p) === 'judge')
    const unknowns = others.filter((p) => getTeam(p) === 'unknown')

    // Distribute unknowns evenly between prop/opp to keep layout filled
    const prop = [...propExplicit]
    const opp = [...oppExplicit]
    unknowns.forEach((p, i) => {
      if (prop.length <= opp.length) prop.push(p)
      else opp.push(p)
    })

    // Limit to 3 slots per side to match design; fill with undefined for placeholders
  const propSlots: Array<any | undefined> = [prop[0], prop[1], prop[2]]
  const oppSlots: Array<any | undefined> = [opp[0], opp[1], opp[2]]

    return { propSlots, oppSlots, judges: judgeList }
  }, [participants, centerParticipant])

  if (callingState === CallingState.JOINING) return <Loader />

  return (
    <section className="h-screen w-full flex flex-col bg-[#0a1a2b] text-white p-4">
      <div className="flex flex-1 gap-4">
        {/* Left (Proposition) */}
        <div className="flex flex-col w-64 gap-4">
          <div className="bg-blue-900/30 border-2 border-blue-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">PROPOSITION</h2>
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {propSlots.map((p, i) =>
              p ? (
                <div key={p.sessionId} className="flex-1 bg-card rounded-lg border border-border overflow-hidden relative">
                  <ParticipantView participant={p} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div key={`prop-placeholder-${i}`} className="flex-1 bg-gray-800 rounded-lg border border-border overflow-hidden flex items-center justify-center text-xs text-muted-foreground">Waiting for participant</div>
              )
            )}
          </div>
        </div>

        {/* Center (Active Speaker Area) */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-card rounded-lg border-2 border-primary overflow-hidden relative">
            {centerParticipant ? (
              <>
                {/* background video */}
                <div className="absolute inset-0">
                  <ParticipantView participant={centerParticipant} className="w-full h-full object-cover" />
                </div>

                {/* overlay center info */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#0d2036]/50">
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-blue-700/20 border-4 border-blue-400 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-5xl font-bold text-blue-400">{((centerParticipant as any)?.user?.name || (centerParticipant as any)?.userId || '?').charAt(0)}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">{(centerParticipant as any)?.user?.name || (centerParticipant as any)?.userId}</h3>
                    <p className="text-muted-foreground text-lg">{((centerParticipant as any)?.user?.role) || ''}</p>
                    <div className="mt-3 inline-block px-4 py-1 rounded-full bg-blue-700/30 border border-blue-600">
                      <span className="text-sm font-semibold text-foreground uppercase">Active Speaker</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full bg-primary/20 border-4 border-primary mx-auto mb-4 flex items-center justify-center">
                    <span className="text-5xl font-bold text-primary">S</span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">Waiting for speaker…</h3>
                </div>
              </div>
            )}
          </div>

          {/* Judges Panel - Bottom Center */}
          <div className="h-40">
            <div className="bg-accent/20 border border-accent rounded-lg px-4 py-2 mb-3">
              <h3 className="text-sm font-bold text-center text-foreground uppercase tracking-wide">Judges Panel</h3>
            </div>
            <div className="flex gap-3 h-28">
              {judges.length > 0 ? (
                judges.map((judge) => (
                  <div key={judge.sessionId} className="flex-1 bg-card rounded-lg border border-border overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent mx-auto mb-2 flex items-center justify-center">
                          <span className="text-xl font-bold text-accent">{(((judge as any)?.user?.name) || (judge as any)?.userId || '?').charAt(0)}</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{(judge as any)?.user?.name || (judge as any)?.userId}</p>
                        <p className="text-xs text-muted-foreground">Judge</p>
                      </div>
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
        <div className="flex flex-col w-64 gap-4">
          <div className="bg-red-900/30 border-2 border-red-600 rounded-lg px-4 py-2">
            <h2 className="text-center font-bold uppercase text-sm">OPPOSITION</h2>
          </div>
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {oppSlots.map((p, i) =>
              p ? (
                <div key={p.sessionId} className="flex-1 bg-card rounded-lg border border-border overflow-hidden relative">
                  <ParticipantView participant={p} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div key={`opp-placeholder-${i}`} className="flex-1 bg-gray-800 rounded-lg border border-border overflow-hidden flex items-center justify-center text-xs text-muted-foreground">Waiting for participant</div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Judges Panel */}
      <div className="mt-4 bg-[#0d2036] border border-blue-900 rounded-lg py-2">
        <h3 className="text-center text-xs uppercase font-semibold mb-2 tracking-wide">Judges Panel</h3>
        <div className="flex justify-center gap-4 flex-wrap px-2">
          {judges.length > 0 ? (
            judges.map((j) => <JudgeTile key={j.sessionId} participant={j} />)
          ) : (
            <div className="text-xs text-muted-foreground py-2">No judges assigned</div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-4 flex items-center justify-between bg-[#0d2036] border border-blue-900 rounded-lg px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div>
            <p className="font-semibold text-sm">Debate Room</p>
            <p className="text-xs text-muted-foreground">Round 1 — Motion: Technology Benefits Society</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CallControls />
        </div>

        <div className="text-center bg-blue-900/40 px-3 py-2 rounded-lg">
          <p className="text-xs text-muted-foreground">Time Remaining</p>
          <p className="text-xl font-mono font-bold">05:30</p>
        </div>
      </div>
    </section>
  )
}

export default MeetingRoom
