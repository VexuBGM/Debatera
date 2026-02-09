'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wand2 } from 'lucide-react';
import { autoAllocateVenuesAction } from '@/actions/venues.actions';
import { toast } from 'sonner';

interface Round {
  id: string;
  number: number;
  name: string;
  status: string;
}

interface AutoAllocateDialogProps {
  rounds: Round[];
}

export function AutoAllocateDialog({ rounds }: AutoAllocateDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [allocating, setAllocating] = useState(false);

  async function handleAllocate() {
    if (!selectedRoundId) {
      toast.error('Please select a round');
      return;
    }

    setAllocating(true);
    try {
      const result = await autoAllocateVenuesAction(selectedRoundId);

      if (!result.success) {
        toast.error(result.error || 'Failed to auto-allocate venues');
        return;
      }

      const data = result.data!;

      // Show warnings if any
      for (const warning of data.warnings) {
        toast.warning(warning);
      }

      toast.success(
        `Allocated ${data.allocatedCount} venue(s) to ${data.totalDebates} debate(s)`
      );
      setOpen(false);
      setSelectedRoundId('');
    } catch {
      toast.error('Failed to auto-allocate venues');
    } finally {
      setAllocating(false);
    }
  }

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedRoundId(''); }}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={rounds.length === 0}>
          <Wand2 className="h-4 w-4 mr-2" />
          Auto-Allocate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-Allocate Venues</DialogTitle>
          <DialogDescription>
            Automatically assign venues to debates in a round. Highest-priority
            venues are assigned to the most important debates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="round-select">Select Round</Label>
            <Select value={selectedRoundId} onValueChange={setSelectedRoundId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a round..." />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((round) => (
                  <SelectItem key={round.id} value={round.id}>
                    {round.name} ({round.status.toLowerCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRound && (
            <div className="rounded-md border p-3 bg-muted/50 text-sm text-muted-foreground">
              <p>
                This will assign active venues to all non-BYE debates in{' '}
                <strong>{selectedRound.name}</strong>, replacing any existing
                venue assignments for that round.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setSelectedRoundId(''); }}>
            Cancel
          </Button>
          <Button onClick={handleAllocate} disabled={allocating || !selectedRoundId}>
            {allocating ? 'Allocating...' : 'Allocate Venues'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
