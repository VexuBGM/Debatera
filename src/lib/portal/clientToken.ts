'use client';

import { useEffect, useState } from 'react';

function getStorageKey(tournamentId: string): string {
  return `debatera:portal-token:${tournamentId}`;
}

function readTokenFromHash(hash: string): string | null {
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!rawHash) return null;

  const params = new URLSearchParams(rawHash);
  const namedToken = params.get('token');
  if (namedToken) return namedToken;

  return rawHash;
}

export function persistPortalToken(tournamentId: string, token: string): void {
  window.sessionStorage.setItem(getStorageKey(tournamentId), token);
}

export function clearPortalToken(tournamentId: string): void {
  window.sessionStorage.removeItem(getStorageKey(tournamentId));
}

export function getStoredPortalToken(tournamentId: string): string | null {
  return window.sessionStorage.getItem(getStorageKey(tournamentId));
}

export function usePortalToken(tournamentId?: string) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;

    const tokenFromHash = readTokenFromHash(window.location.hash);
    if (tokenFromHash) {
      persistPortalToken(tournamentId, tokenFromHash);
      window.history.replaceState(
        window.history.state,
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
      setToken(tokenFromHash);
      setReady(true);
      return;
    }

    setToken(getStoredPortalToken(tournamentId));
    setReady(true);
  }, [tournamentId]);

  return {
    token,
    ready,
    clearToken: () => {
      if (!tournamentId) return;
      clearPortalToken(tournamentId);
      setToken(null);
    },
  };
}
