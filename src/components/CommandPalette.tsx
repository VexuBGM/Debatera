'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useAuth } from '@clerk/nextjs';
import {
  Home, Compass, PlusCircle, Building2, UserCircle, Settings, Trophy,
} from 'lucide-react';

const STATIC_ACTIONS = [
  { label: 'Go Home', href: '/', icon: Home, group: 'Navigation', authRequired: true },
  { label: 'Browse Tournaments', href: '/tournaments', icon: Compass, group: 'Navigation', authRequired: false },
  { label: 'Create Tournament', href: '/tournaments/new', icon: PlusCircle, group: 'Actions', authRequired: true },
  { label: 'My Profile', href: '/me', icon: UserCircle, group: 'Navigation', authRequired: true },
  { label: 'Institutions', href: '/institutions', icon: Building2, group: 'Navigation', authRequired: true },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { userId } = useAuth();
  const isAuthenticated = !!userId;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const runAction = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const visibleActions = STATIC_ACTIONS.filter(a => !a.authRequired || isAuthenticated);
  const groups = visibleActions.reduce<Record<string, typeof visibleActions>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-lg">
        <Command className="rounded-lg border-none">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(groups).map(([group, items], i) => (
              <div key={group}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={group}>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.href}
                        onSelect={() => runAction(item.href)}
                        className="cursor-pointer"
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Expose a trigger for opening the palette from the Navbar search input */
export function useCommandPalette() {
  return {
    open: () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    },
  };
}
