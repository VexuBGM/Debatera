function normalizeConfiguredBaseUrl(value: string): string {
  const trimmed = value.trim();
  const url = new URL(trimmed);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_BASE_URL must use http or https');
  }

  url.hash = '';
  url.search = '';

  return url.toString().replace(/\/$/, '');
}

export function getCanonicalBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (configuredBaseUrl) {
    return normalizeConfiguredBaseUrl(configuredBaseUrl);
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'NEXT_PUBLIC_BASE_URL must be configured before generating absolute links'
  );
}

export function buildJudgePortalLink(
  tournamentId: string,
  token: string
): string {
  const baseUrl = getCanonicalBaseUrl();
  return `${baseUrl}/tournaments/${encodeURIComponent(
    tournamentId
  )}/p#token=${encodeURIComponent(token)}`;
}
