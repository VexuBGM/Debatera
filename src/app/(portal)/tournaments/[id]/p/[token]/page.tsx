'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { persistPortalToken } from '@/lib/portal/clientToken';

export default function LegacyJudgePortalTokenPage() {
  const params = useParams<{ id: string; token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params?.id || !params?.token) return;

    persistPortalToken(params.id, params.token);
    router.replace(`/tournaments/${params.id}/p`);
  }, [params?.id, params?.token, router]);

  return null;
}
