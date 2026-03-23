import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/** Routes that require authentication — everything else is public. */
const isProtectedRoute = createRouteMatcher([
  '/',                      // Dashboard (personal)
  '/me(.*)',                // Profile
  '/institutions(.*)',      // Institution pages
  '/tournaments/new',      // Create tournament
  '/ballots(.*)',           // Ballot management
  '/admin(.*)',             // Admin panel
  '/judging(.*)',           // Judge assignments
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // Forward pathname so server layouts can read it
  const response = NextResponse.next()
  response.headers.set('x-pathname', req.nextUrl.pathname)
  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
