"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BallotForm } from "@/components/tournaments/BallotForm";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import { ArrowLeft } from "lucide-react";

export default function BallotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pairingId = searchParams.get("pairingId");

  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState<any>(null);
  const [ballot, setBallot] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pairingId) {
      loadPairing();
    }
  }, [pairingId]);

  const loadPairing = async () => {
    try {
      setLoading(true);
      
      // Load pairing details
      const pairingResponse = await fetch(`/api/debates/${pairingId}`);
      if (!pairingResponse.ok) throw new Error("Failed to load debate");
      const pairingData = await pairingResponse.json();
      setPairing(pairingData);

      // Load existing ballot for this judge (without pairingId to get only current user's ballots)
      const ballotResponse = await fetch(`/api/ballots`);
      if (ballotResponse.ok) {
        const ballots = await ballotResponse.json();
        // Find the ballot for this specific pairing
        const existingBallot = ballots.find((b: any) => b.pairingId === pairingId);
        if (existingBallot) {
          setBallot(existingBallot);
        }
      }
    } catch (err: any) {
      console.error("Error loading ballot page:", err);
      setError(err.message || "Failed to load ballot");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    router.push("/debate/your-next-round");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!pairingId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>No debate specified</p>
        <Button onClick={() => router.push("/debate/your-next-round")}>
          Go to Your Next Round
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Judge Ballot</h1>
        <p className="text-muted-foreground mt-2">
          Enter scores and feedback for this debate
        </p>
      </div>

      <BallotForm
        pairingId={pairingId}
        pairing={pairing}
        ballotId={ballot?.id}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
