'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface RosterEntry {
  id: string;
  createdAt: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    emailNormalized: string | null;
    claimed: boolean;
  };
}

export default function InstitutionRosterPage() {
  const params = useParams<{ id: string }>();
  const institutionId = params?.id;
  const router = useRouter();

  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!institutionId) return;
    void loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function loadRoster() {
    try {
      setLoading(true);
      const res = await fetch(`/api/institutions/${institutionId}/roster`);
      if (res.status === 403) {
        toast.error('You are not authorized to view this roster.');
        router.push(`/institutions/${institutionId}`);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load roster');
      setEntries(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPerson() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/institutions/${institutionId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() ? email.trim() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add roster person');

      toast.success('Roster person added');
      setFirstName('');
      setLastName('');
      setEmail('');
      await loadRoster();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add roster person');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/institutions/${institutionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Institution Roster</h1>
          <p className="text-sm text-muted-foreground">Manage unregistered participants for this institution.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Roster Person</CardTitle>
          <CardDescription>Create a person record without requiring a user account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleAddPerson} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? 'Adding...' : 'Add to Roster'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
          <CardDescription>People available to be added to tournaments.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading roster...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{`${entry.person.firstName} ${entry.person.lastName}`.trim()}</TableCell>
                    <TableCell>{entry.person.emailNormalized ?? '—'}</TableCell>
                    <TableCell>
                      {entry.person.claimed ? (
                        <Badge variant="secondary">Claimed</Badge>
                      ) : (
                        <Badge variant="outline">Unclaimed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
