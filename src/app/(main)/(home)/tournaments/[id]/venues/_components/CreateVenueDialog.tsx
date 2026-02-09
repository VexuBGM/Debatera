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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { createVenue, createVenueCategory } from '@/actions/venues.actions';
import { toast } from 'sonner';

interface VenueCategoryOption {
  id: string;
  name: string;
  description: string | null;
}

interface CreateVenueDialogProps {
  tournamentId: string;
  categories: VenueCategoryOption[];
  onCreated: () => void;
  onCategoryCreated: () => void;
}

export function CreateVenueDialog({
  tournamentId,
  categories,
  onCreated,
  onCategoryCreated,
}: CreateVenueDialogProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(100);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Inline category creation
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  function resetForm() {
    setName('');
    setPriority(100);
    setSelectedCategoryIds([]);
    setNewCategoryName('');
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const result = await createVenueCategory(tournamentId, newCategoryName.trim());
      if (!result.success) {
        toast.error(result.error || 'Failed to create category');
        return;
      }
      toast.success(`Category "${result.data!.name}" created`);
      setNewCategoryName('');
      // Auto-select the new category
      setSelectedCategoryIds((prev) => [...prev, result.data!.id]);
      onCategoryCreated();
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('Venue name is required');
      return;
    }

    setCreating(true);
    try {
      const result = await createVenue({
        tournamentId,
        name: name.trim(),
        priority,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create venue');
        return;
      }

      toast.success(`Venue "${result.data!.name}" created`);
      resetForm();
      setOpen(false);
      onCreated();
    } catch {
      toast.error('Failed to create venue');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Venue</DialogTitle>
          <DialogDescription>
            Add a physical room or location for debates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="venue-name">Name</Label>
            <Input
              id="venue-name"
              placeholder='e.g., "Room 101", "Main Hall"'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div className="grid gap-2">
            <Label htmlFor="venue-priority">Priority</Label>
            <Input
              id="venue-priority"
              type="number"
              min={0}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority = better room. Used for auto-allocation (best rooms → top debates).
            </p>
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
                No categories yet. Create one below.
              </p>
            )}

            {/* Inline create category */}
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="New category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
              >
                {creatingCategory ? '...' : 'Add'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating || !name.trim()}>
            {creating ? 'Creating...' : 'Create Venue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
