# PRD: AI Features for Debatera

| Field | Value |
|---|---|
| **Status** | Draft |
| **Owner** | Product |
| **Target release** | Phase 1: Q3 2026 · Phase 2: Q4 2026 · Phase 3: 2027 |
| **Last updated** | 2026-03-30 |

---

## Change History

| Date | Author | Summary |
|---|---|---|
| 2026-03-30 | Initial | First draft — covers AI feedback, motion research, practice opponent, analytics, paradigm intelligence |

---

## 1. Overview

Debatera is a unified debate tournament platform that replaces the fragmented stack of Tabbycat, SpeechWire, Discord, and external timers with one integrated product. Today, the platform handles the **operational** side of tournaments well — registration, pairings, video calls, ballots, and standings.

This PRD defines the **AI layer** that elevates Debatera from an operations tool into a comprehensive debate intelligence platform. The core bet: no competitor (Tabroom, SpeechWire, Tabbycat) has meaningfully integrated AI into tournament management. The AI coaching tools that exist (Symbai, PublicForumAI) are disconnected from tournament infrastructure. Debatera can uniquely own the intersection.

---

## 2. Strategic Alignment

Debatera's long-term vision (per [`docs/product/the_whole_idea.md`](the_whole_idea.md)) is to be the single platform for organizing, running, and improving through competitive debate. AI directly accelerates all three:

- **Organizing**: automate repetitive director tasks; surface warnings before they become crises
- **Running**: real-time assistance for judges, timers, and flow
- **Improving**: structured feedback, trend analysis, and coached practice

This maps to the Phase 5 "Advanced and differentiators" roadmap in [`docs/product/forward_plan.md`](forward_plan.md), but several AI features (ballot feedback enhancement, motion research) are low enough complexity to ship earlier.

---

## 3. Problem Statement

### 3.1 The judge feedback problem (most severe)

Judges across all debate formats provide unstructured, inconsistently detailed feedback in free-text ballot boxes. The status quo:

- A judge might write "Good speeches, prop wins" — zero actionable learning for the debaters
- There is no standard for what a useful ballot includes: clash engagement, dropped arguments, evidence quality, speaking style
- Students accumulate ballots over a season but cannot see patterns across them — each ballot is a one-off note
- New or less experienced judges have no guidance on what to include

**Result:** The single biggest educational artifact of a tournament — judge feedback — is systematically under-utilized.

### 3.2 The motion preparation gap

Debaters are assigned motions (debate topics) inside the platform (they can see the round motion in Debatera) but do all their preparation elsewhere — Google, ChatGPT, random YouTube videos. The platform severs the connection between knowing the topic and preparing for it.

**Result:** Debatera is used only as a scheduling tool during tournament, not as a partner in competitive success.

### 3.3 No way to practice between tournaments

Tournaments happen on weekends. Coaches cannot host structured sessions every day. Debaters who want to practice arguments against a real opponent outside of club sessions have no structured option within the platform.

**Result:** Engagement falls to near-zero between tournament cycles. The platform has no DAU between events.

### 3.4 Judges don't know how to adapt to specific debaters

When a judge is assigned to a debate, they have no structured view of what they've historically emphasized (e.g., "this judge always rewards technical debaters over persuasive ones"). Debaters cannot prepare for a judge they've never encountered, and repeat judges have no institutional memory.

**Result:** The judge-debater relationship is stateless. Every debate starts from zero.

---

## 4. Target Personas

### Primary: The Debater (student)

> Sofia, 17, high school debater in a competitive Bulgarian World Schools circuit. She debates in 5–8 tournaments a year. Between tournaments she practices 2–3 times a week with her club. She loses rounds and doesn't understand why — judges' feedback is vague, and she can't identify patterns across a season.

**Goals:** Improve specific weaknesses, understand why she lost, practice against real arguments before a tournament.

**Pain points:** Ballots are inconsistent, she can't practice on-demand, motions arrive and she has no research support.

### Secondary: The Judge

> Mihail, 24, university debater who now judges high school tournaments. He judges 4–6 rounds per tournament. He wants to give useful feedback but doesn't always know what to emphasize, writes fast under time pressure, and worries his ballots are too sparse.

**Goals:** Give feedback that actually helps students, write ballots efficiently, maintain credibility as a fair judge.

**Pain points:** No guidance on what makes a useful ballot, writes under time pressure, no way to review his own judging history.

### Tertiary: The Tournament Organizer / Tab Director

