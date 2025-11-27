"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Loader from "@/components/Loader";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface FeedbackViewerProps {
  teamId: string;
  tournamentId?: string;
}

export function FeedbackViewer({ teamId, tournamentId }: FeedbackViewerProps) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, [teamId, tournamentId]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const url = tournamentId
        ? `/api/feedback?teamId=${teamId}&tournamentId=${tournamentId}`
        : `/api/feedback?teamId=${teamId}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load feedback");

      const data = await response.json();
      setFeedback(data);
    } catch (err: any) {
      console.error("Error loading feedback:", err);
      setError(err.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (feedback.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No feedback available yet. Feedback will appear here once rounds are completed and
          results are published.
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const wins = feedback.filter((f) => f.isWinner).length;
  const losses = feedback.length - wins;
  const avgScores = feedback
    .flatMap((f) => f.speakerScores)
    .filter((s) => s.totalScore !== null)
    .map((s) => s.totalScore);
  const avgScore =
    avgScores.length > 0
      ? (avgScores.reduce((a, b) => a + b, 0) / avgScores.length).toFixed(2)
      : "N/A";

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{wins}</div>
                <div className="text-sm text-muted-foreground">Wins</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">{losses}</div>
                <div className="text-sm text-muted-foreground">Losses</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{avgScore}</div>
                <div className="text-sm text-muted-foreground">Avg Speaker Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback by Round */}
      <div className="space-y-4">
        {feedback.map((item) => (
          <Card key={item.ballotId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {item.roundName || `Round ${item.roundNumber}`}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mt-1">
                    vs {item.opponentTeam?.name} ({item.opponentTeam?.institution?.name})
                  </div>
                  {/* Judge Information - Non-Anonymous */}
                  <div className="text-sm mt-2 flex items-center gap-2">
                    <span className="font-medium">Judge:</span>
                    <span>{item.judgeName}</span>
                    {item.isChair && <Badge variant="outline" className="text-xs">Chair</Badge>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {/* Clear Outcome Badge */}
                  {item.isWinner ? (
                    <Badge className="bg-green-500 text-lg px-3 py-1">WIN</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-lg px-3 py-1">LOSS</Badge>
                  )}
                  {/* Panel Result if available */}
                  {item.result && (
                    <div className="text-xs text-muted-foreground">
                      Panel: {item.result.panelVotes}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Result Summary */}
              {item.result && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-blue-600" />
                    Debate Outcome
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-muted-foreground">Winner:</span>
                      <span className="ml-2 font-medium">{item.result.finalWinner}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Panel Vote:</span>
                      <span className="ml-2 font-medium">{item.result.panelVotes}</span>
                    </div>
                    {item.result.yourAvgScore !== null && (
                      <div>
                        <span className="text-muted-foreground">Your Team Score:</span>
                        <span className="ml-2 font-medium">{item.result.yourAvgScore?.toFixed(1)}</span>
                      </div>
                    )}
                    {item.result.opponentAvgScore !== null && (
                      <div>
                        <span className="text-muted-foreground">Opponent Score:</span>
                        <span className="ml-2 font-medium">{item.result.opponentAvgScore?.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Team Feedback */}
              {item.teamFeedback && (
                <div>
                  <h4 className="font-medium mb-2">Team Feedback</h4>
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {item.teamFeedback}
                  </div>
                </div>
              )}

              {/* General Comments */}
              {item.generalComments && (
                <div>
                  <h4 className="font-medium mb-2">General Comments</h4>
                  <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {item.generalComments}
                  </div>
                </div>
              )}

              {/* Speaker Scores */}
              {item.speakerScores && item.speakerScores.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Speaker Scores</h4>
                  <div className="space-y-2">
                    {item.speakerScores.map((score: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between border rounded p-3"
                      >
                        <div>
                          <div className="font-medium">
                            {score.role.replace(/_/g, " ")}
                          </div>
                          {score.feedback && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {score.feedback}
                            </div>
                          )}
                        </div>
                        {score.totalScore !== null && (
                          <Badge variant="secondary" className="text-lg">
                            {score.totalScore}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Submitted: {new Date(item.submittedAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
