'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TournamentTeam {
  id: string;
  name: string;
  teamNumber: number;
  institutionId: string;
  institution: {
    id: string;
    name: string;
  };
  participations: any[];
  _count: {
    participations: number;
  };
}

interface InstitutionOption {
  id: string;
  name: string;
}

interface TournamentTeamsProps {
  tournamentId: string;
  teams: TournamentTeam[];
  institutions: InstitutionOption[];
  onTeamCreated: () => void;
}

export default function TournamentTeams({
  tournamentId,
  teams,
  institutions,
  onTeamCreated,
}: TournamentTeamsProps) {
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTeam(true);
    setError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: selectedInstitutionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create team');
      }

      toast.success('Team created successfully');
      setIsCreateTeamOpen(false);
      setSelectedInstitutionId('');
      onTeamCreated();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tournament Teams</CardTitle>
            <CardDescription>
              Teams registered for this tournament
            </CardDescription>
          </div>
          <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
                <DialogDescription>
                  Create a new team for your institution in this tournament
                </DialogDescription>
              </DialogHeader>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="institution">
                    Institution <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedInstitutionId}
                    onValueChange={setSelectedInstitutionId}
                    disabled={isCreatingTeam}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    You must be a coach of the institution
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isCreatingTeam || !selectedInstitutionId}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    {isCreatingTeam ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Team'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateTeamOpen(false);
                      setError(null);
                    }}
                    disabled={isCreatingTeam}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground">
              Create the first team to get started
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Members</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.institution.name}</TableCell>
                  <TableCell>{team._count.participations}</TableCell>
                  <TableCell>
                    <Link href={`/tournament-teams/${team.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
