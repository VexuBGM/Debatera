"use client";

/**
 * DebateCallRoom – Client component that joins a Stream video call.
 *
 * 1. Ensures the call exists via /api/stream/calls/ensure
 * 2. Creates a StreamVideoClient with a tokenProvider
 * 3. Joins the call
 * 4. Renders Stream UI (SpeakerLayout + CallControls)
 * 5. Cleans up on unmount
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  StreamVideo,
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  CallControls,
  StreamVideoClient,
  type Call,
  type User as StreamUser,
} from "@stream-io/video-react-sdk";
import { Loader2, ArrowLeft, Video, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { DebateStreamRole } from "@/lib/stream/eligibility";
import { buildHelpHref } from "@/lib/docs/help";
import DebateInfoPanel, { type DebateContext } from "./DebateInfoPanel";
import SyncedStopwatch from "@/components/debate/SyncedStopwatch";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DebateCallRoomProps {
  tournamentId: string;
  roundId: string;
  debateId: string;
  userId: string;
  userName: string;
  userImage?: string;
  role: DebateStreamRole;
  roundName: string;
  tournamentName: string;
  motion?: string;
  infoSlide?: string;
  debateContext: DebateContext;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DebateCallRoom({
  tournamentId,
  roundId,
  debateId,
  userId,
  userName,
  userImage,
  role,
  roundName,
  tournamentName,
  motion,
  infoSlide,
  debateContext,
}: DebateCallRoomProps) {
  const router = useRouter();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "left"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const cleanedUp = useRef(false);

  // -------------------------------------------------------------------------
  // Token provider – called by the SDK whenever a token refresh is needed
  // -------------------------------------------------------------------------
  const tokenProvider = useCallback(async () => {
    const res = await fetch("/api/stream/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "debate", debateId }),
    });
    if (!res.ok) throw new Error("Failed to get Stream token");
    const data = await res.json();
    return data.token as string;
  }, [debateId]);

  // -------------------------------------------------------------------------
  // Setup: ensure call, create client, join
  // -------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    let videoClient: StreamVideoClient | undefined;
    let videoCall: Call | undefined;

    async function init() {
      try {
        // 1. Ensure call exists (idempotent)
        const ensureRes = await fetch("/api/stream/calls/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "debate",
            tournamentId,
            debateId,
          }),
        });
        if (!ensureRes.ok) {
          const err = await ensureRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to ensure call");
        }

        if (!mounted) return;

        // 2. Create Stream client
        const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
        if (!apiKey) throw new Error("Missing NEXT_PUBLIC_STREAM_API_KEY");

        const user: StreamUser = {
          id: userId,
          name: userName,
          image: userImage,
        };

        videoClient = new StreamVideoClient({
          apiKey,
          user,
          tokenProvider,
        });

        if (!mounted) { await videoClient.disconnectUser(); return; }

        // 3. Create call handle & join (cam & mic off by default)
        videoCall = videoClient.call("debate", `debate_${debateId}`);
        await videoCall.join();
        await videoCall.camera.disable();
        await videoCall.microphone.disable();

        if (!mounted) {
          await videoCall.leave();
          await videoClient.disconnectUser();
          return;
        }

        setClient(videoClient);
        setCall(videoCall);
        setStatus("ready");
      } catch (err) {
        console.error("[DebateCallRoom] init error:", err);
        if (mounted) {
          setErrorMsg(err instanceof Error ? err.message : "Unknown error");
          setStatus("error");
        }
      }
    }

    void init();

    return () => {
      mounted = false;
      if (!cleanedUp.current) {
        cleanedUp.current = true;
        videoCall?.leave().catch(() => {});
        videoClient?.disconnectUser().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Leave handler
  // -------------------------------------------------------------------------
  async function handleLeave() {
    if (!cleanedUp.current) {
      cleanedUp.current = true;
      await call?.leave().catch(() => {});
      await client?.disconnectUser().catch(() => {});
    }
    setStatus("left");
    router.push(`/tournaments/${tournamentId}/rounds/${roundId}`);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-lg">Joining debate call…</p>
          <p className="text-sm text-muted-foreground">
            {tournamentName} · {roundName}
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <Video className="h-10 w-10 text-red-400" />
          <h2 className="text-xl font-semibold">Could not join call</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/tournaments/${tournamentId}/rounds/${roundId}`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to round
          </Button>
        </div>
      </div>
    );
  }

  if (status === "left" || !client || !call) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="text-white hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Leave
          </Button>
          <span className="text-sm text-muted-foreground">
            {tournamentName} · {roundName}
          </span>
          {motion && (
            <>
              <span className="text-sm text-slate-600">·</span>
              <span className="text-sm text-white font-medium truncate max-w-md">
                {motion}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {call && (
            <SyncedStopwatch debateId={debateId} call={call} role={role} />
          )}
          <a
            href={buildHelpHref("Joining an Online Debate")}
            className="hidden text-xs text-slate-300 transition hover:text-white md:inline"
          >
            Joining guide
          </a>
          <a
            href={buildHelpHref("Using the Debate Timer")}
            className="hidden text-xs text-slate-300 transition hover:text-white md:inline"
          >
            Timer help
          </a>
          <span className="text-xs px-2 py-1 rounded bg-slate-800 capitalize">
            {role}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInfoPanelOpen(true)}
            className="text-white hover:text-white hover:bg-slate-800"
            title="Debate Info"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stream call UI */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <StreamTheme className="h-full">
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <SpeakerLayout />
                </div>
                <div className="shrink-0 flex justify-center bg-[#1c1c1e] border-t">
                  <CallControls onLeave={handleLeave} />
                </div>
              </div>
            </StreamTheme>
          </StreamCall>
        </StreamVideo>

        {/* Debate Info Sidebar */}
        <DebateInfoPanel
          open={infoPanelOpen}
          onClose={() => setInfoPanelOpen(false)}
          motion={motion}
          infoSlide={infoSlide}
          debateContext={debateContext}
          roundName={roundName}
        />
      </div>
    </div>
  );
}
