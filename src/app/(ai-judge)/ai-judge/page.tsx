"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SessionSummary {
  id: string;
  motion: string;
  status: string;
  currentPhase: number;
  currentSpeech: number;
  winner: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface UploadResult {
  motion: string;
  infoSlide: string | null;
  speechCount: number;
  speeches: {
    index: number;
    role: string;
    label: string;
    side: string;
    speakerName: string | null;
    textPreview: string;
  }[];
  rawText: string;
}

export default function AIJudgePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [motion, setMotion] = useState("");
  const [infoSlide, setInfoSlide] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-judge/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch {
      // Silently fail on session fetch
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai-judge/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setUploadResult(data);
      if (data.motion) setMotion(data.motion);
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function handleStartJudging() {
    setError(null);
    setCreating(true);

    try {
      const transcriptText = uploadResult?.rawText || pastedText;
      if (!transcriptText.trim()) {
        setError("No transcript text available");
        return;
      }
      if (!motion.trim()) {
        setError("Motion is required");
        return;
      }

      // Create session
      const createRes = await fetch("/api/ai-judge/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motion: motion.trim(),
          transcriptText,
          infoSlide: infoSlide.trim() || undefined,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error || "Failed to create session");
        return;
      }

      // Start pipeline
      const startRes = await fetch(
        `/api/ai-judge/sessions/${createData.id}/start`,
        { method: "POST" },
      );

      const startData = await startRes.json();
      if (!startRes.ok) {
        setError(startData.error || "Failed to start pipeline");
        return;
      }

      // Navigate to results page
      router.push(`/ai-judge/${createData.id}`);
    } catch {
      setError("Failed to start judging");
    } finally {
      setCreating(false);
    }
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-gray-200 text-gray-700",
    CONTEXT_BUILDING: "bg-blue-100 text-blue-700",
    ANALYZING: "bg-yellow-100 text-yellow-700",
    SYNTHESIZING: "bg-purple-100 text-purple-700",
    CALIBRATING: "bg-orange-100 text-orange-700",
    WRITING_BALLOT: "bg-indigo-100 text-indigo-700",
    COMPLETE: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-3xl font-bold">AI Judge</h1>
      <p className="mb-8 text-gray-500">
        Upload a WSDC debate transcript and get AI-powered judging with
        multi-lens analysis.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">New Analysis</h2>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setPasteMode(false)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${!pasteMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Upload File
          </button>
          <button
            onClick={() => setPasteMode(true)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${pasteMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Paste Text
          </button>
        </div>

        {!pasteMode ? (
          <div className="mb-4">
            <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 p-8 hover:border-gray-400">
              <svg
                className="mb-2 h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm text-gray-600">
                {uploading
                  ? "Uploading..."
                  : "Click to upload .md or .txt transcript"}
              </span>
              <input
                type="file"
                accept=".md,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        ) : (
          <div className="mb-4">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your debate transcript here..."
              rows={10}
              className="w-full rounded-lg border p-3 font-mono text-sm"
            />
          </div>
        )}

        {uploadResult && (
          <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm">
            <p className="font-medium text-green-800">
              Parsed {uploadResult.speechCount} speeches
            </p>
            <ul className="mt-2 space-y-1 text-green-700">
              {uploadResult.speeches.map((s) => (
                <li key={s.index}>
                  {s.label}
                  {s.speakerName ? ` (${s.speakerName})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Motion *
          </label>
          <input
            type="text"
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
            placeholder="e.g., This house believes that..."
            className="w-full rounded-lg border p-2.5 text-sm"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Info Slide (optional)
          </label>
          <textarea
            value={infoSlide}
            onChange={(e) => setInfoSlide(e.target.value)}
            placeholder="Optional context information..."
            rows={3}
            className="w-full rounded-lg border p-2.5 text-sm"
          />
        </div>

        <button
          onClick={handleStartJudging}
          disabled={
            creating ||
            (!uploadResult && !pastedText.trim()) ||
            !motion.trim()
          }
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Starting..." : "Start Judging"}
        </button>
      </div>

      {/* Previous Sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Previous Sessions</h2>
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/ai-judge/${session.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{session.motion}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(session.createdAt).toLocaleString()}
                      {session.processingTimeMs
                        ? ` - ${(session.processingTimeMs / 1000).toFixed(1)}s`
                        : ""}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {session.winner && (
                      <span className="text-sm font-medium">
                        {session.winner === "PROPOSITION" ? "Prop" : "Opp"} wins
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[session.status] || "bg-gray-100"}`}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
