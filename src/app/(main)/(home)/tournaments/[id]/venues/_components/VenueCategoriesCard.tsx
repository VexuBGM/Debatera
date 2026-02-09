'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tags, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { deleteVenueCategory, createVenueCategory } from '@/actions/venues.actions';
import { toast } from 'sonner';

interface VenueCategoryOption {
  id: string;
  name: string;
  description: string | null;
}

interface VenueCategoriesCardProps {
  tournamentId: string;
  categories: VenueCategoryOption[];
  isAdmin: boolean;
  onRefresh: () => void;
}

export function VenueCategoriesCard({
  tournamentId,
  categories,
  isAdmin,
  onRefresh,
}: VenueCategoriesCardProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await createVenueCategory(tournamentId, newName.trim());
      if (!result.success) {
        toast.error(result.error || 'Failed to create category');
        return;
      }
      toast.success(`Category "${result.data!.name}" created`);
      setNewName('');
      onRefresh();
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(categoryId: string, categoryName: string) {
    setDeletingId(categoryId);
    try {
      const result = await deleteVenueCategory(categoryId);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete category');
        return;
      }
      toast.success(`Category "${categoryName}" deleted`);
      onRefresh();
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4" />
          Venue Categories
        </CardTitle>
        <CardDescription>
          Tags for grouping venues (e.g., &quot;Wheelchair Accessible&quot;, &quot;Building A&quot;).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1">
                <Badge variant="outline">
                  {cat.name}
                  {isAdmin && (
                    <button
                      className="ml-1 hover:text-destructive disabled:opacity-50"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={deletingId === cat.id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        )}

        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="New category name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              {creating ? '...' : 'Add'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
