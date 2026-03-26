# Integrations

## Clerk (Authentication)

**Package:** `@clerk/nextjs` v6, `@clerk/themes`
**Docs:** https://clerk.com/docs

### What it does

Clerk handles all user authentication: sign-up, sign-in, session management, OAuth, and user profile storage. Debatera does not manage passwords.

### How it's integrated

**Auth checks:** Every protected API route and server action calls:
```typescript
const { userId } = await auth(); // from '@clerk/nextjs/server'
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

**User sync:** `src/lib/ensureUser.ts` is called in the root layout on every authenticated page load. It fetches the Clerk user and upserts a local `User` record in PostgreSQL. This ensures `User.id` (the Clerk user ID) always exists before any DB operation referencing it.

**Webhooks:** The Clerk webhook at `/api/webhooks/clerk` receives `user.created`, `user.updated`, and `user.deleted` events. Svix (`svix` npm package) verifies the webhook signature using `CLERK_WEBHOOK_SECRET`. The webhook handler syncs changes to the local `User` table.

> Note in the README: "The Clerk webhook route at `/api/webhooks/clerk` currently verifies and logs webhook events; it does not yet perform full user sync." Verify the current implementation in `src/app/api/webhooks/clerk/route.ts` before relying on this.

**Sign-in / sign-up pages:** Located at `src/app/(auth)/sign-in` and `src/app/(auth)/sign-up`. These are Clerk's hosted UI components embedded in the app.

**Environment variables required:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET` (optional but recommended)

**Clerk middleware:** Debatera does not have a `src/middleware.ts`. Clerk's default middleware handles route protection based on Clerk's own configuration.

---

## Stream (Video Calls)

**Packages:** `@stream-io/video-react-sdk` v1.24.0, `@stream-io/node-sdk` v0.7.6
**Overrides:** `@stream-io/video-react-bindings` pinned to `1.10.0`, `@stream-io/video-client` pinned to `1.34.0`

### What it does

Stream powers the live video debate rooms for ONLINE tournaments. Each debate gets its own call.

### How it's integrated

**Server client:** `src/lib/stream/server.ts` — instantiates the Stream Node.js client using `STREAM_API_SECRET`.

**Call lifecycle:**
1. When a user opens the debate call page, client calls `POST /api/stream/calls/ensure`.
2. `src/lib/stream/ensure.ts` → `ensureVideoCallExists()` checks for an existing `VideoCall` record. If none, creates the Stream call and the DB record.
3. Call ID format: `"debate_<debateId>"`. Call type: `"debate"`.
4. Client calls `POST /api/stream/token` to get a short-lived JWT for the Stream SDK.
5. `@stream-io/video-react-sdk` renders the call room on the client.

**Eligibility checks:** `src/lib/stream/eligibility.ts` verifies the user's role allows joining (debater on the assigned team, assigned judge, or tournament organizer).

**Stopwatch sync:** The in-call stopwatch is not Stream-native. It uses HTTP polling against `PATCH /api/debates/[debateId]/stopwatch`, with a monotonic `version` counter to prevent stale writes.

**When Stream is used:** Only for tournaments with `eventMode = ONLINE` in `TournamentSettings`.

**Environment variables required:**
- `NEXT_PUBLIC_STREAM_API_KEY`
- `STREAM_API_SECRET`

---

## PostgreSQL + Prisma

**Packages:** `prisma` v7, `@prisma/client` v7, `@prisma/adapter-pg`, `pg` v8

### How it's integrated

**Singleton:** `src/lib/prisma.ts` exports a single `PrismaClient` instance using the `PrismaPg` adapter with a connection pool. In development, the instance is cached on the `global` object to survive Next.js HMR reloads.

**Import rule:** Always import from `@/lib/prisma`. Never instantiate `PrismaClient` elsewhere.

**Migrations:**
- `npx prisma migrate dev` — development (generates and applies migration files).
- `npx prisma migrate deploy` — production (applies pending migrations, run automatically by `npm run build`).
- Migration files live in `prisma/migrations/`.

**Connection string:** `DATABASE_URL` in `.env`.

---

## Svix (Webhook Verification)

**Package:** `svix` v1.77.0

Used only at `/api/webhooks/clerk/route.ts` to verify the signature of incoming Clerk webhook events. Without `CLERK_WEBHOOK_SECRET`, the endpoint will accept any request. Set this in production.

---

## UI Libraries

| Library | Purpose |
|---|---|
| Tailwind CSS 4 | Utility-first styling |
| Radix UI (multiple packages) | Accessible headless UI primitives |
| shadcn/ui pattern | Pre-composed component library built on Radix + Tailwind |
| `class-variance-authority` | Variant-based class composition |
| `clsx` + `tailwind-merge` | Class name merging (exposed via `cn()` in `src/lib/utils.ts`) |
| `lucide-react` | Icon set |
| `sonner` | Toast notifications |
| `next-themes` | Dark/light theme support |
| `cmdk` | Command menu / search |
| `@dnd-kit/*` | Drag-and-drop for pairing management |
| `react-day-picker` | Date picker component |
| `date-fns` | Date formatting utilities |
| `react-markdown` + `remark-gfm` | Markdown rendering (docs pages) |

---

## No External Email Service

There is no transactional email integration. Institution invitations create `Notification` records in the DB, which are surfaced via in-app polling. There is no email sent to invited users.
