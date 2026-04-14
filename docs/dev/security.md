# Security

## Authentication

Authentication is handled by Clerk. Debatera does not store or manage passwords. All session tokens are issued and validated by Clerk's SDK.

Protected Clerk-backed API routes follow this pattern:

```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

This is enforced per route. There is no global middleware that automatically blocks unauthenticated requests.

---

## Authorization

Authorization is manual and per operation. There is no RBAC library.

Each API route and server action checks:
1. Is the user authenticated?
2. Does the user have the required role or relationship?

Key authorization modules:
- `src/lib/ballots/authorization.ts` - ballot access control
- `src/lib/tournamentRounds/authorization.ts` - round management
- `src/lib/domains/teams/teamManagementScope.ts` - team management scope
- `src/lib/guards/tournamentSettingsGuards.ts` - registration window and team size guards
- `src/lib/security/access.ts` - tournament and institution read access, including private standings gating

Known gap:
- The "judge can only be in one debate per round" constraint is enforced in application logic only. There is no DB unique constraint on `(roundId, participantId)` across `TournamentDebateJudge`.

---

## Judge Portal

The portal (`src/app/(portal)/`) operates outside Clerk. Access is granted by a time-limited token.

Token generation (`src/lib/portal/tokens.ts`):
- generate a cryptographically random token
- store a SHA-256 hash in `TournamentParticipantAccessLink.tokenHash`
- store the plaintext token encrypted with AES-256-GCM in `encryptedToken`

Token validation (`src/lib/portal/auth.ts`):
- hash the incoming token and look it up by `tokenHash`
- require the link to exist, be unrevoked, and be unexpired
- scope ballot access to the owning judge and tournament
- update `lastUsedAt` on valid use

TTL defaults to 14 days and is configurable via `PORTAL_TOKEN_TTL_DAYS`.

Revocation is done by setting `revokedAt` on `TournamentParticipantAccessLink`.

---

## SQL Injection

All normal data access goes through Prisma's query builder. Raw SQL usage is minimal and controlled.

---

## XSS

React escapes rendered values by default. No `dangerouslySetInnerHTML` usage has been identified in the app code. Markdown is rendered through `react-markdown`.

---

## CSRF

Server Actions rely on Next.js protections. Clerk-authenticated API routes are same-origin and cookie-backed. No separate CSRF token layer is currently used.

---

## Input Validation

API routes validate request bodies with Zod before DB writes. Schemas live under `src/lib/validations/` plus domain-specific validation modules such as `src/lib/ballots/validation.ts` and `src/lib/tournamentRounds/validation.ts`.

Rule:
- client-side validation is UX only
- the server validates independently

---

## Rate Limiting

`src/lib/security/rateLimit.ts` is wired into several higher-risk routes, including:
- portal ballot read/save/submit/modification-request endpoints
- portal judge and portal link generation endpoints
- selected tournament, round, and institution GET routes
- Clerk webhook ingestion

The current implementation is an in-memory bucket keyed by route scope plus subject/IP. That is fine for local development and single-instance protection, but production deployments should consider a shared store for multi-instance rate limiting.

---

## URL Security

`src/lib/security/url.ts` provides helpers for safe URL construction and validation, including portal link building and normalization.

---

## Webhook Verification

The Clerk webhook endpoint at `/api/webhooks/clerk` uses Svix verification when `CLERK_WEBHOOK_SECRET` is configured:

```typescript
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
wh.verify(rawBody, headers);
```

Without `CLERK_WEBHOOK_SECRET`, verification is skipped. Production should always set it.

---

## Data Integrity

Important DB constraints:
- `TournamentTeamMember.participantId` - `@unique` prevents a debater from joining multiple teams simultaneously
- `TournamentParticipant` - `@@unique([tournamentId, userId])` prevents duplicate registrations
- `Ballot` - `@@unique([debateId, adjudicatorId])` prevents duplicate judge ballots per debate
- `BallotSpeech` - `@@unique([ballotId, role])` ensures one score per speech role per ballot
- `DebateResult.debateId` - unique result per debate

Cascade deletes are used broadly when parent records are removed.

---

## Environment Variables

Sensitive values that must never be exposed client-side:
- `CLERK_SECRET_KEY`
- `STREAM_API_SECRET`
- `DATABASE_URL`
- `CLERK_WEBHOOK_SECRET`

Any variable prefixed with `NEXT_PUBLIC_` is exposed to the client bundle.

---

## Production Checklist

- [ ] `CLERK_WEBHOOK_SECRET` is set and Clerk webhooks are registered
- [ ] `DATABASE_URL` uses SSL as appropriate for production
- [ ] Rate limiting strategy is reviewed for multi-instance deployments
- [ ] `NEXT_PUBLIC_BASE_URL` matches the real production URL
- [ ] Portal tokens are generated fresh per environment