> Ivana, 35, debate coach and frequent tournament director. She runs 2–3 tournaments per year with 30–80 teams. Most of her time is spent on logistics — room assignments, drop management, last-minute communications. She wants to know at a glance if something is wrong.

**Goals:** Run a smooth tournament, resolve issues fast, spend less time on repetitive tasks.

**Pain points:** Manual judge assignment is time-consuming, no predictive warnings (e.g., "this team has debated two opponents from the same institution"), no aggregate analytics on tournament quality.

---

## 5. Success Metrics

### Phase 1 success (AI Ballot Feedback + Motion Research)

| Metric | Baseline (today) | Target (6 months post-launch) |
|---|---|---|
| Average ballot word count (judge-written feedback) | ~30 words | >80 words (feedback is richer with AI scaffold) |
| % of ballots with at least 3 feedback dimensions scored | 0% | >60% |
| Motion Research Assistant weekly active users | 0 | >40% of active debaters |
| Feature opt-out rate (AI feedback suggestions) | — | <15% |
| User satisfaction with feedback quality (NPS-style survey) | Baseline TBD | +20 points vs baseline |

### Phase 2 success (AI Practice Opponent)

| Metric | Baseline | Target |
|---|---|---|
| DAU between tournament weekends | ~0 | >15% of registered debaters |
| Practice sessions per debater per month | 0 | >3 |
| Retention 30 days post-tournament | <10% | >35% |
| Practice-to-tournament performance correlation | Unmeasured | Measurable positive signal |

### Phase 3 success (Analytics + Paradigm Intelligence)

| Metric | Baseline | Target |
|---|---|---|
| Coaches reviewing feedback analytics monthly | 0 | >50% of coaches with >3 students |
| Time spent by tab director on judge assignment | Baseline survey | -40% |
| Judge paradigm adoption (filled in profile) | <20% of judges | >70% |

---

## 6. User Scenarios

### Scenario A — Sofia prepares for a round (Motion Research)

Sofia opens Debatera on Friday evening. She sees Round 3 is published with the motion: "This House Would ban private healthcare." She clicks "Research this motion" and the AI generates a structured brief: the core clash, strongest proposition arguments with evidence hooks, strongest opposition arguments, historical precedents, and three likely debate traps to watch for. She takes the brief into her team's prep session. Total time saved: 30+ minutes of scattershot Googling.

### Scenario B — Mihail writes a ballot (AI Feedback Enhancer)

Mihail submits scores for all 8 speeches. Before he finalizes the ballot, the platform shows him a guided feedback panel: "You haven't commented on the Opposition's rebuttal quality or their evidence use. Here are the argument threads that were active in this debate — did Prop adequately respond to X?" Mihail fills in the gaps in 3 minutes. The result is a 150-word, structured ballot. The AI did not write it — Mihail did — but he was guided to cover what matters.

### Scenario C — Sofia reviews her season (Feedback Analytics)

After Tournament 4, Sofia opens her Feedback History. The AI has aggregated all 12 ballots she has received this season. It surfaces: "3 out of 4 judges commented that your rebuttals lack direct clash. 2 judges praised your evidence depth. Your speaker scores peak in first proposition and dip in reply speeches." She shows her coach this summary. They adjust their practice plan to focus on rebuttals.

### Scenario D — Ivana assigns judges (Smart Allocation Assist)

Ivana is building the panel for Round 5. The AI assistant flags: "Judge Georgi has judged Team A twice already this tournament (Rule: max 2 times per team). Judge Elena has an institutional conflict with Team B." The suggestions are pre-filtered before Ivana even looks at the panel list. She approves the auto-suggestion for 90% of debates in 2 minutes instead of 20.

### Scenario E — Dimitar practices before a tournament (AI Opponent)

Dimitar has a tournament in 3 days. The upcoming motion was posted early. He opens "Practice" in Debatera, selects the motion, chooses Opposition side and Medium difficulty. The AI plays Proposition — making realistic first speeches and responding to his arguments. After the round, the AI gives structured feedback: "Your POI in the second speech was well-timed but your rebuttal in speech 3 dropped their main argument about X." He runs two sessions before the weekend.

---

## 7. Features & Requirements

Features are tagged **P0** (must-have, Phase 1), **P1** (high-value, Phase 2), or **P2** (future/Phase 3).

---

### Feature 1: AI Ballot Feedback Enhancer — P0

**Goal:** Help judges write higher-quality, more structured feedback without replacing their judgment.

