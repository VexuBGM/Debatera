# Security

## Authentication

Authentication is handled by Clerk. Debatera does not store or manage passwords. All session tokens are issued and validated by Clerk's SDK.

**Every protected API route** begins with:
```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

This is enforced per-route. There is no global middleware that automatically blocks unauthenticated requests to API routes.

---

## Authorization

Authorization is manual and per-operation. There is no RBAC library.

Each API route and server action checks:
1. Is the user authenticated? (Clerk `auth()`)
2. Does the user have the required role or relationship? (DB lookup)

Key authorization modules:
- `src/lib/ballots/authorization.ts` — ballot access control
- `src/lib/tournamentRounds/authorization.ts` — round management (tournament creator only)
- `src/lib/domains/teams/teamManagementScope.ts` — team management scope
- `src/lib/guards/tournamentSettingsGuards.ts` — registration window and team size guards

**Known gap:** The "judge can only be in one debate per round" constraint is enforced in application logic only — there is no DB unique constraint on `(roundId, participantId)` across `TournamentDebateJudge`. A bug or direct DB manipulation could violate this.

---

## Judge Portal (Token-Based Access)

The portal (`src/app/(portal)/`) operates outside Clerk. Access is granted via a URL-embedded token.

**Token generation** (`src/lib/portal/tokens.ts`):
- A cryptographically random token is generated.
- SHA-256 hash is stored in `TournamentParticipantAccessLink.tokenHash` for DB lookup.
- The plaintext token is AES-256-GCM encrypted and stored in `encryptedToken` (allows organizers to retrieve the link again).

**Token validation** (`src/lib/portal/auth.ts`):
- Incoming token is hashed and looked up by `tokenHash`.
- Checks: record exists, not revoked (`revokedAt IS NULL`), not expired (`expiresAt > now()`).
- On valid access, `lastUsedAt` is updated.

**TTL:** Defaults to 14 days, configurable via `PORTAL_TOKEN_TTL_DAYS`.

**Revocation:** Set `revokedAt` on the `TournamentParticipantAccessLink` record. There is no UI for this — requires direct DB access or a future admin endpoint.

---

## SQL Injection

Not a concern in practice. All DB access goes through Prisma's query builder. Raw queries (`prisma.$queryRaw`) are not used anywhere in the codebase.

---

## XSS

React escapes all rendered values by default. No `dangerouslySetInnerHTML` usage has been identified in the codebase. Markdown content (docs pages) is rendered via `react-markdown` which sanitizes output by default.

---

## CSRF

Next.js App Router with `'use server'` actions provides built-in CSRF protection for server actions. API routes are accessed via `fetch()` from the same origin. No explicit CSRF token mechanism is needed for same-origin requests authenticated via Clerk session cookies.

---

## Input Validation

All API routes validate request bodies with Zod before any DB operation. Schemas live in `src/lib/validations/` and `src/lib/ballots/validation.ts`, `src/lib/tournamentRounds/validation.ts`.

Server Actions also use Zod where applicable.

**Rule:** Client-side validation is optional UX sugar. The server always validates independently.

---

## Rate Limiting

`src/lib/security/rateLimit.ts` exists but is **not currently wired into any route**. No rate limiting is active. This is a known gap for production deployments — the module should be connected before the app handles untrusted traffic at scale.

---

## URL Security

`src/lib/security/url.ts` provides helpers for safe URL construction and validation (e.g., preventing open redirect vulnerabilities). Tested in `src/lib/security/url.test.ts`.

---

## Webhook Verification

The Clerk webhook endpoint at `/api/webhooks/clerk` uses Svix to verify the webhook signature:
```typescript
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
wh.verify(rawBody, headers);
```

Without `CLERK_WEBHOOK_SECRET`, verification is skipped. **Set this in production.**

---

## Data Integrity

Key DB constraints that protect data integrity:
- `TournamentTeamMember.participantId` — `@unique` prevents a debater from joining multiple teams.
- `TournamentParticipant` — `@@unique([tournamentId, userId])` prevents duplicate registrations.
- `Ballot` — `@@unique([debateId, adjudicatorId])` prevents a judge from having multiple ballots per debate.
- `BallotSpeech` — `@@unique([ballotId, role])` ensures one score per speech role per ballot.
- `DebateResult` — `@unique` on `debateId` ensures one result per debate.
- Cascade deletes are used broadly: deleting a tournament cascades to all children.

---

## Environment Variable Security

Sensitive values that must not be exposed client-side:
- `CLERK_SECRET_KEY` — never prefix with `NEXT_PUBLIC_`
- `STREAM_API_SECRET` — never prefix with `NEXT_PUBLIC_`
- `DATABASE_URL` — never prefix with `NEXT_PUBLIC_`
- `CLERK_WEBHOOK_SECRET` — never prefix with `NEXT_PUBLIC_`

Values prefixed with `NEXT_PUBLIC_` are embedded in the client bundle and visible to users.

---

## Production Checklist

- [ ] `CLERK_WEBHOOK_SECRET` is set and webhook endpoint is registered in Clerk dashboard
- [ ] `DATABASE_URL` uses SSL (add `?sslmode=require` or equivalent)
- [ ] Rate limiting is wired into public/mutation endpoints
- [ ] `NEXT_PUBLIC_BASE_URL` is set to the correct production URL
- [ ] Portal tokens are generated fresh (not reused from dev/staging environment)
