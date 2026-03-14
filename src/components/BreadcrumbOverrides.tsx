'use client';

import { createContext, useCallback, useContext, useRef, useSyncExternalStore } from 'react';

type Listener = () => void;

/**
 * A simple store that lets child components register display labels
 * for URL segments (e.g. mapping a round ID to its name).
 * Uses useSyncExternalStore so Breadcrumbs re-renders when overrides change.
 */
function createOverrideStore() {
  let overrides: Record<string, string> = {};
  const listeners = new Set<Listener>();

  return {
    getSnapshot: () => overrides,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (segment: string, label: string) => {
      if (overrides[segment] === label) return;
      overrides = { ...overrides, [segment]: label };
      listeners.forEach((l) => l());
    },
  };
}

type OverrideStore = ReturnType<typeof createOverrideStore>;

const BreadcrumbOverridesCtx = createContext<OverrideStore | null>(null);

export function BreadcrumbOverridesProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<OverrideStore | null>(null);
  if (!storeRef.current) storeRef.current = createOverrideStore();

  return (
    <BreadcrumbOverridesCtx.Provider value={storeRef.current}>
      {children}
    </BreadcrumbOverridesCtx.Provider>
  );
}

/** Read current overrides (triggers re-render on change). */
export function useBreadcrumbOverrides(): Record<string, string> {
  const store = useContext(BreadcrumbOverridesCtx);
  const empty: Record<string, string> = {};
  return useSyncExternalStore(
    store ? store.subscribe : () => () => {},
    store ? store.getSnapshot : () => empty,
    store ? store.getSnapshot : () => empty,
  );
}

/** Register a display label for a URL segment. Call from child pages. */
export function useSetBreadcrumbOverride() {
  const store = useContext(BreadcrumbOverridesCtx);
  return useCallback(
    (segment: string, label: string) => {
      store?.set(segment, label);
    },
    [store],
  );
}