**How it works:**

1. After a judge enters speech scores but before they submit, the platform surfaces a "Feedback Quality" panel.
2. The panel shows the active argument threads in the debate (inferred from the round motion and any existing comments the judge wrote).
3. The AI suggests specific feedback dimensions the judge has not yet addressed: e.g., "You haven't addressed their evidence quality", "Consider commenting on clash in the second half of the debate."
4. The judge can click any suggestion to expand it into a text field where they write their own words. The AI does not auto-write feedback.
5. Optionally: after the judge submits, the AI offers a "Feedback completeness score" (internal metric, not shown to debaters unless configured) to help the tournament director flag under-quality ballots.

**User requirements:**

- Judge sees the AI panel only after scores are entered (not before — avoids anchoring)
- Suggestions are grounded in the motion text and the judge's existing comments
- Judge can dismiss the panel permanently per tournament ("I know what I'm doing")
- Feedback history for debaters is structured by AI into named dimensions for display (argumentation, evidence, rebuttal, style) even if the judge wrote free text — this is a display-layer transformation

**Technical requirements:**

- Model: `claude-haiku-4-5-20251001` for low-latency suggestion generation (target <2s)
- Input: motion text + judge's existing comments + speech score profile (relative highs/lows)
- Output: 3–5 specific, non-generic suggestions grounded in the actual debate context
- No feedback content is stored as a separate AI artifact — only the judge's written text goes into `BallotSpeech.comment`
- AI processing is asynchronous — ballot submission is never blocked on AI response
- New API route: `POST /api/ai/ballot-feedback-suggestions` — rate limited per judge per ballot

**Acceptance criteria:**

- [ ] Panel appears after all 8 speeches have scores and at least one comment exists
- [ ] Suggestions reference the actual motion text, not generic advice
- [ ] Panel can be dismissed and preference is remembered per-judge per-tournament
- [ ] Ballot submission works identically with or without AI panel interaction
- [ ] AI errors are silent — fallback to no suggestions, no error shown to user

---

### Feature 2: Motion Research Assistant — P0

**Goal:** Give debaters (and coaches) an AI-generated research brief for any round motion, directly inside Debatera.

**How it works:**

1. When a round is published with a motion, debaters see a "Research Brief" button next to the motion.
2. Clicking it generates (or retrieves if cached) an AI brief covering:
   - **The core clash**: what the round is fundamentally about
   - **Proposition case framework**: 3 strongest lines of argument, briefly
   - **Opposition case framework**: 3 strongest lines of argument, briefly
   - **Key facts / evidence hooks**: statistics, examples, historical precedents debaters can research further
   - **Common traps**: arguments that sound strong but are commonly rebutted
   - **Terminology**: technical terms relevant to the topic that debaters should know
3. The brief is shared for all debaters in the tournament — it is not personalized (it is a research scaffold, not a cheat sheet).
4. Coaches can see the brief and annotate it for their teams (future P1 feature).

**User requirements:**

- Brief must load within 5 seconds (cached after first generation per motion)
- Brief is read-only for debaters — they cannot edit it (it is a scaffold)
- Brief is hidden until the round is published (prevents pre-round information asymmetry)
- Tournament organizer can disable the feature per tournament
- Brief is available even after the round ends (for learning / post-mortems)

**Technical requirements:**

- Model: `claude-sonnet-4-6` for research quality
- Brief is generated once per unique motion text and cached in a new `MotionBrief` DB table
- Input: motion text + debate format (WSDC, BP, etc.) + optional info slide text
- Output: structured JSON with sections (core_clash, prop_framework, opp_framework, key_facts, traps, terminology)
- Brief rendered as formatted markdown in the UI
- Cache TTL: indefinite (same motion text → same brief; no expiry needed)
- API: `POST /api/ai/motion-brief` (creates if not exists), `GET /api/ai/motion-brief?motionId=` (retrieves)

**Schema addition:**

```prisma
model MotionBrief {
  id        String   @id @default(cuid())
  motionHash String  @unique // SHA-256 of normalized motion text
  format    String   // debate format
  content   Json     // structured brief
  createdAt DateTime @default(now())
}
```

**Acceptance criteria:**

- [ ] Brief is not shown before round is published
- [ ] Second debater loading the brief gets cached version (no second AI call)
- [ ] Brief renders correctly on mobile
- [ ] Feature can be disabled per tournament in settings
- [ ] Organizer can mark any brief as "flagged" to trigger manual review

