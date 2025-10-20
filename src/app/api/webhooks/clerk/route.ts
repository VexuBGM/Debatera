import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;
if (!WEBHOOK_SECRET) console.warn('CLERK_WEBHOOK_SECRET not set');

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
    console.log('Clerk webhook OK:', event.type);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Webhook verify failed', e);
    return new NextResponse('Invalid signature', { status: 400 });
  }
}
