'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { persistPortalToken } from '@/lib/portal/clientToken';

export default function LegacyPortalBallotTokenPage() {
  const params = useParams<{ id: string; token: string; ballotId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params?.id || !params?.token || !params?.ballotId) return;

    persistPortalToken(params.id, params.token);
    router.replace(`/tournaments/${params.id}/p/ballots/${params.ballotId}`);
  }, [params?.ballotId, params?.id, params?.token, router]);

  return null;
}
