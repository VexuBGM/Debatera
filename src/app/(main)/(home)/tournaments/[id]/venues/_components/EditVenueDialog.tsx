'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { updateVenue, type VenueWithCategories } from '@/actions/venues.actions';
import { toast } from 'sonner';

interface VenueCategoryOption {
  id: string;
  name: string;
  description: string | null;
}

interface EditVenueDialogProps {
  venue: VenueWithCategories | null;
  categories: VenueCategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditVenueDialog({
  venue,
  categories,
  open,
  onOpenChange,
  onUpdated,
}: EditVenueDialogProps) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(100);
  const [isActive, setIsActive] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Sync form when venue changes
  useEffect(() => {
    if (venue) {
      setName(venue.name);
      setPriority(venue.priority);
      setIsActive(venue.isActive);
      setSelectedCategoryIds(venue.categories.map((c) => c.id));
    }
  }, [venue]);

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function handleSubmit() {
    if (!venue) return;
    if (!name.trim()) {
      toast.error('Venue name is required');
      return;
    }

    setSaving(true);
    try {
      const result = await updateVenue({
        venueId: venue.id,
        name: name.trim(),
        priority,
        isActive,
        categoryIds: selectedCategoryIds,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update venue');
        return;
      }

      toast.success(`Venue "${result.data!.name}" updated`);
      onOpenChange(false);
      onUpdated();
    } catch {
      toast.error('Failed to update venue');
    } finally {
      setSaving(false);
    }
  }

  if (!venue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Venue</DialogTitle>
          <DialogDescription>
            Update venue details, priority, or status.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="edit-venue-name">Name</Label>
            <Input
              id="edit-venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div className="grid gap-2">
            <Label htmlFor="edit-venue-priority">Priority</Label>
            <Input
              id="edit-venue-priority"
              type="number"
              min={0}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority = better room.
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="edit-venue-active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive venues are excluded from auto-allocation.
              </p>
            </div>
            <Switch
              id="edit-venue-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Categories */}
          <div className="grid gap-2">
            <Label>Categories</Label>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategoryIds.includes(cat.id) ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {cat.name}
                    {selectedCategoryIds.includes(cat.id) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No categories available.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