---

### Feature 3: Feedback Analytics Dashboard — P1

**Goal:** Surface patterns in a debater's feedback across a tournament season so they and their coach can focus practice.

**How it works:**

1. Each debater has a "My Progress" section that aggregates all ballots received this season.
2. The AI processes all `BallotSpeech.comment` values for a user and extracts recurring themes — what judges praise, what they criticize, how speaker scores correlate with specific speech slots.
3. Output is a structured dashboard:
   - **Top strengths** (mentioned positively by ≥2 judges)
   - **Consistent improvement areas** (mentioned negatively by ≥2 judges)
   - **Score trends** by speech position (are scores improving across the season?)
   - **Full feedback history** — every ballot, organized by tournament, structured into named dimensions
4. The analysis is regenerated lazily when new ballots are submitted (not real-time).

**User requirements:**

- Available only to the debater themselves and their institution admin (not publicly visible)
- Only includes ballots from submitted+locked debates (not draft ballots)
- Minimum threshold: at least 3 submitted ballots before the analytics view activates
- Debater can mark any ballot as "disputed" (wrong person, etc.) to exclude it from analytics

**Technical requirements:**

- Model: `claude-haiku-4-5-20251001` for bulk processing
- Processing is async (background job, not request-time)
- Results cached in a new `FeedbackAnalysis` table per participant per tournament
- Re-run trigger: new ballot submitted for this participant
- Privacy: AI processing only happens for own data; no cross-participant analysis
- API: `GET /api/participants/[id]/feedback-analysis`

**Acceptance criteria:**

- [ ] Dashboard shows at minimum: top strengths, improvement areas, score trend chart
- [ ] No analysis shown until 3+ ballots received
- [ ] Analysis is per-tournament-season, not cross-tournament (initially)
- [ ] Data is only visible to the participant and their institution admin

---

### Feature 4: AI Practice Opponent — P1

**Goal:** Enable debaters to practice arguments against an AI opponent outside of tournaments, directly inside Debatera.

**How it works:**

1. From the dashboard, debaters access a "Practice" mode.
2. They choose: motion (enter custom or select from recent tournament motions), their side (Prop/Opp), difficulty (Novice / Intermediate / Advanced), and debate format (WSDC, BP, etc.).
3. The AI plays the opposing side, delivering speeches in the correct format structure (word count, time equivalent in words).
4. After each of the debater's speeches, the AI responds with its next speech.
5. After the full round, the AI delivers structured feedback:
   - Arguments it found strongest vs. weakest from the human debater
   - Arguments it made that were not adequately addressed ("dropped arguments")
   - Overall verdict (with brief reasoning)
   - 3 specific suggestions for improvement

**User requirements:**

- Text-based (not audio/video) — debater types their speech text OR pastes it
- AI speeches are displayed in clearly formatted sections with headers per speech slot
- Debater can pause and resume a session
- Sessions are saved to history (debater can review past practice rounds)
- Difficulty adapts the AI's argumentation depth and rebuttal strength (Novice: weaker arguments, lots of dropped points; Advanced: tight logical structure, responds to every argument)

**Technical requirements:**

- Model: `claude-sonnet-4-6` for argument quality
- Multi-turn conversation stored in `PracticeSession` table
- Each speech turn stored as a message with role + content
- AI system prompt varies by difficulty level and format
- No speech-to-text in P1 (text input only; audio support is P2)
- Rate limit: 10 practice sessions per user per day (cost management)
- API: `POST /api/practice/sessions` (create), `POST /api/practice/sessions/[id]/speak` (submit speech, get AI response)

**Schema addition:**

