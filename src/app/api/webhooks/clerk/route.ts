import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { apiLogger } from '@/lib/api-logger';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
if (!WEBHOOK_SECRET) apiLogger.warn('CLERK_WEBHOOK_SECRET not set');

export const runtime = 'nodejs'; // required for svix crypto

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const headers = {
      'svix-id': req.headers.get('svix-id')!,
      'svix-timestamp': req.headers.get('svix-timestamp')!,
      'svix-signature': req.headers.get('svix-signature')!,
    };

    const wh = new Webhook(WEBHOOK_SECRET);
    const event = wh.verify(payload, headers) as any;

    // DEV MODE: just log & ack. No DB write because DB is local.
    apiLogger.info('Clerk webhook received', { eventType: event.type });
    return NextResponse.json({ ok: true });
  } catch (e) {
    apiLogger.error('Webhook verify failed', e);
    return new NextResponse('Invalid signature', { status: 400 });
  }
}
