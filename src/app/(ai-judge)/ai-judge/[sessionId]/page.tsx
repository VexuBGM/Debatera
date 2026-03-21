"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SpeakerScore {
  content: number;
  style: number;
  strategy: number;
  total: number;
}

interface LensAnalysis {
  lensType: string;
  modelUsed: string;
  verdict: {
    winner: string;
    reasoning: string;
    speakerScores: Record<string, number>;
    keyMoments: string[];
    confidence: number;
  } | null;
  confidence: number | null;
}

interface SessionData {
  id: string;
  motion: string;
  infoSlide: string | null;
  status: string;
  currentPhase: number;
  currentSpeech: number;
  errorMessage: string | null;
  finalBallot: {
    winner: string;
    winnerReasoning: string;
    speakerScores: Record<string, SpeakerScore>;
    speakerFeedback: Record<string, string>;
    turningPoints: string[];
    confidence: number;
    disclaimer: string;
    propTotal: number;
    oppTotal: number;
  } | null;
  finalScores: {
    prop: number;
    opp: number;
    speakers: Record<string, SpeakerScore>;
  } | null;
  winner: string | null;
  modelsUsed: Record<string, string> | null;
  totalApiCalls: number;
  totalTokensUsed: number;
  processingTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
  lensAnalyses: LensAnalysis[];
}

const PHASE_LABELS: Record<number, string> = {
  0: "Waiting to start",
  1: "Building debate context",
  2: "Analyzing speeches",
  3: "Synthesizing lens verdicts",
  4: "Calibrating results",
  5: "Writing ballot",
};

const SPEECH_LABELS = [
  "1st Proposition",
  "1st Opposition",
  "2nd Proposition",
  "2nd Opposition",
  "3rd Proposition",
  "3rd Opposition",
  "Opposition Reply",
  "Proposition Reply",
];

const SPEECH_ROLES = [
  "PROP_1",
  "OPP_1",
  "PROP_2",
  "OPP_2",
  "PROP_3",
  "OPP_3",
  "OPP_REPLY",
  "PROP_REPLY",
];