```prisma
model PracticeSession {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  motion     String
  side       String   // PROPOSITION | OPPOSITION
  format     String
  difficulty String   // NOVICE | INTERMEDIATE | ADVANCED
  status     String   // IN_PROGRESS | COMPLETED | ABANDONED
  messages   Json[]   // [{role, content, speechSlot, timestamp}]
  feedback   Json?    // AI-generated post-round feedback
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

**Acceptance criteria:**

- [ ] AI responds with a valid speech in the correct format structure
- [ ] Post-round feedback includes verdict + at least 3 specific improvement points
- [ ] Sessions are saved and accessible from history
- [ ] Difficulty setting produces measurably different AI argumentation quality
- [ ] Rate limit (10/day) is enforced with clear user message

---

### Feature 5: Judge Paradigm Intelligence — P1

**Goal:** Help judges articulate their judging philosophy and help debaters understand what a given judge values.

**How it works (judge side):**

1. Judges fill in a "Judging Philosophy" text field in their profile (free text, like current practice).
2. The AI processes this text into a structured paradigm profile: weighted preferences across dimensions (technical vs. persuasive, evidence-heavy vs. logical flow, content vs. presentation, etc.).
3. The structured profile is displayed to the judge for review and correction before it is shared.

**How it works (debater side):**

1. When a judge is assigned to a debate, debaters can view the judge's structured paradigm profile.
2. The AI generates a "How to win in front of [Judge Name]" brief — 3–5 bullet points derived from the paradigm.
3. This brief is visible to both teams (it is public, not asymmetric).

**User requirements:**

- Judge must review and approve the AI-structured version before it is shown to debaters
- Judge can edit any dimension the AI got wrong
- Debaters see the brief only after the draw is published (same logic as motion brief)
- Judge can opt out of AI structuring entirely (plain-text paradigm is still shown)

**Technical requirements:**

- Model: `claude-haiku-4-5-20251001` for extraction
- Input: judge's free-text paradigm
- Output: structured JSON with key dimensions and confidence scores
- Stored in `JudgeParadigm` table linked to `TournamentParticipant`
- "How to win" brief generated per-debate with judge paradigm + motion context
- API: `POST /api/ai/paradigm/structure`, `GET /api/ai/paradigm/brief?judgeId=&motionId=`

**Acceptance criteria:**

- [ ] Structured paradigm is never shown to debaters before judge review/approval
- [ ] Judge can correct any dimension in the structured view
- [ ] "How to win" brief appears only after draw is published
- [ ] Same brief is shown to both teams in the debate (no asymmetry)

---

### Feature 6: Smart Judge Allocation Assist — P2

**Goal:** Reduce time spent on judge assignment by surfacing conflicts and near-violations before the tab director manually assigns.

**How it works:**

1. When the tab director opens the round pairing view to assign judges, the AI assistant runs in the background to pre-check:
   - Institutional conflicts (judge from same institution as a team)
   - Repeat judging (judge has already judged this team N times in the tournament)
   - Experience imbalance in panel (all trainee judges on one debate)
   - Historical biases from previous tournaments (if judge paradigm data exists)
2. Judges flagged with conflicts are visually marked with reasons.
3. AI suggests a full panel allocation for the round — tab director can accept, tweak, or reject.
4. Allocation respects organizer-set priorities (e.g., experienced chairs on top teams).

**Technical requirements:**

- Model: `claude-haiku-4-5-20251001` for constraint satisfaction reasoning
- Input: list of debates + available judges + their institutional affiliations + history
- This can initially be done with deterministic logic (not LLM) enhanced by LLM for edge cases
- Start with deterministic conflict detection first (no LLM), then layer AI suggestions

**Acceptance criteria:**

- [ ] Conflict detection runs before manual assignment opens
- [ ] Conflicts are shown inline with reason (not as a modal warning)
- [ ] AI auto-suggestion can be accepted or rejected with one click
- [ ] All conflict logic is auditable (user can see why a flag was raised)

---

### Feature 7: Real-Time Flow Assistant — P2

**Goal:** Transcribe and structure debate speeches in real time to help judges track argument threads.

**How it works:**

1. In a live ONLINE debate room, a "Flow" panel is available to the judge.
2. The panel listens to the debate audio (via browser speech-to-text API) and auto-populates a flow table: columns per speech slot, rows per argument thread.
3. The AI identifies when an argument from Speech 1 is rebutted in Speech 3 and links them visually.
4. The judge can edit the flow at any time — the AI is a draft tool, not authoritative.

**Technical requirements:**

- Uses browser Web Speech API for transcription (no server-side audio processing in P2)
- AI processing is for argument extraction and linking only (post-transcription)
- Flow data is stored locally per session (not in DB in P2)
- Only available in ONLINE mode with active video call

**Acceptance criteria:**

- [ ] Flow panel does not interfere with video call performance
- [ ] Transcription accuracy >70% in English (baseline without fine-tuning)
- [ ] Judge can disable the panel entirely
- [ ] Flow is private to the judge (not visible to debaters)

---

## 8. Features Explicitly Out of Scope (This PRD)

- **AI-generated ballot verdicts or scores** — the AI never makes a judging decision; it assists humans
- **AI moderation of debates** (detecting rule violations, profanity, etc.) — deferred
- **Cross-tournament AI analytics** (combining data from multiple tournaments) — privacy and complexity
- **Audio/video processing of debate content** server-side — too costly and complex in Phase 1
- **AI translation of ballots** — deferred
- **Automated motion generation** — the AI does not suggest or create motions for organizers
- **Public AI-generated performance rankings** — we do not publish AI-derived skill assessments

---

## 9. Competitive Analysis

| Platform | AI Features Today | Gap Debatera Can Fill |
|---|---|---|
| **Tabroom.com** | None | Everything in this PRD |
| **Tabbycat** | None (algorithmic adjudicator allocation) | Motion research, feedback quality, practice |
| **Speechwire** | None | Everything in this PRD |
| **Symbai** | AI opponent, argument mapping, progress tracking | Lacks tournament integration; coaches data is siloed from competition |
| **PublicForumAI** | AI flow, AI practice rounds, AI casewriter | PF-only; no tournament management; no judge-side tools |
| **ArguFight** | AI-judged debates (3 personality judges) | Casual use only; no integration with real tournaments |

**Debatera's MOAT:** The intersection of tournament data (real judge assignments, real ballots, real standings) with AI tooling. Symbai and PublicForumAI have the AI but none of the tournament context. Tabroom and Tabbycat have the tournament context but none of the AI. Debatera can uniquely own both.

---

## 10. Assumptions & Dependencies

| Assumption/Dependency | Risk if wrong |
|---|---|
| Anthropic API is available with <500ms P95 latency for Haiku and <2s for Sonnet | Add fallback to degrade gracefully (hide AI features, don't block core flow) |
| Judges will write some free-text feedback (even a few words) for the enhancer to work from | Feature degrades to generic suggestions if no text exists — acceptable |
| Motion text is stored in the `TournamentRound.motion` field (confirmed ✓) | — |
| Debaters can read their own `BallotSpeech.comment` values (currently controlled by visibility settings) | Verify `showDebaterNames` / feedback visibility policy in settings |
| Users accept that AI processes their feedback text | Require opt-in consent banner on first use; add privacy note in ToS |
| Anthropic Haiku is cost-efficient enough for per-ballot AI calls | Budget estimate: 500 tokens per ballot × $0.0008/1K tokens = ~$0.0004/ballot — acceptable |

---

## 11. Non-Functional Requirements

### Performance

- AI suggestions on ballots: <2s response time (P95)
- Motion brief generation: <5s first load, <200ms cached
- Practice session AI response: <8s per speech (acceptable given the async nature)
- AI processing never blocks ballot submission or any core tournament operation

### Cost Management

- Haiku for: ballot suggestions, paradigm extraction, conflict detection, feedback analytics aggregation
- Sonnet for: motion research briefs, practice opponent (higher quality needed)
- All AI calls are logged with token counts for cost monitoring
- Practice sessions rate-limited to 10/day per user
- Motion briefs cached indefinitely (same motion → reuse)

### Reliability

- All AI features degrade gracefully: if the API call fails, the UI hides the AI panel silently
- Core flows (ballot submission, round publication, pairings) must work identically without AI
- No AI output is ever required to complete a core workflow

### Privacy & Data

- Ballot feedback text is considered personal educational data
- AI processing of feedback requires user consent (shown on first feature encounter)
- No feedback content is sent to third parties other than the AI API provider
- Practice session content is not used for AI model training (confirm Anthropic API ToS)
- Users can delete their practice history

### Accessibility

- AI-generated text must meet WCAG 2.1 AA contrast and structure standards
- AI panels must be keyboard navigable
- Screen reader support for AI-generated briefs and feedback panels

### Security

- All AI API calls are server-side only — API keys never exposed to client
- Input sanitization before sending user-generated content to AI (strip HTML, enforce max length)
- AI outputs are treated as untrusted user content (rendered as markdown, not raw HTML)
- Rate limiting on all AI API endpoints (per-user, per-tournament)

---

## 12. AI-Specific Requirements

### Model selection rationale

| Use case | Model | Reason |
|---|---|---|
| Ballot feedback suggestions | `claude-haiku-4-5-20251001` | Low latency, simple prompt, cost-sensitive (many ballots) |
| Motion research brief | `claude-sonnet-4-6` | Requires depth, factual accuracy, structured output |
| Feedback analytics aggregation | `claude-haiku-4-5-20251001` | Pattern extraction from text, no creative generation |
| Practice opponent | `claude-sonnet-4-6` | Argumentative quality matters; user tolerance for latency is higher |
| Judge paradigm extraction | `claude-haiku-4-5-20251001` | Classification task; simple input/output |
| Smart allocation conflict explanation | `claude-haiku-4-5-20251001` | Near-deterministic; LLM only for edge case explanations |

### Hallucination mitigation

- Motion briefs: AI is instructed to flag uncertainty with "you may want to verify" language; briefs are explicitly presented as research scaffolds, not authoritative sources
- Ballot suggestions: AI is instructed to suggest dimensions to address, not to state facts about the debate (grounded in what the judge already wrote)
- Feedback analytics: AI is instructed to cite specific ballots that support each pattern, not to invent themes
- Practice opponent: debaters know the opponent is AI — hallucinated "facts" in arguments are explicitly acceptable (it is practice, not a real debate)

### Evaluation methodology

Before shipping each AI feature:

1. **Offline evaluation**: run 50 real ballots through the suggestion system; have judges rate suggestion quality on a 1–5 scale
2. **A/B test**: split judges randomly into AI-assisted and control groups; measure ballot word count, feedback dimension coverage, and debater satisfaction scores
3. **Regression suite**: maintain 20 representative prompt/response pairs per feature as golden set; alert if model upgrades regress quality

### Human review cadence

- Weekly: review a sample of 10% of AI-generated motion briefs for factual accuracy and balance
- Monthly: review flagged AI outputs (any output a user reported as incorrect)
- On model upgrade: run full evaluation suite before switching

---

## 13. Ethical Standards

### Bias & fairness

- Motion research briefs must present both sides with equal depth — prompt engineering enforces this; human review spot-checks for political/ideological slant
- Feedback analytics must not infer or mention demographic characteristics from names or writing patterns
- Practice opponent must not apply different argumentation standards based on user name or institution

### Transparency

- All AI-generated content is clearly labeled with an AI badge
- Users can always see what data was used to generate a result (e.g., "based on your 8 received ballots this season")
- No AI output is presented as coming from a human (judges, organizers, or coaches)

### Opt-out mechanisms

- Every AI feature can be disabled:
  - Per-tournament by the organizer
  - Per-user in profile settings ("disable all AI features")
  - Per-instance by dismissing the panel
- Opting out does not affect access to any core platform functionality

### Data minimization

- Only the minimum necessary data is sent to the AI API (motion text, relevant comments — no names, no IDs)
- User identifiers are never included in AI prompts
- AI processing logs are retained for 30 days then auto-deleted

---

## 14. Technical Implementation Plan

### Integration approach

Use the Anthropic TypeScript SDK (`@anthropic-ai/sdk`). All AI calls are made from Next.js API route handlers (server-side only).

**New environment variables required:**
```
ANTHROPIC_API_KEY=
AI_ENABLED=true          # global kill switch
AI_PRACTICE_RATE_LIMIT=10  # sessions per user per day
```

**New API routes (Phase 1):**
```
POST /api/ai/ballot-feedback-suggestions
POST /api/ai/motion-brief
GET  /api/ai/motion-brief?roundId=
```

**New API routes (Phase 2):**
```
POST /api/practice/sessions
POST /api/practice/sessions/[id]/speak
GET  /api/practice/sessions
GET  /api/practice/sessions/[id]
POST /api/ai/paradigm/structure
GET  /api/ai/paradigm/brief
GET  /api/participants/[id]/feedback-analysis
```

### Architectural fit

Follows existing patterns from [`docs/dev/architecture.md`](../dev/architecture.md) and [`.claude/docs/architectural_patterns.md`](../../.claude/docs/architectural_patterns.md):

- New `src/lib/ai/` directory for AI service layer (analogous to `src/lib/ballots/`, `src/lib/pairings/`)
- Each feature gets its own file: `ballot-suggestions.ts`, `motion-brief.ts`, `practice.ts`, etc.
- AI service functions called from API route handlers (not server actions — AI calls are async and need streaming capability)
- Zod schemas for all AI prompt inputs and structured outputs
- No direct Anthropic SDK calls from components — always via API routes

### Database migrations required for Phase 1

```prisma
// Add to schema.prisma

