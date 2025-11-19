"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Loader from "@/components/Loader";
import { SpeakerRole, BallotStatus } from "@prisma/client";

interface SpeakerScoreData {
  userId: string;
  teamId: string;
  role: SpeakerRole;
  name: string;
  totalScore?: number;
  feedback?: string;
}

interface BallotFormProps {
  pairingId: string;
  pairing: any;
  ballotId?: string;
  onSubmit?: () => void;
}

export function BallotForm({ pairingId, pairing, ballotId, onSubmit }: BallotFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ballot state
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [propFeedback, setPropFeedback] = useState("");
  const [oppFeedback, setOppFeedback] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [privateComments, setPrivateComments] = useState("");
  const [speakerScores, setSpeakerScores] = useState<SpeakerScoreData[]>([]);
  const [status, setStatus] = useState<BallotStatus>(BallotStatus.NOT_STARTED);

  // Load existing ballot if editing
  useEffect(() => {
    if (ballotId) {
      loadBallot();
    } else {
      initializeSpeakerScores();
    }
  }, [ballotId, pairing]);

  const loadBallot = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ballots/${ballotId}`);
      if (!response.ok) throw new Error("Failed to load ballot");

      const ballot = await response.json();
      setWinnerTeamId(ballot.winnerTeamId);
      setPropFeedback(ballot.propFeedback || "");
      setOppFeedback(ballot.oppFeedback || "");
      setGeneralComments(ballot.generalComments || "");
      setPrivateComments(ballot.privateComments || "");
      setStatus(ballot.status);

      // Load speaker scores and match with participant names
      const scores = ballot.speakerScores.map((s: any) => {
        // Find the participant to get their name
        const participant = pairing?.participants?.find(
          (p: any) => p.userId === s.userId && p.role === s.role
        );
        const userName = participant?.user?.username || participant?.user?.email || "Unknown Speaker";
        
        return {
          userId: s.userId,
          teamId: s.teamId,
          role: s.role,
          name: userName,
          totalScore: s.totalScore,
          feedback: s.feedback || "",
        };
      });
      setSpeakerScores(scores);
    } catch (err) {
      console.error("Error loading ballot:", err);
      setError("Failed to load ballot");
    } finally {
      setLoading(false);
    }
  };

  const initializeSpeakerScores = () => {
    if (!pairing?.participants) return;

    const scores: SpeakerScoreData[] = [];
    const speakerParticipants = pairing.participants.filter(
      (p: any) => p.role !== SpeakerRole.JUDGE
    );

    speakerParticipants.forEach((participant: any) => {
      const userName = participant.user?.username || participant.user?.email || "Unknown Speaker";
      scores.push({
        userId: participant.userId,
        teamId: participant.teamId,
        role: participant.role,
        name: userName,
        totalScore: undefined,
        feedback: "",
      });
    });

    setSpeakerScores(scores);
  };

  const handleScoreChange = (index: number, score: number) => {
    const newScores = [...speakerScores];
    newScores[index].totalScore = score;
    setSpeakerScores(newScores);
  };

  const handleFeedbackChange = (index: number, feedback: string) => {
    const newScores = [...speakerScores];
    newScores[index].feedback = feedback;
    setSpeakerScores(newScores);
  };

  const saveDraft = async () => {
    await saveBallot(BallotStatus.DRAFT);
  };

  const submitBallot = async () => {
    // Validate required fields
    if (!winnerTeamId) {
      setError("Please select a winning team");
      return;
    }

    const missingScores = speakerScores.filter((s) => s.totalScore === undefined);
    if (missingScores.length > 0) {
      setError("Please enter scores for all speakers");
      return;
    }

    // Check for score conflicts
    const propScores = speakerScores.filter((s) => s.teamId === pairing.propTeamId);
    const oppScores = speakerScores.filter((s) => s.teamId === pairing.oppTeamId);

    const propTotal = propScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const oppTotal = oppScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);

    if (
      (winnerTeamId === pairing.propTeamId && propTotal < oppTotal) ||
      (winnerTeamId === pairing.oppTeamId && oppTotal < propTotal)
    ) {
      const proceed = confirm(
        "The team with higher total points is different from your selected winner. Are you sure you want to proceed?"
      );
      if (!proceed) return;
    }

    await saveBallot(BallotStatus.SUBMITTED);
  };

  const saveBallot = async (newStatus: BallotStatus) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/ballots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairingId,
          winnerTeamId,
          propFeedback,
          oppFeedback,
          generalComments,
          privateComments,
          speakerScores: speakerScores.map((s) => ({
            userId: s.userId,
            teamId: s.teamId,
            role: s.role,
            totalScore: s.totalScore,
            feedback: s.feedback,
          })),
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save ballot");
      }

      setStatus(newStatus);
      setSuccess(
        newStatus === BallotStatus.SUBMITTED
          ? "Ballot submitted successfully!"
          : "Draft saved successfully!"
      );

      if (newStatus === BallotStatus.SUBMITTED && onSubmit) {
        setTimeout(() => onSubmit(), 1500);
      }
    } catch (err: any) {
      console.error("Error saving ballot:", err);
      setError(err.message || "Failed to save ballot");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  const isSubmitted = status === BallotStatus.SUBMITTED || status === BallotStatus.CONFIRMED;
  const isLocked = status === BallotStatus.CONFIRMED || status === BallotStatus.VOIDED;

  return (
    <div className="space-y-6">
      {/* Context Header */}
      <Card>
        <CardHeader>
          <CardTitle>Debate Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong>Tournament:</strong> {pairing.round?.tournament?.name}
          </div>
          <div>
            <strong>Round:</strong> {pairing.round?.name || `Round ${pairing.round?.number}`}
          </div>
          {pairing.round?.motion && (
            <div>
              <strong>Motion:</strong> {pairing.round.motion}
            </div>
          )}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Badge variant="outline" className="mb-2">Proposition</Badge>
              <div className="font-medium">
                {pairing.propTeam?.name} ({pairing.propTeam?.institution?.name})
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-2">Opposition</Badge>
              <div className="font-medium">
                {pairing.oppTeam?.name} ({pairing.oppTeam?.institution?.name})
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {isSubmitted && (
        <Alert>
          <AlertDescription>
            This ballot has been submitted. {isLocked ? "It cannot be edited." : ""}
          </AlertDescription>
        </Alert>
      )}

      {/* Winner Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Winner Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={winnerTeamId === pairing.propTeamId ? "default" : "outline"}
              className="flex-1"
              onClick={() => !isLocked && setWinnerTeamId(pairing.propTeamId)}
              disabled={isLocked}
            >
              Proposition Wins
            </Button>
            <Button
              variant={winnerTeamId === pairing.oppTeamId ? "default" : "outline"}
              className="flex-1"
              onClick={() => !isLocked && setWinnerTeamId(pairing.oppTeamId)}
              disabled={isLocked}
            >
              Opposition Wins
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Speaker Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Speaker Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {speakerScores.length === 0 ? (
              <p className="text-muted-foreground">
                No speakers found. Make sure debaters have joined the room with their roles.
              </p>
            ) : (
              speakerScores.map((speaker, index) => {
                const teamName =
                  speaker.teamId === pairing.propTeamId
                    ? pairing.propTeam?.name
                    : pairing.oppTeam?.name;

                return (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{speaker.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {speaker.role.replace(/_/g, " ")} • {teamName}
                        </div>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="60"
                          max="80"
                          step="0.5"
                          value={speaker.totalScore || ""}
                          onChange={(e) =>
                            handleScoreChange(index, parseFloat(e.target.value))
                          }
                          placeholder="Score"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Speaker Feedback (Optional)</Label>
                      <Textarea
                        value={speaker.feedback}
                        onChange={(e) => handleFeedbackChange(index, e.target.value)}
                        placeholder="Comments for this speaker..."
                        rows={2}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Team Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Feedback for Proposition</Label>
            <Textarea
              value={propFeedback}
              onChange={(e) => setPropFeedback(e.target.value)}
              placeholder="Written feedback for the Proposition team..."
              rows={4}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label>Feedback for Opposition</Label>
            <Textarea
              value={oppFeedback}
              onChange={(e) => setOppFeedback(e.target.value)}
              placeholder="Written feedback for the Opposition team..."
              rows={4}
              disabled={isLocked}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>General Comments (Optional)</Label>
            <Textarea
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              placeholder="General observations about the debate..."
              rows={3}
              disabled={isLocked}
            />
          </div>
          <div>
            <Label>Private Comments (Optional - Only visible to tab)</Label>
            <Textarea
              value={privateComments}
              onChange={(e) => setPrivateComments(e.target.value)}
              placeholder="Private notes for the tab team..."
              rows={3}
              disabled={isLocked}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isLocked && (
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={saving || status === BallotStatus.SUBMITTED}
          >
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={submitBallot}
            disabled={saving || status === BallotStatus.SUBMITTED}
            className="flex-1"
          >
            {saving ? "Submitting..." : "Submit Ballot"}
          </Button>
        </div>
      )}
    </div>
  );
}
