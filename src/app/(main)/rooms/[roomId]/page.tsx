'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Video, Trophy, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface RoomInfo {
  id: string;
  streamCallId: string;
  matchId: string;
  match: {
    id: string;
    round: {
      id: string;
      number: number;
      tournament: {
        id: string;
        name: string;
      };
    };
    affRegistration: {
      id: string;
      institution: { id: string; name: string };
    };
    negRegistration: {
      id: string;
      institution: { id: string; name: string };
    } | null;
    feedback: Array<{
      id: string;
      judgeUserId: string;
      winner: string;
    }>;
  };
  canAccess: boolean;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Feedback form state
  const [winner, setWinner] = useState<'AFF' | 'NEG' | 'NONE'>('NONE');
  const [affFeedback, setAffFeedback] = useState('');
  const [negFeedback, setNegFeedback] = useState('');

  const roomId = params.roomId as string;

  useEffect(() => {
    fetchRoom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Room not found');
          router.push('/tournaments');
          return;
        }
        throw new Error('Failed to fetch room');
      }
      const data = await response.json();
      setRoom(data);
      
      // Check if current user already submitted feedback
      if (data.match?.feedback?.some((f: { judgeUserId: string }) => f.judgeUserId === userId)) {
        setFeedbackSubmitted(true);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner,
          affFeedback: affFeedback.trim() || undefined,
          negFeedback: negFeedback.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      toast.success('Feedback submitted successfully!');
      setFeedbackSubmitted(true);
      fetchRoom(); // Refresh to show updated data
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!room) {
    return null;
  }

  const isBye = !room.match.negRegistration;

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link href={`/tournaments/${room.match.round.tournament.id}/rounds/${room.match.round.number}`}>
          <Button variant="ghost" size="sm" className="mb-3 sm:mb-4 -ml-2 sm:-ml-3 h-8 sm:h-9 text-sm">
            <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Back to Round {room.match.round.number}
          </Button>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-500 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Debate Room</h1>
            <p className="text-sm text-muted-foreground">
              {room.match.round.tournament.name} - Round {room.match.round.number}
            </p>
          </div>
        </div>
      </div>

      {/* Match Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <div className="text-center">
              <Badge className="bg-green-600 mb-2">AFF</Badge>
              <p className="font-semibold text-lg">{room.match.affRegistration.institution.name}</p>
            </div>
            <div className="text-2xl font-bold text-muted-foreground">vs</div>
            {isBye ? (
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">BYE</Badge>
                <p className="text-muted-foreground">No opponent</p>
              </div>
            ) : (
              <div className="text-center">
                <Badge className="bg-orange-600 mb-2">NEG</Badge>
                <p className="font-semibold text-lg">{room.match.negRegistration!.institution.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Join Call Button */}
      {room.canAccess && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Call
            </CardTitle>
            <CardDescription>Join the debate video call</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/debate/${room.id}`}>
              <Button className="bg-cyan-500 hover:bg-cyan-600 w-full sm:w-auto">
                <Video className="mr-2 h-4 w-4" />
                Join Video Call
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Feedback Form */}
      {!isBye && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Judge Feedback</CardTitle>
            <CardDescription>
              {feedbackSubmitted 
                ? 'You have already submitted feedback for this match.'
                : 'Submit your feedback and decision for this debate.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feedbackSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Feedback Submitted</p>
                <p className="text-muted-foreground mt-2">
                  Thank you for judging this debate.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                {/* Winner Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Winner *</Label>
                  <RadioGroup value={winner} onValueChange={(v) => setWinner(v as 'AFF' | 'NEG' | 'NONE')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AFF" id="aff" />
                      <Label htmlFor="aff" className="cursor-pointer">
                        <Badge className="bg-green-600 mr-2">AFF</Badge>
                        {room.match.affRegistration.institution.name}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NEG" id="neg" />
                      <Label htmlFor="neg" className="cursor-pointer">
                        <Badge className="bg-orange-600 mr-2">NEG</Badge>
                        {room.match.negRegistration!.institution.name}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NONE" id="none" />
                      <Label htmlFor="none" className="cursor-pointer">No decision / Draw</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* AFF Feedback */}
                <div className="space-y-2">
                  <Label htmlFor="affFeedback">
                    Feedback for {room.match.affRegistration.institution.name} (AFF)
                  </Label>
                  <Textarea
                    id="affFeedback"
                    value={affFeedback}
                    onChange={(e) => setAffFeedback(e.target.value)}
                    placeholder="Optional feedback for the affirmative team..."
                    rows={3}
                    maxLength={2000}
                    disabled={isSubmitting}
                  />
                </div>

                {/* NEG Feedback */}
                <div className="space-y-2">
                  <Label htmlFor="negFeedback">
                    Feedback for {room.match.negRegistration!.institution.name} (NEG)
                  </Label>
                  <Textarea
                    id="negFeedback"
                    value={negFeedback}
                    onChange={(e) => setNegFeedback(e.target.value)}
                    placeholder="Optional feedback for the negative team..."
                    rows={3}
                    maxLength={2000}
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
