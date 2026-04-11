import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
}));

vi.hoisted(() => {
  process.env.CLERK_WEBHOOK_SECRET = 'whsec_test';
});

vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(function Webhook() {
    return {
      verify: mockVerify,
    };
  }),
}));

import { POST } from '@/app/api/webhooks/clerk/route';

function createWebhookRequest(headers: HeadersInit = {}) {
  return new NextRequest('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'user.created' }),
  });
}

describe('Clerk webhook validation security', () => {
  it('accepts a payload only after Svix verification succeeds', async () => {
    mockVerify.mockReturnValue({ type: 'user.created' });

    const response = await POST(
      createWebhookRequest({
        'svix-id': 'msg_test',
        'svix-timestamp': '1700000000',
        'svix-signature': 'v1,test',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockVerify).toHaveBeenCalledWith(
      JSON.stringify({ type: 'user.created' }),
      {
        'svix-id': 'msg_test',
        'svix-timestamp': '1700000000',
        'svix-signature': 'v1,test',
      }
    );
  });

  it('rejects invalid or missing Svix signatures', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const response = await POST(createWebhookRequest());

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Invalid signature');
  });
});
