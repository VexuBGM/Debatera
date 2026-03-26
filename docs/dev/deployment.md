# Deployment

## Runtime Requirements

| Requirement | Notes |
|---|---|
| Node.js >= 20.9.0 | Required by Next.js 16 |
| PostgreSQL >= 14 | Primary database |
| Clerk account | Auth provider (required) |
| Stream account | Required for ONLINE debate mode only |

All API routes use `export const runtime = 'nodejs'` — the Edge Runtime is not supported. Deployments must support Node.js server execution (not edge-only platforms).

---

## Build Process

```bash
npm run build
# Equivalent to:
prisma migrate deploy && next build --turbopack
```

`prisma migrate deploy` runs **before** the Next.js build. It applies any pending migrations without generating new ones. This means:
- Migrations must be committed to the repository before deployment.
- Never use `prisma migrate dev` in a production environment.

---

## Environment Variables (Production)

All variables from `.env.example` must be set. Critical production-specific considerations:

| Variable | Production note |
|---|---|
| `DATABASE_URL` | Use a connection pooler (e.g., PgBouncer or managed pool). Prisma uses a `pg` pool internally, but serverless deployments benefit from an external pooler. Add SSL parameters as required by your provider. |
| `NEXT_PUBLIC_BASE_URL` | Must be the exact public URL of the app (including protocol). Used to construct judge portal links. Wrong value = broken portal links. |
| `CLERK_WEBHOOK_SECRET` | Must be set. Without it, webhook signature verification is skipped, accepting any incoming request to `/api/webhooks/clerk`. |
| `PORTAL_TOKEN_TTL_DAYS` | Defaults to 14. Adjust if tournament durations differ. |

---

## Database Migrations

**Before each deployment:**
- `prisma migrate deploy` is run automatically by `npm run build`.
- Verify migrations in `prisma/migrations/` are committed and tested in a staging environment first.

**Zero-downtime migrations:**
- Prisma does not handle zero-downtime migrations automatically.
- Additive changes (new nullable columns, new tables) are generally safe.
- Destructive changes (dropping columns, changing types) require careful sequencing.
- For breaking changes: add the new column → deploy → backfill → drop the old column in a subsequent deploy.

**Backfill scripts:**
- `scripts/backfill-user-names.ts` — run with `npm run backfill:user-names`. Safe to run multiple times (idempotent).
- Run backfill scripts manually via the production server or a migration job, not as part of the automated build.

---

## Clerk Configuration

In the Clerk dashboard:
1. Set allowed redirect URLs to your production domain.
2. Register the webhook endpoint: `https://<your-domain>/api/webhooks/clerk`.
3. Enable events: `user.created`, `user.updated`, `user.deleted`.
4. Copy the webhook signing secret to `CLERK_WEBHOOK_SECRET`.

---

## Stream Configuration

In the Stream dashboard:
1. Create a project with **Video & Audio** enabled.
2. Set `NEXT_PUBLIC_STREAM_API_KEY` and `STREAM_API_SECRET`.
3. Stream calls are created on-demand — no pre-configuration of individual calls is needed.

---

## Hosting Considerations

**Vercel / similar serverless platforms:**
- Supported. All API routes are Node.js runtime.
- Connection pooling: Prisma's built-in pool may exhaust connections on serverless cold starts. Use an external pooler (PgBouncer, Supabase pooler, Neon serverless driver) if connection limits are a concern.
- `npm run build` (which runs `prisma migrate deploy`) runs at build time in Vercel's build step automatically.

**Self-hosted (Docker/VPS):**
- Build the app: `npm run build`.
- Start: `npm run start`.
- Ensure PostgreSQL is accessible from the app server.
- Use a process manager (PM2, systemd) to keep the process running.

---

## No Seed Data in Production

There is no `prisma/seed.ts`. Production databases start empty. All data is created through the application.

---

## Post-Deployment Verification

After deploying:
1. Sign in and verify Clerk authentication works.
2. Create a test tournament and verify the settings page loads.
3. Check `/api/notifications` returns a valid response (not 500).
4. If ONLINE mode: create a test tournament with `eventMode = ONLINE` and verify the Stream call page loads.
5. Generate a judge portal link and verify it opens without a Clerk session.

---

## Known Production Gaps

- **Rate limiting not active.** `src/lib/security/rateLimit.ts` exists but is not wired to any route. High-traffic endpoints (especially `/api/stream/token`) are unprotected against abuse.
- **No health check endpoint.** Add one if your hosting platform requires it.
- **Notification polling.** Clients poll `/api/notifications` every 30 seconds. On a deployment with many concurrent users, this creates steady background load.
