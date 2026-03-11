1. Core Principle (Non-Negotiable)
✨ Readability beats cleverness. Always.
 - Prefer clear, boring code over smart abstractions.
 - If something is hard to name, it’s probably doing too much.
 - Write code like someone else will debug it at 3 AM (because they will).

2. Structure & Organization Rules
📁 Files & Folders
 - One file = one clear responsibility
 - File names must describe what the file does, not how
   - ✅ createTournament.ts
   - ❌ tournamentUtils.ts
 - Avoid “misc”, “helpers”, or “utils” dumping grounds.

3. Naming Rules (Extremely Important)
🏷 Variables & Functions
 - Names must explain intent, not implementation
 - Prefer longer names over ambiguous one
```
// ❌ Bad
const data = getData()

// ✅ Good
const tournamentRegistrations = fetchTournamentRegistrations()
```
🧠 Boolean Naming
 - Always read naturally as true/false
```
const isTournamentVerified
const hasRegistrationClosed
const canCreateTeam
```

4. Functions & Logic Rules
🧩 Functions
 - Functions should do one thing
 - If you need to say “and” when describing a function → split it
 - Prefer pure functions where possible

5. TypeScript Rules
 - No any unless explicitly justified
 - Use domain-specific types instead of primitives
```
type TournamentId = string
type InstitutionId = string
```
 - Prefer unions and enums for state
```
type TournamentStatus = "DRAFT" | "PENDING" | "VERIFIED"
```

6. State & Business Logic
 - Business rules must not live only in the UI
 - Critical rules must exist in:
   - server logic
   - database constraints (when possible)
 - UI can reflect rules, not define them.

7. UI & Component Rules
 - Use shadcn/ui components consistently
 - Avoid custom UI unless necessary
 - Styling should be predictable and boring (this is a feature)


🛠 Languages & Technologies Used in Debatera
(Next.js App Router + TypeScript + Tailwind, shadcn/ui components, Clerk auth, Postgres + Prisma)
- TypeScript (primary language)
- JavaScript (legacy / edge cases)
- SQL (PostgreSQL)
- Prisma Schema Language
- HTML (via JSX / TSX)
- CSS (via Tailwind CSS)
- Markdown (documentation)


