'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Shield, Loader2, Building2, Users, Trophy, Calendar, DollarSign, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  contactInfo: string;
  entryFee: number;
  registrationType: 'OPEN' | 'APPROVAL';
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedById: string | null;
  createdAt: string;
  ownerId: string;
  _count: {
    registeredInstitutions: number;
    participations: number;
    teams: number;
  };
}

export default function AdminVerifyPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyReason, setVerifyReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(true); // true = verify, false = unverify

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/admin/tournaments/unverified');
      
      if (res.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch tournaments');
      
      const data = await res.json();
      setTournaments(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClick = (tournament: Tournament, verify: boolean) => {
    setSelectedTournament(tournament);
    setIsVerifying(verify);
    setVerifyReason('');
    setShowVerifyDialog(true);
  };

  const handleVerify = async () => {
    if (!selectedTournament) return;

    setProcessingId(selectedTournament.id);
    try {
      const res = await fetch(`/api/admin/tournaments/${selectedTournament.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified: isVerifying,
          reason: verifyReason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update verification status');
      }

      toast.success(`Tournament ${isVerifying ? 'verified' : 'unverified'} successfully`);
      setShowVerifyDialog(false);
      await fetchTournaments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const unverifiedTournaments = tournaments.filter(t => !t.isVerified);
  const verifiedTournaments = tournaments.filter(t => t.isVerified);

  if (loading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-cyan-500" />
          <h1 className="text-3xl font-bold">Tournament Verification</h1>
        </div>
        <p className="text-muted-foreground">
          Review and verify tournament registrations. Only verified tournaments are visible to all users.
        </p>
      </div>

      <Tabs defaultValue="unverified" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unverified">
            Unverified ({unverifiedTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({verifiedTournaments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unverified" className="space-y-4">
          {unverifiedTournaments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No tournaments pending verification</p>
              </CardContent>
            </Card>
          ) : (
            unverifiedTournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{tournament.name}</CardTitle>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                        {tournament.registrationType === 'APPROVAL' && (
                          <Badge variant="outline">Approval Required</Badge>
                        )}
                      </div>
                      {tournament.description && (
                        <CardDescription>{tournament.description}</CardDescription>
                      )}
                    </div>
                    <Button
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => handleVerifyClick(tournament, true)}
                      disabled={processingId === tournament.id}
                    >
                      {processingId === tournament.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Start:</span>
                      <span className="font-medium">
                        {new Date(tournament.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Entry Fee:</span>
                      <span className="font-medium">
                        {tournament.entryFee === 0 ? 'Free' : `$${tournament.entryFee.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Institutions:</span>
                      <span className="font-medium">{tournament._count.registeredInstitutions}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Participants:</span>
                      <span className="font-medium">{tournament._count.participations}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Teams:</span>
                      <span className="font-medium">{tournament._count.teams}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">Contact Information:</span>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.contactInfo}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {verifiedTournaments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No verified tournaments yet</h3>
                <p className="text-muted-foreground">Verified tournaments will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-center">Entry Fee</TableHead>
                    <TableHead className="text-center">Institutions</TableHead>
                    <TableHead className="text-center">Participants</TableHead>
                    <TableHead>Verified At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifiedTournaments.map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tournament.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(tournament.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        {tournament.entryFee === 0 ? 'Free' : `$${tournament.entryFee.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-center">{tournament._count.registeredInstitutions}</TableCell>
                      <TableCell className="text-center">{tournament._count.participations}</TableCell>
                      <TableCell>
                        {tournament.verifiedAt &&
                          new Date(tournament.verifiedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/tournaments/${tournament.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleVerifyClick(tournament, false)}
                            disabled={processingId === tournament.id}
                          >
                            {processingId === tournament.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Unverify
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isVerifying ? 'Verify Tournament' : 'Unverify Tournament'}
            </DialogTitle>
            <DialogDescription>
              {isVerifying
                ? 'Verifying this tournament will make it visible to all users and mark it as approved.'
                : 'Unverifying this tournament will hide it from public view and remove verification status.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTournament && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedTournament.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTournament.description}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Add a note about this verification action..."
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              className={isVerifying ? 'bg-green-500 hover:bg-green-600' : ''}
              variant={isVerifying ? 'default' : 'destructive'}
              disabled={processingId === selectedTournament?.id}
            >
              {processingId === selectedTournament?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isVerifying ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {isVerifying ? 'Verify' : 'Unverify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
