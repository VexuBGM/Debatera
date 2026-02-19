import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

type RateEntry = { count: number; resetAt: number }
const rateStore = new Map<string, RateEntry>()

async function hashTokenPrefix(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(digest))
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 8)
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  return realIp ?? 'unknown'
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateStore.get(key)
  if (!entry || entry.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) return true

  entry.count += 1
  return false
}

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/clerk-sync-keyless(.*)',
  '/api(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  // Rate limit guest token URLs
  const pathname = req.nextUrl.pathname
  const match = pathname.match(/^\/tournaments\/[^/]+\/p\/([^/]+)(?:\/.*)?$/)
  if (match) {
    const token = match[1]
    const prefix = await hashTokenPrefix(token)
    const ip = getClientIp(req)
    const key = `guest:${ip}:${prefix}`

    if (isRateLimited(key)) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}