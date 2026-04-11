import { NextRequest } from 'next/server';

type JsonRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
};

export function createJsonRequest(url: string, options: JsonRequestOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new NextRequest(url, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export function createBearerRequest(url: string, token: string, options: JsonRequestOptions = {}) {
  return createJsonRequest(url, {
    ...options,
    headers: {
      ...Object.fromEntries(new Headers(options.headers).entries()),
      authorization: `Bearer ${token}`,
    },
  });
}

export async function responseJson<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
