import { expect } from 'vitest';

export async function expectJsonError(response: Response, status: number, message?: string) {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body).toHaveProperty('error');
  if (message) expect(String(body.error)).toContain(message);
  return body;
}
