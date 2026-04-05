function addDefaultProtocol(value: string): string {
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value)) {
    return value;
  }

  const isLocalhost =
    value.startsWith('localhost') ||
    value.startsWith('127.0.0.1') ||
    value.startsWith('[::1]');

  return `${isLocalhost ? 'http' : 'https'}://${value}`;
}

function normalizeConfiguredBaseUrl(value: string): string {
  const trimmed = value.trim();
  const normalizedInput = addDefaultProtocol(trimmed);
  const url = new URL(normalizedInput);

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

export function buildRoundFeedbackLink(
  tournamentId: string,
  roundId: string
): string {
  const baseUrl = getCanonicalBaseUrl();
  return `${baseUrl}/tournaments/${encodeURIComponent(
    tournamentId
  )}/feedback/${encodeURIComponent(roundId)}`;
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
