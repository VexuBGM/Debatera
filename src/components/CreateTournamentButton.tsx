'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner'; // 👈 new
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(2000).optional(),
});

export default function CreateTournamentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, startTransition] = useTransition();
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleCreate = async () => {
    setErrors({});
    const parsed = formSchema.safeParse({ name, description: description || undefined });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        description: fieldErrors.description?.[0],
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/tournaments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body?.error?.message ?? 'Failed to create tournament');
          return;
        }

        setOpen(false);
        setName('');
        setDescription('');
        toast.success('Tournament created!');
        router.refresh();
      } catch (e) {
        console.error(e);
        toast.error('Something went wrong.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create tournament</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New tournament</DialogTitle>
          <DialogDescription>Enter details and create your tournament.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Autumn Open 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={4}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
