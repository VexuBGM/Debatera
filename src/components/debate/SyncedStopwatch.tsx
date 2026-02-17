"use client";

/**
 * SyncedStopwatch – realtime stopwatch synced via Stream custom events + DB.
 *
 * - All call participants see the same elapsed time.
 * - Only judges / admins can Start / Pause / Reset.
 * - Late joiners GET the correct state from the API.
 * - State changes broadcast via `call.sendCustomEvent`.
 * - Out-of-order / stale events are ignored (version check).
 *
 * ─── Manual test ────────────────────────────────────────────────
 * 1. Open the same debate call in two browser windows (one judge, one debater).
 * 2. Judge clicks "Start" → both see timer running in sync.
 * 3. Judge clicks "Pause" → both freeze at the same time.
 * 4. Refresh debater tab → timer resumes from correct elapsed time.
 * 5. Judge clicks "Reset" (confirm) → both reset to 00:00.
 * 6. Debater should NOT see Start/Pause/Reset buttons.
 * ────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Call } from "@stream-io/video-react-sdk";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StopwatchState {
  running: boolean;
  startedAtMs: number | null;
  baseElapsedMs: number;
  version: number;
}

interface SyncedStopwatchProps {
  debateId: string;
  /** The Stream Call instance (must already be joined). */
  call: Call;
  /** The user's role in this debate call. */
  role: "judge" | "debater";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CUSTOM_EVENT_TYPE = "stopwatch.state";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const hh = String(hours).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SyncedStopwatch({
  debateId,
  call,
  role,
}: SyncedStopwatchProps) {
  const [state, setState] = useState<StopwatchState | null>(null);
  const [serverOffset, setServerOffset] = useState(0); // serverNowMs - clientNowMs
  const [displayMs, setDisplayMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<StopwatchState | null>(null);
  const offsetRef = useRef(0);

  const canControl = role === "judge";

  // Keep refs in sync with state for RAF callback
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    offsetRef.current = serverOffset;
  }, [serverOffset]);

  // ---------------------------------------------------------------------------
  // Compute elapsed ms from state
  // ---------------------------------------------------------------------------
  const computeElapsed = useCallback(
    (s: StopwatchState, offset: number): number => {
      if (!s.running || s.startedAtMs === null) return s.baseElapsedMs;
      const serverNow = Date.now() + offset;
      return s.baseElapsedMs + (serverNow - s.startedAtMs);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Animation loop – updates display every ~50ms while running
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function tick() {
      const s = stateRef.current;
      if (s) {
        setDisplayMs(computeElapsed(s, offsetRef.current));
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [computeElapsed]);

  // ---------------------------------------------------------------------------
  // Accept a new state only if its version is newer
  // ---------------------------------------------------------------------------
  const acceptState = useCallback(
    (incoming: StopwatchState, newServerNowMs?: number) => {
      setState((prev) => {
        if (prev && incoming.version <= prev.version) return prev;
        return incoming;
      });
      if (newServerNowMs !== undefined) {
        setServerOffset(newServerNowMs - Date.now());
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Initial fetch
  // ---------------------------------------------------------------------------
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/debates/${debateId}/stopwatch`);
      if (!res.ok) throw new Error("Failed to fetch stopwatch state");
      const data = await res.json();
      acceptState(data.state, data.serverNowMs);
    } catch (err) {
      console.error("[SyncedStopwatch] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [debateId, acceptState]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  // ---------------------------------------------------------------------------
  // Subscribe to Stream custom events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = call.on("custom", (event: unknown) => {
      const evt = event as {
        type?: string;
        custom?: {
          type?: string;
          debateId?: string;
          state?: StopwatchState;
          serverNowMs?: number;
        };
      };

      const payload = evt.custom;
      if (!payload) return;
      if (payload.type !== CUSTOM_EVENT_TYPE) return;
      if (payload.debateId !== debateId) return;
      if (!payload.state) return;

      acceptState(payload.state, payload.serverNowMs);
    });

    return () => {
      unsubscribe();
    };
  }, [call, debateId, acceptState]);

  // ---------------------------------------------------------------------------
  // Mutation helper
  // ---------------------------------------------------------------------------
  async function mutate(action: "start" | "pause" | "reset") {
    if (mutating) return;
    setMutating(true);
    try {
      const res = await fetch(`/api/debates/${debateId}/stopwatch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Stopwatch action failed");
      const data = await res.json();

      // Accept locally
      acceptState(data.state, data.serverNowMs);

      // Broadcast to all watchers
      await call.sendCustomEvent({
        type: CUSTOM_EVENT_TYPE,
        debateId,
        state: data.state,
        serverNowMs: data.serverNowMs,
      });
    } catch (err) {
      console.error("[SyncedStopwatch] mutate error:", err);
    } finally {
      setMutating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading || !state) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Timer className="h-4 w-4 animate-pulse" />
        <span>Loading…</span>
      </div>
    );
  }

  const isRunning = state.running;

  return (
    <div className="flex items-center gap-3">
      {/* Timer display */}
      <div className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-white">
        <Timer className="h-4 w-4 text-cyan-400 shrink-0" />
        <span>{formatElapsed(displayMs)}</span>
        <span
          className={`text-[10px] uppercase tracking-wide ${
            isRunning ? "text-green-400" : "text-slate-400"
          }`}
        >
          {isRunning ? "Running" : "Paused"}
        </span>
      </div>

      {/* Controls (judges / admins only) */}
      {canControl && (
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mutate("start")}
              disabled={mutating}
              className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-slate-800"
              title="Start stopwatch"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mutate("pause")}
              disabled={mutating}
              className="h-7 px-2 text-yellow-400 hover:text-yellow-300 hover:bg-slate-800"
              title="Pause stopwatch"
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={mutating}
                className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-slate-800"
                title="Reset stopwatch"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset stopwatch?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset the debate stopwatch to 00:00 for all
                  participants.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => mutate("reset")}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