model MotionBrief {
  id         String   @id @default(cuid())
  motionHash String   @unique
  format     String
  content    Json
  createdAt  DateTime @default(now())
}
```

### Cost estimate (Phase 1)

Assumptions: 100 tournaments/month, 20 rounds/tournament, 10 debates/round, 3 judges/debate

| Feature | Calls/month | Avg tokens | Cost/month (est.) |
|---|---|---|---|
| Ballot feedback suggestions | 60,000 | 800 | ~$38 (Haiku) |
| Motion brief generation | 2,000 | 2,000 | ~$18 (Sonnet) |
| **Phase 1 total** | | | **~$56/month** |

At Phase 2 scale with practice sessions (assuming 10% of 5,000 debaters do 3 sessions/month):

| Feature | Calls/month | Avg tokens | Cost/month (est.) |
|---|---|---|---|
| Phase 1 features | — | — | $56 |
| Practice sessions (all turns) | 4,500 | 3,000 | ~$67 (Sonnet) |
| Feedback analytics | 5,000 | 1,000 | ~$3 (Haiku) |
| **Phase 2 total** | | | **~$126/month** |

---

## 15. Go-to-Market Approach

### Launch phases

**Phase 1 (soft launch — AI Ballot Feedback + Motion Research)**
- Enable for 2–3 partner tournaments with trusted organizers
- Collect feedback via post-tournament survey
- Iterate on prompt quality before general availability
- Announce via tournament directors newsletter: "Debatera now helps judges write better feedback"

**Phase 2 (general availability — Practice Opponent)**
- Open to all users
- Launch during off-season (no active tournaments) to build engagement habit
- Content: "Practice for free anytime, anywhere" — positions Debatera as year-round tool
- Referral hook: share a practice session summary to invite teammates

**Phase 3 (analytics + paradigm intelligence)**
- Coach-first launch: reach out to debate coaches directly
- Framing: "Finally see your students' patterns across the whole season"

### Value demonstration in first session

- First-time judge: AI feedback panel appears on first ballot with a clear "Here's how to use this" tooltip
- First-time debater: Motion brief button is highlighted on the round page with a "New: AI Research Brief" badge
- First-time coach: Dashboard surfaces a "Feedback Analytics ready for [student name]" notification when 3 ballots are received

---

## 16. Timeline

| Phase | Features | Target |
|---|---|---|
| **Phase 1** | AI Ballot Feedback Enhancer, Motion Research Assistant | Q3 2026 |
| **Phase 2** | AI Practice Opponent, Feedback Analytics Dashboard, Judge Paradigm Intelligence | Q4 2026 |
| **Phase 3** | Smart Judge Allocation Assist, Real-Time Flow Assistant | Q1–Q2 2027 |

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|---|---|---|
| 1 | Do we need explicit user consent for AI processing feedback text, or does ToS coverage suffice? | Legal | Q2 2026 |
| 2 | What is the feedback visibility policy? Can debaters currently read their ballot comments? Are there settings that hide them? | Engineering | Before Phase 1 |
| 3 | Should motion briefs be visible to debaters before they submit their own arguments (prep time), or only after? | Product | Q2 2026 |
| 4 | Should the practice opponent be available as a free feature or part of a paid tier? | Business | Q3 2026 |
| 5 | For the feedback analytics, does "season" mean per-tournament or across the whole year? What defines a season boundary? | Product | Q3 2026 |
| 6 | Is Anthropic's API ToS compatible with processing student educational data (minors)? Review required for EU/GDPR compliance. | Legal | Q2 2026 |
| 7 | Should AI-generated motion briefs be moderated before publication? Who reviews flagged briefs? | Ops | Phase 1 |
| 8 | What happens when a judge writes feedback in Bulgarian (or other non-English languages)? Does the suggestion engine work multilingually? | Engineering | Phase 1 |

---

## 18. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-30 | AI never generates ballot scores or verdicts | Judging integrity is non-negotiable; AI assisting human judgment is acceptable, AI replacing it is not |
| 2026-03-30 | Start with text-based practice (no audio) | Voice transcription accuracy and latency add significant complexity; text-first ships faster and still validates the core value |
| 2026-03-30 | Cache motion briefs indefinitely | Same motion generates the same brief; caching eliminates 99% of API costs for repeat motions across tournaments |
| 2026-03-30 | Use Haiku for high-volume, Sonnet for quality-sensitive features | Cost/quality tradeoff; Haiku is 10–20x cheaper for classification/extraction tasks |
| 2026-03-30 | AI features always degrade gracefully | Core tournament operations must never depend on a third-party AI API being available |

---

*This is a living document. All sections should be updated as decisions are made, features are scoped, or requirements change.*
