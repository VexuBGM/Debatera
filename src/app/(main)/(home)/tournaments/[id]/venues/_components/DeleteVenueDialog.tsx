'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteVenue } from '@/actions/venues.actions';
import { toast } from 'sonner';

interface DeleteVenueDialogProps {
  venueId: string | null;
  venueName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteVenueDialog({
  venueId,
  venueName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteVenueDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!venueId) return;

    setDeleting(true);
    try {
      const result = await deleteVenue(venueId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete venue');
        return;
      }

      toast.success(`Venue "${venueName}" deleted`);
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error('Failed to delete venue');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Venue</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>&quot;{venueName}&quot;</strong>?
            Any debates currently assigned to this venue will have their venue
            assignment cleared.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Venue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
