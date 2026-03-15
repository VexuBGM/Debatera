'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaginationControls } from '@/components/ui/pagination';
import { Edit, Trash2, MapPin } from 'lucide-react';
import { updateVenue, type VenueWithCategories } from '@/actions/venues.actions';
import { EditVenueDialog } from './EditVenueDialog';
import { DeleteVenueDialog } from './DeleteVenueDialog';
import { toast } from 'sonner';

interface VenueCategoryOption {
  id: string;
  name: string;
  description: string | null;
}

interface VenueTableProps {
  venues: VenueWithCategories[];
  categories: VenueCategoryOption[];
  isAdmin: boolean;
  onRefresh: () => void;
}

const VENUES_PAGE_SIZE = 20;

export function VenueTable({ venues, categories, isAdmin, onRefresh }: VenueTableProps) {
  // Edit dialog state
  const [editingVenue, setEditingVenue] = useState<VenueWithCategories | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Delete dialog state
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);
  const [deletingVenueName, setDeletingVenueName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Inline active toggle (optimistic)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(venues.length / VENUES_PAGE_SIZE));
  const pagedVenues = venues.slice((page - 1) * VENUES_PAGE_SIZE, page * VENUES_PAGE_SIZE);

  async function handleToggleActive(venue: VenueWithCategories) {
    setTogglingIds((prev) => new Set(prev).add(venue.id));
    try {
      const result = await updateVenue({
        venueId: venue.id,
        isActive: !venue.isActive,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to update venue');
        return;
      }
      onRefresh();
    } catch {
      toast.error('Failed to update venue');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(venue.id);
        return next;
      });
    }
  }

  function handleEdit(venue: VenueWithCategories) {
    setEditingVenue(venue);
    setEditOpen(true);
  }

  function handleDelete(venue: VenueWithCategories) {
    setDeletingVenueId(venue.id);
    setDeletingVenueName(venue.name);
    setDeleteOpen(true);
  }

  if (venues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Venues Yet</CardTitle>
          <CardDescription>
            Add venues (rooms) that debates can be assigned to.
            {isAdmin && ' Click "Add Venue" above to get started.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-50" />
            <p>No venues have been added to this tournament.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px] text-center">Priority</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead className="w-[80px] text-center">Active</TableHead>
                {isAdmin && (
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedVenues.map((venue) => (
                <TableRow
                  key={venue.id}
                  className={!venue.isActive ? 'opacity-50' : undefined}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      {venue.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{venue.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    {venue.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {venue.categories.map((cat) => (
                          <Badge key={cat.id} variant="outline" className="text-xs">
                            {cat.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {isAdmin ? (
                      <Switch
                        checked={venue.isActive}
                        onCheckedChange={() => handleToggleActive(venue)}
                        disabled={togglingIds.has(venue.id)}
                      />
                    ) : (
                      <Badge variant={venue.isActive ? 'default' : 'secondary'}>
                        {venue.isActive ? 'Yes' : 'No'}
                      </Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(venue)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(venue)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {venues.length > VENUES_PAGE_SIZE && (
        <PaginationControls
          pagination={{
            page,
            pageSize: VENUES_PAGE_SIZE,
            total: venues.length,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          }}
          onPageChange={setPage}
          className="mt-3"
        />
      )}

      {/* Edit Dialog */}
      <EditVenueDialog
        venue={editingVenue}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={onRefresh}
      />

      {/* Delete Dialog */}
      <DeleteVenueDialog
        venueId={deletingVenueId}
        venueName={deletingVenueName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onRefresh}
      />
    </>
  );
}
