"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Loader from "@/components/Loader";
import { BallotStatus } from "@prisma/client";
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle } from "lucide-react";

interface RoundBallotsProps {
  roundId: string;
}

export function RoundBallots({ roundId }: RoundBallotsProps) {
  const [loading, setLoading] = useState(true);
  const [pairings, setPairings] = useState<any[]>([]);
  const [ballots, setBallots] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [roundId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load pairings for this round
      const pairingsResponse = await fetch(`/api/debates?roundId=${roundId}`);
      if (!pairingsResponse.ok) throw new Error("Failed to load pairings");
      const pairingsData = await pairingsResponse.json();
      setPairings(pairingsData);

      // Load all ballots for pairings in this round
      const ballotPromises = pairingsData.map((p: any) =>
        fetch(`/api/ballots?pairingId=${p.id}`).then((r) => r.json())
      );
      const ballotsData = await Promise.all(ballotPromises);
      setBallots(ballotsData.flat());

      // Load results
      const resultsResponse = await fetch(`/api/results?roundId=${roundId}`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setResults(resultsData);
      }
    } catch (err: any) {
      console.error("Error loading round ballots:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getBallotStatusIcon = (status: BallotStatus) => {
    switch (status) {
      case BallotStatus.CONFIRMED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case BallotStatus.SUBMITTED:
        return <FileText className="h-4 w-4 text-blue-500" />;
      case BallotStatus.DRAFT:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case BallotStatus.VOIDED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getBallotStatusBadge = (status: BallotStatus) => {
    const variants: Record<BallotStatus, "default" | "secondary" | "destructive" | "outline"> = {
      [BallotStatus.CONFIRMED]: "default",
      [BallotStatus.SUBMITTED]: "secondary",
      [BallotStatus.DRAFT]: "outline",
      [BallotStatus.VOIDED]: "destructive",
      [BallotStatus.NOT_STARTED]: "outline",
    };

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getBallotStatusIcon(status)}
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const confirmBallot = async (ballotId: string) => {
    try {
      const response = await fetch(`/api/ballots/${ballotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });

      if (!response.ok) throw new Error("Failed to confirm ballot");
      await loadData();
    } catch (err: any) {
      console.error("Error confirming ballot:", err);
      setError(err.message || "Failed to confirm ballot");
    }
  };

  const calculateResult = async (pairingId: string, makeFinal: boolean = false) => {
    try {
      setProcessing(true);
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingId, isFinal: makeFinal }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to calculate result");
      }

      await loadData();
    } catch (err: any) {
      console.error("Error calculating result:", err);
      setError(err.message || "Failed to calculate result");
    } finally {
      setProcessing(false);
    }
  };

  const publishResult = async (resultId: string) => {
    try {
      const response = await fetch(`/api/results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFinal: true }),
      });

      if (!response.ok) throw new Error("Failed to publish result");
      await loadData();
    } catch (err: any) {
      console.error("Error publishing result:", err);
      setError(err.message || "Failed to publish result");
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ballots Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {pairings.map((pairing) => {
              const pairingBallots = ballots.filter((b) => b.pairingId === pairing.id);
              const result = results.find((r) => r.pairingId === pairing.id);
              const judges = pairing.judges || [];

              const submittedCount = pairingBallots.filter(
                (b) => b.status === BallotStatus.SUBMITTED || b.status === BallotStatus.CONFIRMED
              ).length;
              const totalJudges = judges.length;

              return (
                <div key={pairing.id} className="border rounded-lg p-4 space-y-4">
                  {/* Debate Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-lg">
                        {pairing.propTeam?.name} vs {pairing.oppTeam?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Room {pairing.id.slice(-8)}
                      </div>
                    </div>
                    <Badge variant={submittedCount === totalJudges ? "default" : "outline"}>
                      {submittedCount} / {totalJudges} Ballots
                    </Badge>
                  </div>

                  {/* Judges and Ballots */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judge</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {judges.map((judge: any) => {
                        const ballot = pairingBallots.find(
                          (b) => b.judgeId === judge.participation.userId
                        );

                        return (
                          <TableRow key={judge.id}>
                            <TableCell>
                              {judge.participation.user?.username || "Judge"}
                            </TableCell>
                            <TableCell>
                              {judge.isChair ? (
                                <Badge variant="secondary">Chair</Badge>
                              ) : (
                                <Badge variant="outline">Panelist</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {ballot ? (
                                getBallotStatusBadge(ballot.status)
                              ) : (
                                <Badge variant="outline">Not Started</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {ballot?.winnerTeam ? (
                                <span className="text-sm">
                                  {ballot.winnerTeam.name}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {ballot && ballot.status === BallotStatus.SUBMITTED && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => confirmBallot(ballot.id)}
                                >
                                  Confirm
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Result */}
                  {result ? (
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            Winner: {result.winnerTeam.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Panel Vote: {result.panelVotesProp}-{result.panelVotesOpp}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {result.isFinal ? (
                            <Badge>Published</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => publishResult(result.id)}
                            >
                              Publish Result
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => calculateResult(pairing.id, false)}
                        disabled={processing || submittedCount === 0}
                      >
                        Calculate Result
                      </Button>
                      <Button
                        size="sm"
                        className="ml-2"
                        onClick={() => calculateResult(pairing.id, true)}
                        disabled={processing || submittedCount !== totalJudges}
                      >
                        Calculate & Publish
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
