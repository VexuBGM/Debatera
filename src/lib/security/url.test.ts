import { afterEach, describe, expect, it } from 'vitest';
import { buildJudgePortalLink, getCanonicalBaseUrl } from './url';

describe('getCanonicalBaseUrl', () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('accepts bare production domains by assuming https', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'debatera.com';

    expect(getCanonicalBaseUrl()).toBe('https://debatera.com');
  });

  it('accepts bare localhost addresses by assuming http', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'localhost:3000/';

    expect(getCanonicalBaseUrl()).toBe('http://localhost:3000');
  });

  it('rejects unsupported protocols', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'ftp://debatera.com';

    expect(() => getCanonicalBaseUrl()).toThrow(
      'NEXT_PUBLIC_BASE_URL must use http or https'
    );
  });

  it('falls back to localhost during non-production development', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NODE_ENV = 'development';

    expect(getCanonicalBaseUrl()).toBe('http://localhost:3000');
  });
});

describe('buildJudgePortalLink', () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
    }
  });

  it('builds a stable portal URL from a bare configured domain', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'www.debatera.com/';

    expect(buildJudgePortalLink('tourn_123', 'token value')).toBe(
      'https://www.debatera.com/tournaments/tourn_123/p#token=token%20value'
    );
  });
});
