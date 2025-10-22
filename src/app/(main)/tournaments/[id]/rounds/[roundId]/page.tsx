'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Shuffle, 
  UserCheck,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface Round {
  id: string;
  number: number;
  stage: string;
  isPublished: boolean;
  debates: Debate[];
}

interface Debate {
  id: string;
  propTeam: { id: string; name: string };
  oppTeam: { id: string; name: string };
  status: string;
  winningSide: string | null;
  participants: {
    id: string;
    role: string;
    user: {
      id: string;
      username: string;
      imageUrl: string | null;
    };
  }[];
}

export default function RoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; roundId: string }>;
}) {
  const { id: tournamentId, roundId } = use(params);
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchRound();
  }, [roundId]);

  const fetchRound = async () => {
    try {
      const res = await fetch(`/api/rounds/${roundId}/draw`);
      if (res.ok) {
        const data = await res.json();
        setRound(data);
      }
    } catch (error) {
      console.error('Failed to fetch round:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDraw = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}/generate-draw`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchRound();
      }
    } catch (error) {
      console.error('Failed to generate draw:', error);
    } finally {
      setGenerating(false);
    }
  };

  const allocateJudges = async () => {
    setAllocating(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}/allocate-judges`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchRound();
      }
    } catch (error) {
      console.error('Failed to allocate judges:', error);
    } finally {
      setAllocating(false);
    }
  };

  const publishRound = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/rounds/${roundId}/publish`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchRound();
      }
    } catch (error) {
      console.error('Failed to publish round:', error);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold text-white">Round not found</h3>
            <Button
              asChild
              className="mt-4 gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Link href={`/tournaments/${tournamentId}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to Tournament
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const judges = round.debates.flatMap((debate) =>
    debate.participants.filter((p) => p.role === 'JUDGE')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 gap-2 text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href={`/tournaments/${tournamentId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Tournament
            </Link>
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">Round {round.number}</h1>
                <Badge
                  variant="outline"
                  className="border-white/20 text-white/70"
                >
                  {round.stage}
                </Badge>
                {round.isPublished ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Published
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-400">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Draft
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-white/60">
                {round.debates.length} debates • {judges.length} judges allocated
              </p>
            </div>

            {!round.isPublished && (
              <div className="flex gap-2">
                <Button
                  onClick={generateDraw}
                  disabled={generating}
                  variant="outline"
                  className="gap-2 rounded-lg border-white/20 text-white hover:bg-white/10"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shuffle className="h-4 w-4" />
                  )}
                  {generating ? 'Generating...' : 'Generate Draw'}
                </Button>
                <Button
                  onClick={allocateJudges}
                  disabled={allocating || round.debates.length === 0}
                  variant="outline"
                  className="gap-2 rounded-lg border-white/20 text-white hover:bg-white/10"
                >
                  {allocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  {allocating ? 'Allocating...' : 'Allocate Judges'}
                </Button>
                <Button
                  onClick={publishRound}
                  disabled={publishing || round.debates.length === 0}
                  className="gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {publishing ? 'Publishing...' : 'Publish Round'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Warning if no debates */}
        {round.debates.length === 0 && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div>
                <h3 className="font-medium text-yellow-400">No debates generated</h3>
                <p className="text-sm text-yellow-300/80">
                  Click "Generate Draw" to create pairings for this round
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debates Grid */}
        {round.debates.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {round.debates.map((debate, index) => {
              const debateJudges = debate.participants.filter((p) => p.role === 'JUDGE');

              return (
                <Card
                  key={debate.id}
                  className="border-white/10 bg-white/5 backdrop-blur-sm"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <span>Debate {index + 1}</span>
                      {debate.winningSide && (
                        <Badge className="bg-green-500/20 text-green-400">
                          Result: {debate.winningSide}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Teams */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
                        <div>
                          <div className="text-xs font-medium text-cyan-400">
                            PROP
                          </div>
                          <div className="text-sm font-semibold text-white">
                            {debate.propTeam.name}
                          </div>
                        </div>
                        {debate.winningSide === 'PROP' && (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex items-center justify-center text-white/40">
                        <span className="text-xs font-medium">VS</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <div>
                          <div className="text-xs font-medium text-red-400">
                            OPP
                          </div>
                          <div className="text-sm font-semibold text-white">
                            {debate.oppTeam.name}
                          </div>
                        </div>
                        {debate.winningSide === 'OPP' && (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                    </div>

                    {/* Judges */}
                    {debateJudges.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-medium text-white/70">
                          Judges
                        </div>
                        <div className="space-y-1">
                          {debateJudges.map((judge) => (
                            <div
                              key={judge.id}
                              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80"
                            >
                              <UserCheck className="h-4 w-4 text-cyan-400" />
                              {judge.user.username}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {debateJudges.length === 0 && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                        <p className="text-xs text-white/50">
                          No judges allocated
                        </p>
                      </div>
                    )}

                    {/* Debate Status */}
                    <div className="pt-2 text-center text-xs text-white/50">
                      Status: {debate.status}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        {!round.isPublished && round.debates.length > 0 && (
          <Card className="mt-6 border-cyan-500/30 bg-cyan-500/10 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-cyan-400" />
              <div>
                <h3 className="font-medium text-cyan-400">Draft Round</h3>
                <p className="text-sm text-cyan-300/80">
                  Review the pairings and judge allocations. Click "Publish Round" when ready to make it visible to participants.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
