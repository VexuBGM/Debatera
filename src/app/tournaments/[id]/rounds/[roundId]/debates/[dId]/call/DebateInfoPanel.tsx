"use client";

/**
 * DebateInfoPanel – Slide-out sidebar showing debate context:
 * motion, info slide, Proposition team + members, Opposition team + members,
 * judges (with role), and side assignment.
 */

import { X, Gavel, Users, Info, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebateContext {
  propTeam: { name: string; members: string[] } | null;
  oppTeam: { name: string; members: string[] } | null;
  judges: { name: string; role: string }[];
}

interface DebateInfoPanelProps {
  open: boolean;
  onClose: () => void;
  motion?: string;
  infoSlide?: string;
  debateContext: DebateContext;
  roundName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DebateInfoPanel({
  open,
  onClose,
  motion,
  infoSlide,
  debateContext,
  roundName,
}: DebateInfoPanelProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 bg-black/40 z-10"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-80 max-w-[90vw] bg-slate-900 border-l border-slate-700 z-20 transform transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-5 p-4 text-white">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Debate Info</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Round */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Round
              </p>
              <p className="text-sm font-medium">{roundName}</p>
            </div>

            {/* Motion */}
            {motion && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquareQuote className="h-3.5 w-3.5 text-cyan-400" />
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Motion
                  </p>
                </div>
                <p className="text-sm leading-relaxed">{motion}</p>
              </div>
            )}

            {/* Info Slide */}
            {infoSlide && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="h-3.5 w-3.5 text-amber-400" />
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Info Slide
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  {infoSlide}
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-700" />

            {/* Proposition Team */}
            {debateContext.propTeam && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Proposition
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-400"
                  >
                    GOV
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1.5">
                  {debateContext.propTeam.name}
                </p>
                <ul className="space-y-1 pl-1">
                  {debateContext.propTeam.members.map((member, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-300 flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                      {member}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opposition Team */}
            {debateContext.oppTeam && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-3.5 w-3.5 text-red-400" />
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Opposition
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-red-500/50 text-red-400"
                  >
                    OPP
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1.5">
                  {debateContext.oppTeam.name}
                </p>
                <ul className="space-y-1 pl-1">
                  {debateContext.oppTeam.members.map((member, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-300 flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                      {member}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-slate-700" />

            {/* Judges */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Gavel className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xs text-slate-400 uppercase tracking-wide">
                  Judges
                </p>
              </div>
              {debateContext.judges.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  No judges assigned
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {debateContext.judges.map((judge, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-300 flex items-center gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>{judge.name}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-slate-800 text-slate-400"
                      >
                        {judge.role === "CHAIR" ? "Chair" : "Panelist"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
