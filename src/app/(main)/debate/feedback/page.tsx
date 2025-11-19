"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FeedbackViewer } from "@/components/tournaments/FeedbackViewer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";

export default function FeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const tournamentId = searchParams.get("tournamentId");

  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState<string>("");

  useEffect(() => {
    if (teamId) {
      loadTeamInfo();
    }
  }, [teamId]);

  const loadTeamInfo = async () => {
    try {
      setLoading(true);
      // You might want to create an API endpoint to get team info
      // For now, we'll just set loading to false
      setTeamName("Your Team");
    } catch (err) {
      console.error("Error loading team info:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!teamId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>No team specified</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Feedback & Results</h1>
        <p className="text-muted-foreground mt-2">
          View your debate results and judge feedback
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : (
        <FeedbackViewer teamId={teamId} tournamentId={tournamentId || undefined} />
      )}
    </div>
  );
}