export default function SessionResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(
    new Set(),
  );

  // Unwrap params
  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/ai-judge/sessions/${sessionId}`);
      if (!res.ok) {
        setError("Session not found");
        return;
      }
      const data = await res.json();
      setSession(data);
    } catch {
      setError("Failed to load session");
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    fetchSession();
  }, [sessionId, fetchSession]);

  // Poll while processing
  useEffect(() => {
    if (
      !session ||
      session.status === "COMPLETE" ||
      session.status === "FAILED"
    ) {
      return;
    }

    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, [session, fetchSession]);

  function toggleFeedback(role: string) {
    setExpandedFeedback((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
        <Link
          href="/ai-judge"
          className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          Back to AI Judge
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-4 w-96 rounded bg-gray-200" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const isProcessing =
    session.status !== "COMPLETE" && session.status !== "FAILED";

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        href="/ai-judge"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to AI Judge
      </Link>

      <h1 className="mb-1 text-2xl font-bold">AI Judge Results</h1>
      <p className="mb-6 text-gray-600">{session.motion}</p>

      {/* Progress Section */}
      {isProcessing && (
        <div className="mb-8 rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Processing...</h2>

          {/* Phase progress bar */}
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>{PHASE_LABELS[session.currentPhase] || "Processing"}</span>
              <span>Phase {session.currentPhase}/5</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${(session.currentPhase / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Speech progress (Phase 2) */}
          {session.currentPhase === 2 && (
            <div>
              <div className="mb-2 flex justify-between text-sm text-gray-600">
                <span>
                  Analyzing:{" "}
                  {SPEECH_LABELS[session.currentSpeech - 1] ||
                    `Speech ${session.currentSpeech}`}
                </span>
                <span>{session.currentSpeech}/8 speeches</span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {SPEECH_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`h-2 rounded-full ${
                      i < session.currentSpeech
                        ? "bg-green-500"
                        : i === session.currentSpeech
                          ? "animate-pulse bg-blue-400"
                          : "bg-gray-200"
                    }`}
                    title={label}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400">
            {session.totalApiCalls} API calls | {session.totalTokensUsed.toLocaleString()} tokens
          </p>
        </div>
      )}

      {/* Error */}
      {session.status === "FAILED" && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-800">
            Analysis Failed
          </h2>
          <p className="text-sm text-red-700">
            {session.errorMessage || "An unknown error occurred"}
          </p>
        </div>
      )}

      {/* Results */}
      {session.status === "COMPLETE" && session.finalBallot && (
        <>
          {/* Winner Banner */}
          <div className="mb-8 rounded-lg bg-gray-900 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Winner</p>
                <p className="text-2xl font-bold">
                  {session.winner === "PROPOSITION"
                    ? "Proposition"
                    : "Opposition"}
                </p>
              </div>
              <div className="text-right">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-gray-400">Prop Total</p>
                    <p className="text-xl font-bold">
                      {session.finalBallot.propTotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Opp Total</p>
                    <p className="text-xl font-bold">
                      {session.finalBallot.oppTotal}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-300">
              {session.finalBallot.winnerReasoning}
            </p>
          </div>

          {/* Speaker Scores Table */}
          <div className="mb-8 overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                    Speaker
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Content (40%)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Style (40%)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Strategy (20%)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {SPEECH_ROLES.map((role, i) => {
                  const scores = session.finalBallot!.speakerScores[role];
                  const isProp = role.startsWith("PROP");
                  return (
                    <tr
                      key={role}
                      className={`border-b ${isProp ? "bg-blue-50/30" : "bg-red-50/30"}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {SPEECH_LABELS[i]}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {scores?.content ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {scores?.style ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {scores?.strategy ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold">
                        {scores?.total ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Speaker Feedback */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Speaker Feedback</h2>
            <div className="space-y-2">
              {SPEECH_ROLES.map((role, i) => {
                const feedback = session.finalBallot!.speakerFeedback[role];
                if (!feedback) return null;
                const isExpanded = expandedFeedback.has(role);
                return (
                  <div key={role} className="rounded-lg border">
                    <button
                      onClick={() => toggleFeedback(role)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium">
                        {SPEECH_LABELS[i]}
                      </span>
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="border-t px-4 py-3 text-sm text-gray-700">
                        {feedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Turning Points */}
          {session.finalBallot.turningPoints.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">
                Key Turning Points
              </h2>
              <ul className="space-y-2">
                {session.finalBallot.turningPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Lens Verdicts */}
          {session.lensAnalyses.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">
                Lens Analysis Breakdown
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {session.lensAnalyses.map((lens) => (
                  <div key={lens.lensType} className="rounded-lg border p-4">
                    <h3 className="mb-1 text-sm font-semibold uppercase text-gray-500">
                      {lens.lensType}
                    </h3>
                    <p className="mb-2 text-xs text-gray-400">
                      {lens.modelUsed}
                    </p>
                    {lens.verdict && (
                      <>
                        <p className="font-medium">
                          Winner:{" "}
                          {lens.verdict.winner === "PROP"
                            ? "Proposition"
                            : "Opposition"}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Confidence:{" "}
                          {(lens.verdict.confidence * 100).toFixed(0)}%
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {lens.verdict.reasoning?.slice(0, 150)}...
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mb-8 rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="font-medium">API Calls</p>
                <p>{session.totalApiCalls}</p>
              </div>
              <div>
                <p className="font-medium">Tokens Used</p>
                <p>{session.totalTokensUsed.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium">Processing Time</p>
                <p>
                  {session.processingTimeMs
                    ? `${(session.processingTimeMs / 1000).toFixed(1)}s`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="font-medium">Confidence</p>
                <p>
                  {session.finalBallot.confidence
                    ? `${(session.finalBallot.confidence * 100).toFixed(0)}%`
                    : "-"}
                </p>
              </div>
            </div>
            {session.modelsUsed && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                <p className="mb-1 font-medium">Models Used</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(session.modelsUsed).map(([role, model]) => (
                    <span
                      key={role}
                      className="rounded bg-gray-200 px-2 py-0.5 text-xs"
                    >
                      {role}: {model as string}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            {session.finalBallot.disclaimer}
          </div>
        </>
      )}
    </div>
  );
}
