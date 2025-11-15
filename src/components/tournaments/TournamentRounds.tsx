'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Loader2, Plus, Trash2, Users, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import { PairingBoard } from './rounds/PairingBoard'

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  institution: {
    id: string;
    name: string;
  };
  participations: Array<{
    user: {
      id: string;
      username: string | null;
      email: string | null;
    };
  }>;
}

interface Judge {
  id: string; // RoundPairingJudge id
  isChair: boolean;
  participation: {
    id: string;
    user: {
      id: string;
      username: string | null;
      email: string | null;
    };
    institution: {
      id: string;
      name: string;
    } | null;
  };
}

interface JudgeParticipation {
  id: string; // participation ID
  user: {
    id: string;
    username: string | null;
    email: string | null;
  };
  institution: {
    id: string;
    name: string;
  } | null;
}

interface RoundPairing {
  id: string;
  propTeam: TournamentTeam | null;
  oppTeam: TournamentTeam | null;
  judges: Judge[];
  scheduledAt: string | null;
}

interface Round {
  id: string;
  number: number;
  name: string;
  roundPairings: RoundPairing[];
}

interface TournamentRoundsProps {
  tournamentId: string;
  teams: TournamentTeam[];
  judges: JudgeParticipation[];
  isAdmin?: boolean;
}

// Simple read-only table view for non-admins
function ReadOnlyPairingsTable({ pairings }: { pairings: RoundPairing[] }) {
  if (pairings.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <p className="text-muted-foreground">No pairings yet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Room</TableHead>
          <TableHead>Proposition Team</TableHead>
          <TableHead className="w-12"></TableHead>
          <TableHead>Opposition Team</TableHead>
          <TableHead>Judges</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pairings.map((pairing, index) => (
          <TableRow key={pairing.id}>
            <TableCell className="font-medium">Room {index + 1}</TableCell>
            <TableCell>
              {pairing.propTeam ? (
                <div>
                  <div className="font-medium">{pairing.propTeam.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {pairing.propTeam.institution.name}
                  </div>
                  {pairing.propTeam.participations.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {pairing.propTeam.participations
                        .map((p) => p.user.username || p.user.email)
                        .join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground italic">TBD</span>
              )}
            </TableCell>
            <TableCell className="text-center font-bold text-muted-foreground">vs</TableCell>
            <TableCell>
              {pairing.oppTeam ? (
                <div>
                  <div className="font-medium">{pairing.oppTeam.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {pairing.oppTeam.institution.name}
                  </div>
                  {pairing.oppTeam.participations.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {pairing.oppTeam.participations
                        .map((p) => p.user.username || p.user.email)
                        .join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground italic">TBD</span>
              )}
            </TableCell>
            <TableCell>
              {pairing.judges.length > 0 ? (
                <div className="space-y-1">
                  {pairing.judges.map((judge) => (
                    <div key={judge.id} className="text-sm">
                      {judge.participation.user.username || judge.participation.user.email}
                      {judge.isChair && (
                        <Badge variant="default" className="ml-2 bg-purple-500 text-xs">Chair</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic text-sm">TBD</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const TournamentRounds = ({ tournamentId, teams, judges, isAdmin = false }: TournamentRoundsProps) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [isGeneratingPairings, setIsGeneratingPairings] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editingRoundName, setEditingRoundName] = useState('');
  const { userId } = useAuth();

  useEffect(() => {
    fetchRounds();
  }, [tournamentId]);

  async function fetchRounds() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rounds`);
      if (!response.ok) throw new Error('Failed to fetch rounds');
      const data = await response.json();
      setRounds(data);
      if (data.length > 0 && !selectedRound) {
        setSelectedRound(data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load rounds');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function createRound() {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to create round');

      const createdRound = await response.json();
      setRounds((prevRounds) => [...prevRounds, createdRound]);
      setSelectedRound(createdRound.id);
      toast.success('Round created successfully');
    } catch (error) {
      toast.error('Failed to create round');
      console.error(error);
    }
  }

  async function updateRoundName(roundId: string, name: string) {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) throw new Error('Failed to update round name');

      await fetchRounds();
      setEditingRoundId(null);
      toast.success('Round name updated successfully');
    } catch (error) {
      toast.error('Failed to update round name');
      console.error(error);
    }
  }

  async function deleteRound(roundId: string) {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to delete round');

      await fetchRounds();
      if (selectedRound === roundId) {
        setSelectedRound(rounds[0]?.id || null);
      }
      toast.success('Round deleted successfully');
    } catch (error) {
      toast.error('Failed to delete round');
      console.error(error);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Rounds</CardTitle>
          <CardDescription>Loading rounds...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </CardContent>
      </Card>
    );
  }

  const currentRound = rounds.find((r) => r.id === selectedRound);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tournament Rounds</CardTitle>
            <CardDescription>Manage and view the rounds of the tournament</CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={createRound} className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="mr-2 h-4 w-4" />
              Create Round
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rounds.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No rounds yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first round to start organizing the tournament
            </p>
            {isAdmin && (
              <Button onClick={createRound} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="mr-2 h-4 w-4" />
                Create First Round
              </Button>
            )}
          </div>
        ) : (
          <Tabs value={selectedRound || undefined} onValueChange={setSelectedRound} className="mt-4">
            <TabsList className="flex flex-wrap h-auto">
              {rounds.map((round) => (
                <TabsTrigger key={round.id} value={round.id} asChild className="gap-2">
                  <div className="flex items-center gap-2">
                    {editingRoundId === round.id ? (
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                        <Input
                          value={editingRoundName}
                          onChange={(e) => setEditingRoundName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateRoundName(round.id, editingRoundName);
                            } else if (e.key === 'Escape') {
                              setEditingRoundId(null);
                            }
                          }}
                          onBlur={() => {
                            if (editingRoundName !== round.name) {
                              updateRoundName(round.id, editingRoundName);
                            } else {
                              setEditingRoundId(null);
                            }
                          }}
                          className="h-6 w-32"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <span>{round.name}</span>
                        <Badge variant="secondary" className="ml-1">
                          {round.roundPairings.length}
                        </Badge>
                        {isAdmin && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button asChild variant="ghost" size="icon" className="h-5 w-5">
                              <span onClick={() => { setEditingRoundId(round.id); setEditingRoundName(round.name); }}>
                                <Edit2 className="h-3 w-3" />
                              </span>
                            </Button>
                            <Button asChild variant="ghost" size="icon" className="h-5 w-5">
                              <span onClick={() => deleteRound(round.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </span>
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            {rounds.map((round) => (
              <TabsContent key={round.id} value={round.id} className="space-y-4">
                {isAdmin ? (
                  <PairingBoard
                    roundId={round.id}
                    roundNumber={round.number}
                    roundName={round.name}
                    pairings={round.roundPairings}
                    teams={teams}
                    judges={judges}
                    tournamentId={tournamentId}
                    onRefresh={fetchRounds}
                    isGenerating={isGeneratingPairings}
                  />
                ) : (
                  <ReadOnlyPairingsTable pairings={round.roundPairings} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentRounds;