# AI Judge Implementation Prompt for Debatera

## Context

You are implementing an AI-powered debate judging agent system for Debatera — a Next.js (TypeScript) web platform for organizing and running WSDC-format debate tournaments. The architecture document is attached as `debatera-agent-architecture.md` in the project root — READ IT FULLY before planning.

The project uses: Next.js 16 (App Router), React 19, TypeScript 5, Prisma 7 (PostgreSQL), Tailwind CSS 4, Clerk (auth), Zod (validation).

## Your mission

Implement the **"Chronological Multi-Lens Judge"** agent system as described in the architecture doc. This system analyzes WSDC debate transcripts (text, uploaded as .md or .pdf) and produces a full WSDC-compliant ballot with speaker scores, winner decision, and per-speaker coaching feedback.

## Critical constraints

1. **Full isolation.** All AI judge code MUST live in clearly separated directories using Next.js route groups `(ai-judge)` and dedicated folders. Do NOT modify any existing files in the project. Do NOT touch existing Prisma models, API routes, components, or pages. The only exception is `prisma/schema.prisma` where you APPEND new models at the bottom.

2. **No existing code modifications.** Treat every file currently in the project as read-only. If you need a utility that exists (e.g., `ensureUser`, Prisma client), import it — don't modify it. If a shared component doesn't fit, create your own in the ai-judge directory.

3. **Folder structure.** Use this layout:

```
src/
  app/
    (ai-judge)/                          # Route group — no URL impact
      ai-judge/                          # Actual URL segment: /ai-judge
        page.tsx                         # Upload transcript + start judging UI
        [sessionId]/
          page.tsx                       # Live progress + results view
  
  lib/
    ai-judge/                            # All business logic here
      types.ts                           # All TypeScript types/interfaces
      schemas.ts                         # Zod schemas for validation
      constants.ts                       # WSDC scoring constants, model configs
      
      pipeline/                          # The 5-phase pipeline
        index.ts                         # Pipeline orchestrator
        phase1-context.ts                # Context Builder agent
        phase2-analysis.ts               # Iterative chronological analysis (3 lenses)
        phase3-synthesis.ts              # Per-lens verdict synthesis
        phase4-calibration.ts            # Calibrator agent
        phase5-ballot.ts                 # Ballot Writer agent
      
      lenses/                            # Lens-specific logic
        content-lens.ts                  # Lens A: Content/Matter analysis
        strategy-lens.ts                 # Lens B: Strategy/Method analysis
        engagement-lens.ts               # Lens C: Engagement/Clash analysis
        types.ts                         # Lens-specific types
      
      prompts/                           # All LLM prompt templates
        context-builder.ts               # Phase 1 system + user prompts
        content-analyst.ts               # Lens A prompts
        strategy-analyst.ts              # Lens B prompts
        engagement-analyst.ts            # Lens C prompts
        calibrator.ts                    # Phase 4 prompts
        ballot-writer.ts                 # Phase 5 prompts
      
      providers/                         # LLM provider abstraction
        base.ts                          # Abstract LLM provider interface
        openai.ts                        # OpenAI (GPT-4o, GPT-4o-mini)
        anthropic.ts                     # Anthropic (Claude Sonnet)
        google.ts                        # Google (Gemini Flash)
        factory.ts                       # Provider factory
      
      transcript/                        # Transcript parsing
        parser.ts                        # Parse .md and .pdf into Speech[]
        types.ts                         # Transcript-specific types
      
      utils/                             # Shared utilities
        memory.ts                        # Analysis memory management
        scoring.ts                       # WSDC score calculations
        json-parser.ts                   # Safe JSON extraction from LLM output

  app/
    api/
      ai-judge/                          # API routes
        sessions/
          route.ts                       # POST: create session, GET: list sessions
          [sessionId]/
            route.ts                     # GET: session status + results
            start/
              route.ts                   # POST: trigger pipeline execution
        
        upload/
          route.ts                       # POST: upload transcript file

prisma/
  schema.prisma                          # APPEND new models at the bottom (do not modify existing)
```

4. **Environment variables.** The system needs these env vars (user will configure):
   - `OPENAI_API_KEY` — for GPT-4o / GPT-4o-mini
   - `ANTHROPIC_API_KEY` — for Claude Sonnet
   - `GOOGLE_AI_API_KEY` — for Gemini Flash
   
   Make the system work even if only ONE provider key is set (fallback: use the available provider for all 3 lenses). Fail gracefully with clear error messages if zero keys are configured.

5. **No external job queue.** Since this is an MVP, do NOT add BullMQ, Redis, or any external queue dependency. Instead, run the pipeline in-process using async/await. Store progress in the database so the UI can poll for updates. The pipeline execution should be triggered by the API and run as a background async task (fire-and-forget pattern with `void runPipeline(sessionId)` after responding to the HTTP request).

## Architecture summary (from the doc)

### Phase 1: Context Builder (1 LLM call)
- Input: Motion text, format (WSDC), sides
- Output: `DebateContext` — core issues, expected burdens, judging framework
- Model: strongest available

### Phase 2: Iterative Chronological Analysis (3 lenses × 8 speeches = 24 LLM calls)
- For EACH speech (in order, 1→8), THREE parallel lenses analyze it:
  - **Lens A (Content)**: Claims, warrants, impacts, rebuttals, drops. Updates an Argument Map.
  - **Lens B (Strategy)**: Priorities, framing, time allocation, team coherence. Updates an Issue Tracker.
  - **Lens C (Engagement)**: Clash quality, POI interactions, rhetoric. Updates a Clash Matrix.
- Each lens receives: DebateContext + its own previous analysis summary (memory) + current speech text only
- The 3 lenses run in PARALLEL for each speech, but speeches are processed SEQUENTIALLY (speech 1 must complete before speech 2 starts for all lenses)

### Phase 3: Per-Lens Synthesis (3 LLM calls, parallel)
- Each lens produces: per-speaker scores (60-80), verdict (which side wins on this dimension), key moments
- All 3 run in parallel

### Phase 4: Calibrator (1 LLM call)
- Input: all 3 lens verdicts
- Identifies disagreements, resolves them using ALIGN / OVERRIDE / WEIGHT_SHIFT
- Output: final calibrated scores and winner
- Model: strongest available

### Phase 5: Ballot Writer (1 LLM call)
- Input: calibrated results
- Output: WSDC-format ballot with scores, winner reasoning, per-speaker feedback
- Model: strongest available

### Total: ~30 API calls, ~12 sequential steps with parallelization

## Prisma models to APPEND

Add these models to the END of `prisma/schema.prisma`. Do NOT modify any existing models. Use relations to existing models where needed (TournamentDebate exists already).

```prisma
// ============================================
// AI JUDGE MODELS (appended — do not modify above)
// ============================================

enum AIJudgingStatus {
  PENDING
  CONTEXT_BUILDING
  ANALYZING
  SYNTHESIZING
  CALIBRATING
  WRITING_BALLOT
  COMPLETE
  FAILED
}

enum LensType {
  CONTENT
  STRATEGY
  ENGAGEMENT
}

model AIJudgingSession {
  id              String            @id @default(cuid())
  
  // Optional link to a tournament debate (null if standalone)
  debateId        String?
  
  // Transcript data
  transcriptText  String            @db.Text    // Raw parsed transcript
  motion          String                         // Debate motion/topic
  infoSlide       String?                        // Optional info slide
  
  // Pipeline state
  status          AIJudgingStatus   @default(PENDING)
  currentPhase    Int               @default(0)  // 1-5
  currentSpeech   Int               @default(0)  // 0-8 (0 = not started)
  errorMessage    String?
  
  // Phase 1 output
  debateContext    Json?
  
  // Phase 4 output
  calibration     Json?
  
  // Phase 5 output  
  finalBallot     Json?
  finalScores     Json?             // { prop: number, opp: number, speakers: {...} }
  winner          String?           // "PROPOSITION" | "OPPOSITION"
  
  // Metadata
  modelsUsed      Json?             // { lensA: "claude-sonnet", lensB: "gpt-4o-mini", ... }
  totalApiCalls   Int               @default(0)
  totalTokensUsed Int               @default(0)
  processingTimeMs Int?
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  completedAt     DateTime?
  
  // Relations
  lensAnalyses    AILensAnalysis[]
  
  @@index([status])
  @@index([debateId])
}

model AILensAnalysis {
  id              String            @id @default(cuid())
  sessionId       String
  session         AIJudgingSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  lensType        LensType
  modelUsed       String            // e.g., "claude-sonnet-4-20250514"
  
  // Per-speech analysis (array of 8 analyses)
  speechAnalyses  Json              @default("[]")   // Array<{ speechIndex, analysis, score, memory }>
  
  // Phase 3: Final verdict for this lens
  verdict         Json?             // { winner, reasoning, speakerScores, keyMoments }
  confidence      Float?            // 0.0 - 1.0
  
  // Memory state (accumulated analysis)
  currentMemory   Json              @default("{}")    // Running analysis summary
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  @@unique([sessionId, lensType])
  @@index([sessionId])
}
```

## WSDC scoring constants

```typescript
// WSDC format specifics
const WSDC = {
  SPEECHES: [
    { index: 0, role: "PROP_1", label: "1st Proposition", side: "PROP", isReply: false, maxMinutes: 8 },
    { index: 1, role: "OPP_1",  label: "1st Opposition",  side: "OPP",  isReply: false, maxMinutes: 8 },
    { index: 2, role: "PROP_2", label: "2nd Proposition", side: "PROP", isReply: false, maxMinutes: 8 },
    { index: 3, role: "OPP_2",  label: "2nd Opposition",  side: "OPP",  isReply: false, maxMinutes: 8 },
    { index: 4, role: "PROP_3", label: "3rd Proposition", side: "PROP", isReply: false, maxMinutes: 8 },
    { index: 5, role: "OPP_3",  label: "3rd Opposition",  side: "OPP",  isReply: false, maxMinutes: 8 },
    { index: 6, role: "OPP_REPLY",  label: "Opposition Reply",  side: "OPP",  isReply: true, maxMinutes: 4 },
    { index: 7, role: "PROP_REPLY", label: "Proposition Reply", side: "PROP", isReply: true, maxMinutes: 4 },
  ],
  SCORE_RANGE: { min: 60, max: 80 },           // Constructive speeches
  REPLY_SCORE_RANGE: { min: 30, max: 40 },     // Reply speeches
  DIMENSION_WEIGHTS: {                           // For text-only analysis
    content: 0.50,    // Content/Matter (normally 40%, boosted since no audio)
    strategy: 0.25,   // Strategy/Method (normally 20%, slightly boosted)
    engagement: 0.25, // Text-observable style + clash (normally 40%, reduced since no audio)
  },
} as const;
```

## Transcript parsing

The user uploads a .md or .pdf file containing the debate transcript. Expected format:

```markdown
# Motion: "This house believes that X"

## Info Slide (optional)
Context information...

## Speech 1: 1st Proposition (Speaker Name)
Speech text here...

## Speech 2: 1st Opposition (Speaker Name)  
Speech text here...

## Speech 3: 2nd Proposition (Speaker Name)
Speech text here...

... (up to 8 speeches)
```

The parser should be FLEXIBLE — handle variations in formatting (e.g., "Speech 1", "Реч 1", "Prop 1", numbered without labels). Extract: motion, optional info slide, array of speeches with speaker name, side, and text. If the format is ambiguous, make best-effort assumptions based on WSDC speech order.

## LLM Provider abstraction

Create a clean provider interface:

```typescript
interface LLMProvider {
  name: string;
  call(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;      // default 0.3 for judging
    maxTokens?: number;        // default 2000
    responseFormat?: "json";   // request JSON mode if supported
  }): Promise<{ 
    content: string; 
    tokensUsed: { input: number; output: number };
  }>;
}
```

Each provider (OpenAI, Anthropic, Google) implements this. The factory selects providers based on available API keys and assigns them to lenses, preferring diversity (different model per lens). If only one key is available, use it for everything.

## UI requirements

### Upload page (`/ai-judge`)
- File upload zone (accept .md and .pdf)
- Optional: paste motion text manually
- "Start judging" button
- List of previous sessions with status

### Results page (`/ai-judge/[sessionId]`)  
- Progress indicator showing current phase and speech number
- Poll for status every 2 seconds while processing (use `useEffect` + `setInterval` or SWR)
- When complete, show:
  - Winner with reasoning
  - Per-speaker scores table (Content, Strategy, Engagement, Total)
  - Expandable feedback per speaker
  - Key turning points
  - Confidence score
  - Disclaimer: "AI-generated analysis based on text only. Does not replace human judges."

Keep UI simple and functional. Use existing shadcn/ui components if available in the project, otherwise use Tailwind directly. No need for fancy design — clarity over aesthetics.

## Prompt engineering guidelines

ALL prompts must:
1. Specify the role: "You are an experienced WSDC debate adjudicator..."
2. Provide the WSDC scoring rubric inline (Content 40%, Style 40%, Strategy 20% — adjusted for text-only)
3. Request STRUCTURED JSON output with a clear schema defined in the prompt
4. Include an explicit instruction: "Base your judgment ONLY on what was said in the debate, not on your own knowledge of the topic. The team that better PROVED their case wins."
5. For Phase 2 (iterative analysis): include the previous analysis summary as "your notes so far" and the current speech as "the speech you are now analyzing"
6. For reply speeches: remind the agent that reply speeches should NOT contain new arguments — they should crystallize and weigh existing ones

## Error handling

- If an LLM call fails, retry up to 2 times with exponential backoff (1s, 3s)
- If a lens fails after retries, mark it as failed and continue with remaining lenses (Calibrator can work with 2 lenses)
- If the Calibrator or Ballot Writer fails, mark session as FAILED with error message
- Store partial results — even if the pipeline fails at Phase 4, the per-speech analyses from Phase 2 are valuable and should be preserved

## What NOT to do

- Do NOT install a job queue (BullMQ, etc.)
- Do NOT add WebSocket support — use polling
- Do NOT create a separate database — use the existing Prisma/PostgreSQL setup
- Do NOT modify any existing files
- Do NOT add authentication to AI judge routes (for MVP, anyone can use it; auth can be added later)
- Do NOT over-engineer — this is an MVP. Make it work correctly first.
- Do NOT hardcode API keys — always use environment variables

## Summary of deliverables

1. Prisma schema additions (appended)
2. Migration file
3. Transcript parser (.md and .pdf support)
4. LLM provider abstraction (OpenAI, Anthropic, Google)
5. All 5 pipeline phases with prompt templates
6. API routes (create session, upload, start, get status/results)
7. UI pages (upload + results)
8. Type definitions and Zod schemas throughout