# Debatera AI Judge — Архитектура на агентната система

> **Автор:** Архитектурно предложение на база проучване на Debatrix, MAD frameworks, WSDC judging criteria
> **Дата:** 20 март 2026
> **Статус:** Проектна фаза — за дискусия и итерация

---

## 1. Анализ на твоята оригинална идея

### Какво работи добре

1. **Мулти-модел диверсификация** — изследванията потвърждават, че използването на различни LLM модели (GPT, Gemini, Claude, Grok) за една и съща задача намалява individual bias и повишава точността. Това е една от най-силните страни на идеята ти.

2. **Disputer механизмът с ограничени ходове (Concede / Clarify / Counter / Reframe)** — това е оригинално и умно решение. В research литературата подобен подход се описва като "rationale alignment" — агентите обясняват и защитават позициите си с конкретни цитати, което води до по-качествени решения. Запазвам този елемент.

3. **Разделяне на анализа по модули/измерения** — съвпада с Debatrix подхода и с WSDC критериите. Вместо един монолитен "judge", по-добре е да се анализират различни аспекти поотделно.

### Какво трябва да се промени

1. **Твърде много агенти** — 5 модула × 3 специалисти = 15 LLM calls само за оценка, плюс disputer рундове, плюс агрегация. Реално става 30-50+ API извиквания на дебат. Това е скъпо, бавно и не е доказано, че повече агенти = по-добър резултат. Изследване от 2025 (Wu et al.) показва, че **точността на най-силния агент е горната граница на целия екип** — добавянето на слаби модели не я надвишава.

2. **Debate Map агентът е single point of failure** — ако той сгреши четенето на дебата, всички downstream агенти ще работят с грешна информация. По-добрият подход (доказан от Debatrix) е **итеративен хронологичен анализ** — обработка реч по реч, където всяка нова реч се анализира в контекста на предходните.

3. **Модулите не съвпадат с WSDC критериите** — твоите модули (аргументация, clash, weighing, модел/метод, POI) са по-скоро дебатни концепции, а не scoring dimensions. WSDC оценява: Content (40%), Style (40%), Strategy (20%). За текстов анализ (без аудио) Style е ограничен, но Strategy и Content могат да се оценят пълноценно.

4. **Липсва итеративност** — в твоята схема дебатът се подава наведнъж. Debatrix доказва, че обработка реч-по-реч значително подобрява резултатите, особено за дълги дебати с много смени на говорителите.

---

## 2. Изследователски фундамент

### Debatrix (ACL 2024) — Най-релевантната система

Debatrix е мулти-измерен AI съдия с **iterative chronological analysis**:
- Обработва речите **една по една**, в хронологичен ред
- За всяка реч генерира **анализ + оценка** в контекста на всичко казано досега  
- Използва **memory система** — context memory (какво е казано) + analysis memory (как е оценено)
- Работи по **множество измерения** паралелно (Argument, Source, Language)
- Накрая **обобщава** измеренията с тежести

**Ключов резултат:** Debatrix с ChatGPT **(слаб модел!)** надминава голия GPT-4 **(силен модел)** по точност. Архитектурата компенсира слабостта на модела.

### Multi-Agent Debate (MAD) литература

- **Agent heterogeneity** подобрява резултатите, но с diminishing returns
- **Умерено несъгласие** е по-добро от максимално
- **Majority pressure** може да потисне правилни, но малцинствени мнения
- **Productive initial chaos** — леко начално несъгласие помага, защото принуждава агентите да инспектират, а не да копират

### WSDC Scoring (за текстов анализ)

| Критерий | Тежест | Текстово оценим? |
|----------|--------|------------------|
| Content (Matter) — какво казват | 40% | ✅ Да, напълно |
| Style (Manner) — как го казват | 40% | ⚠️ Частично (реторични фигури, яснота, език — да; глас, темпо, жестове — не) |
| Strategy (Method) — защо го казват | 20% | ✅ Да, напълно |

Решение: за текстов анализ пренормираме — Content 50%, Strategy 25%, Text-Style 25%.

---

## 3. Предложена архитектура: "Chronological Multi-Lens Judge"

### Обща философия

Вместо много агенти, които анализират цял дебат наведнъж → **малко агенти, които анализират реч по реч, от различни ъгли, и след това калибрират мненията си**.

### 3.1. Фаза 1: Предварителен контекст (Pre-Processing)

**Агент: Context Builder**
- Вход: Motion (тезата), Info Slide (ако има), формат (WSDC), страни (Prop/Opp)
- Задача: Генерира **judging framework** за конкретната теза:
  - Какви са очакваните ядрени въпроси (core issues)?
  - Каква би била разумна дефиниция?
  - Какви бурдени (burdens) носи всяка страна?
- Изход: `DebateContext` — споделен контекст за всички следващи агенти
- Модел: Един силен модел (Claude Sonnet или GPT-4o)
- **API calls: 1**

> **Защо:** Истинският съдия също си прави ментална рамка преди да чуе речите. Този контекст предотвратява bias от първата реч.

### 3.2. Фаза 2: Итеративен хронологичен анализ (Core Analysis)

Това е сърцето на системата. За **всяка реч** (8 речи в WSDC), **три паралелни леща** анализират текста:

#### Леща A: Content Analyst (Съдържание)
- Оценява: Claim-Warrant-Impact верига, логическа валидност, релевантност, доказателства
- Проследява: Кои аргументи са нови, кои са rebuttals, кои са drops
- Обновява: Вътрешна "Argument Map" след всяка реч

#### Леща B: Strategy Analyst (Стратегия)
- Оценява: Приоритизация на въпроси, time allocation, team coherence, framing
- Проследява: Кои ключови въпроси са адресирани и кои — игнорирани
- Обновява: "Issue Tracker" — кой печели кой clash

#### Леща C: Engagement Analyst (Ангажираност и стил)
- Оценява: Качество на clash, POI взаимодействия, реторична ефективност (от текста)
- Проследява: Direct responses vs. ships passing, weighing quality
- Обновява: "Clash Matrix" — кой е отговорил на какво

**Важно:** Всяка леща получава:
1. `DebateContext` от Фаза 1
2. **Собствената си предходна анализа** (memory) — не сурови речи
3. **Текущата реч** (само нея в оригинал)

Това е ключовата иновация от Debatrix — LLM-ът работи с кратък контекст (анализ + една реч), а не с целия дебат, което подобрява качеството.

**Модел диверсификация:**
- Леща A: Model 1 (напр. Claude Sonnet)
- Леща B: Model 2 (напр. GPT-4o-mini)  
- Леща C: Model 3 (напр. Gemini 2.0 Flash)

**API calls: 3 лещи × 8 речи = 24 calls** (паралелизируеми по лещи — реално 8 последователни стъпки, всяка с 3 паралелни calls)

### 3.3. Фаза 3: Синтез по леща (Per-Lens Verdict)

След като всички 8 речи са обработени, всяка леща генерира:
1. **Оценка по говорител** — score (60-80 за WSDC) + коментар
2. **Verdict по своето измерение** — коя страна печели в Content / Strategy / Engagement
3. **Ключови моменти** — turning points, най-силни аргументи, критични drops

**API calls: 3** (по 1 на леща, паралелно)

### 3.4. Фаза 4: Калибрация (вместо Disputer)

Тук запазвам и подобрявам идеята ти за Disputer, но я правя по-фокусирана.

**Агент: Calibrator**
- Вход: Трите verdict-а от лещите
- Задача:
  1. Идентифицира **точки на несъгласие** между лещите
  2. За всяка точка на несъгласие, представя **и двете позиции с цитати**
  3. Прави **final call** по спорните точки, обяснявайки защо

**Constrained resolution** (адаптирано от твоята идея):
- `ALIGN` — лещата е права, другите се съгласяват
- `OVERRIDE` — лещата е сгрешила, ето защо (с цитат от дебата)
- `WEIGHT_SHIFT` — и двете са валидни, но едната е по-важна за крайния резултат

- Модел: **Най-силният наличен модел** (Claude Opus или GPT-4o) — калибраторът е критичен
- **API calls: 1**

> **Защо не 3 специалиста + disputer цикъл?** Изследванията показват, че strongest agent accuracy ≈ ceiling на team accuracy. По-добре е да сложиш един силен модел на калибрация, отколкото да караш 3 средни да спорят.

### 3.5. Фаза 5: Финален балот (Final Ballot)

**Агент: Ballot Writer**
- Вход: Калибрирани резултати от Фаза 4
- Задача: Генерира WSDC-compliant ballot:
  - Оценки по говорител (Content, Style, Strategy scores)
  - Обосновано решение за победител
  - Конструктивен feedback за всеки говорител
  - Turning points в дебата
- Формат: Структуриран JSON + human-readable text
- Модел: Силен модел (Claude Sonnet или GPT-4o)
- **API calls: 1**

---

## 4. Пълен pipeline — резюме

```
┌─────────────────────────────────────────────────────┐
│  ФАЗА 1: Context Builder                           │
│  Motion + Format → DebateContext                     │
│  [1 API call]                                        │
└──────────────────────┬──────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐     ┌──────────┐     ┌──────────────┐
│ Леща A  │     │ Леща B   │     │  Леща C      │
│ Content │     │ Strategy │     │ Engagement   │
│ (Model1)│     │ (Model2) │     │  (Model3)    │
└────┬────┘     └────┬─────┘     └──────┬───────┘
     │               │                  │
     │    ╔══════════╧══════════╗       │
     │    ║ За всяка от 8 речи: ║       │
     │    ║ анализирай реч →    ║       │
     │    ║ обнови memory →     ║       │
     │    ║ продължи            ║       │
     │    ╚══════════╤══════════╝       │
     │               │                  │
     ▼               ▼                  ▼
┌─────────┐     ┌──────────┐     ┌──────────────┐
│ Verdict │     │ Verdict  │     │   Verdict    │
│    A    │     │    B     │     │      C       │
└────┬────┘     └────┬─────┘     └──────┬───────┘
     │               │                  │
     └───────────────┼──────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │  ФАЗА 4: Calibrator │
          │  Разреши несъгласия │
          │  [Най-силен модел]  │
          │  [1 API call]       │
          └──────────┬──────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │ ФАЗА 5: Ballot      │
          │ Writer              │
          │ [1 API call]        │
          └─────────────────────┘
```

**Общо API calls: 1 + 24 + 3 + 1 + 1 = 30**
**При паралелизация: 1 + 8 стъпки + 1 + 1 + 1 = 12 последователни стъпки**

---

## 5. Сравнение с твоята оригинална идея

| Аспект | Твоята идея | Моето предложение |
|--------|-------------|-------------------|
| Брой агенти | 15+ специалисти + disputers + aggregator | 3 лещи + 1 calibrator + 1 ballot writer |
| Подход за анализ | Цял дебат наведнъж | Реч по реч (итеративно) |
| Модел диверсификация | ✅ 3 модела на модул | ✅ 3 модела (по 1 на леща) |
| Dispute resolution | ✅ Concede/Clarify/Counter/Reframe | ✅ Align/Override/Weight_Shift |
| API calls | ~50-80 | ~30 |
| Memory система | ❌ Няма | ✅ Analysis memory per леща |
| Debate Map | ✅ Предварителен | ✅ Строи се инкрементално |
| Базиран на research | Оригинална концепция | Debatrix + MAD литература |
| WSDC alignment | Частично | Директно |

---

## 6. Детайлен дизайн на всеки агент

### 6.1. Context Builder — System Prompt (концепция)

```
You are preparing to judge a WSDC-format debate.

MOTION: "{motion}"
INFO SLIDE: "{info_slide or 'None'}"
FORMAT: World Schools Debate Championship
- 3 constructive speeches per side (8 min each)
- 1 reply speech per side (4 min each)
- Points of Information allowed in middle 6 minutes

Before hearing any speeches, establish your judging framework:
1. What are the CORE ISSUES this motion raises?
2. What would be a REASONABLE definition/interpretation?
3. What BURDENS does each side carry?
4. What would each side NEED TO PROVE to win?

Be neutral. Do not pre-judge which side is stronger.
Output as structured JSON.
```

### 6.2. Lens Analyst — System Prompt (концепция за Content Lens)

```
You are a specialist debate analyst focusing on CONTENT quality.
You will analyze speeches ONE AT A TIME, in chronological order.

Your analysis memory so far:
{previous_analysis_summary}

The debate context:
{debate_context}

Now analyze Speech {n} by {speaker_name} ({side}):
---
{speech_text}
---

Evaluate:
1. NEW ARGUMENTS: What new claims are made? 
   Rate each: claim strength (1-5), warrant quality (1-5), impact (1-5)
2. REBUTTALS: What opponent arguments are addressed?
   Rate each: accuracy of engagement (1-5), strength of response (1-5)
3. DROPS: What important opponent arguments are NOT addressed?
4. EVIDENCE: Quality and relevance of examples/evidence used
5. OVERALL CONTENT SCORE for this speech (60-80 WSDC scale)

Update your running analysis:
- Argument tracker: [list all live arguments per side]
- Rebuttal tracker: [what has been responded to]
- Drop tracker: [what has been ignored]

Output as structured JSON.
```

### 6.3. Calibrator — System Prompt (концепция)

```
You are the Chief Adjudicator calibrating three specialist analyses 
of a WSDC debate.

CONTENT VERDICT: {lens_a_verdict}
STRATEGY VERDICT: {lens_b_verdict}  
ENGAGEMENT VERDICT: {lens_c_verdict}

Your task:
1. IDENTIFY disagreements between the three analyses
2. For each disagreement:
   a. State both positions with supporting evidence from the debate
   b. Make a CALIBRATED decision using one of:
      - ALIGN: One analysis is correct, adopt it
      - OVERRIDE: One analysis made an error, here's why
      - WEIGHT_SHIFT: Both valid, but one matters more for final result
3. Produce FINAL SCORES per speaker (60-80 scale)
4. Declare WINNER with clear reasoning

CRITICAL: Your decision must be based on what happened IN THE DEBATE,
not on the theoretical strength of either side's position.
The team that better proved their case in the actual debate wins.

Scoring weights: Content 50%, Strategy 25%, Text-Style 25%
```

---

## 7. Критични дизайн решения

### 7.1. Защо 3 лещи, а не 5 модула?

Твоите 5 модула (Аргументация, Clash, Weighing, Модел/Метод, POI) имат значително припокриване:
- "Clash" е част от "Аргументация" (rebuttals)
- "Weighing" е част от "Стратегия" (приоритизация)
- "Модел/Метод" е рядко решаващ и може да се обработи от Strategy леща
- "POI" е микро-елемент в WSDC

Трите лещи (Content, Strategy, Engagement) покриват всичко без припокриване и директно mapping-ват към WSDC scoring.

### 7.2. Защо итеративен, а не batch анализ?

Debatrix доказва експериментално, че при дебати с много речи (като WSDC — 8 речи):
- Batch анализ деградира с увеличаване на дебата (context window limits, attention drift)
- Итеративен анализ поддържа стабилна точност
- Memory механизмът компресира информация без загуба на критични детайли

### 7.3. Защо 1 Calibrator, а не disputer цикъл?

- Research показва: "strongest agent accuracy ≈ ceiling"
- Един силен модел (Opus/GPT-4o) с пълния контекст на несъгласието е по-ефективен от 3 средни модела, спорещи помежду си
- Disputer цикъл добавя 6-12 допълнителни API calls с marginal improvement
- Но: ако бюджетът позволява, може да се добави **optional dispute round** — виж секция 8

### 7.4. Как се справяме с Style/Manner без аудио?

Текстово оценяемо от Style:
- Реторични въпроси, анафора, метафори
- Яснота на изразяване
- Использване на хумор или емоционални апели
- Структура и signposting
- POI interactions (текст)

Текстово НЕоценяемо:
- Темпо и паузи
- Обем на гласа
- Eye contact, жестове
- Интонация

**Решение:** Engagement леща покрива текстовите аспекти на Style. Балотът изрично отбелязва: "Style scores are based on textual analysis only and do not reflect delivery."

---

## 8. Бъдещи разширения (ако бюджетът позволява)

### 8.1. Optional Dispute Round

Ако Calibrator-ът намери сериозно несъгласие (>10 точки разлика в score):
1. Изпрати спорния момент обратно на засегнатата леща
2. Лещата отговаря с Concede/Clarify/Counter/Reframe (твоята идея!)
3. Calibrator-ът прави окончателно решение

Добавя: 1-3 API calls само при нужда

### 8.2. Argument Map Визуализация

След Фаза 2, от Content леща memory може да се генерира визуална карта на дебата:
- Аргументи на Prop vs Opp
- Линии на clash
- Drops (маркирани в червено)
- Turning points

Това е учебно средство за дебатьорите.

### 8.3. Speaker-Level Coaching

От Ballot Writer може да се генерира персонализиран coaching report:
- "Speaker 1 (Prop): Силни warrants, но не engage-ва 2-рия аргумент на Opp"
- "Speaker 2 (Opp): Добра стратегия, но examples са generic"

### 8.4. Confidence Scoring

Всяка леща може да изразява confidence (1-10) за оценките си. Калибраторът може да тежи по-високо confident оценки.

### 8.5. Multi-Model Rotation

За tournament-level fairness, моделите на лещите могат да се ротират между дебати, за да се избегне systematic bias на конкретен LLM.

---

## 9. Технически съображения за Debatera интеграция

### 9.1. Data Model (Prisma extension)

```prisma
model AIJudgingSession {
  id            String   @id @default(cuid())
  debateId      String
  debate        TournamentDebate @relation(fields: [debateId])
  status        AIJudgingStatus  // PENDING, ANALYZING, CALIBRATING, COMPLETE
  debateContext Json     // Output from Context Builder
  createdAt     DateTime @default(now())
  
  lensAnalyses  LensAnalysis[]
  calibration   Calibration?
  aiBallot      AIBallot?
}

model LensAnalysis {
  id         String  @id @default(cuid())
  sessionId  String
  session    AIJudgingSession @relation(fields: [sessionId])
  lensType   LensType  // CONTENT, STRATEGY, ENGAGEMENT
  modelUsed  String    // "claude-sonnet-4", "gpt-4o-mini", etc.
  
  speechAnalyses Json   // Array of per-speech analyses
  verdict        Json   // Final verdict for this lens
  confidence     Float  // 0-1 confidence score
}

model Calibration {
  id          String  @id @default(cuid())
  sessionId   String  @unique
  session     AIJudgingSession @relation(fields: [sessionId])
  modelUsed   String
  
  disagreements Json   // Identified disagreements
  resolutions   Json   // How each was resolved
  finalScores   Json   // Calibrated speaker scores
  winner        String // PROPOSITION or OPPOSITION
  reasoning     String // Why this team won
}

model AIBallot {
  id          String  @id @default(cuid())
  sessionId   String  @unique
  session     AIJudgingSession @relation(fields: [sessionId])
  
  speakerScores Json   // Per-speaker Content/Strategy/Style scores
  winner        String
  feedback      Json   // Per-speaker feedback
  turningPoints Json   // Key moments
  confidence    Float  // Overall confidence
  disclaimer    String // "AI-generated, text-only analysis"
}

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
```

### 9.2. API Architecture

```
POST /api/tournaments/{id}/debates/{debateId}/ai-judge/start
  → Creates AIJudgingSession, starts async pipeline

GET /api/tournaments/{id}/debates/{debateId}/ai-judge/status
  → Returns current status + progress (e.g., "Analyzing speech 5/8")

GET /api/tournaments/{id}/debates/{debateId}/ai-judge/result
  → Returns complete AIBallot when status = COMPLETE

POST /api/tournaments/{id}/debates/{debateId}/ai-judge/retry
  → Retries failed session
```

### 9.3. Execution Engine

Препоръчвам server-side execution с queue:
- **BullMQ** (или подобна) за job queue
- Всяка фаза е отделен job
- Паралелни API calls за трите лещи
- Retry logic за failed API calls
- Progress tracking за UI (Server-Sent Events)

---

## 10. Оценка на разходите (приблизителна)

За един WSDC дебат (~8 речи, ~2000 думи на реч = ~16,000 думи общо):

| Фаза | API calls | Approx tokens in/out | Estimated cost* |
|------|-----------|---------------------|-----------------|
| Context Builder | 1 | 500 / 800 | $0.01 |
| Lens Analysis (3 × 8) | 24 | 2000 / 1000 each | $0.50 |
| Per-Lens Verdict | 3 | 5000 / 2000 | $0.10 |
| Calibrator | 1 | 8000 / 3000 | $0.15 |
| Ballot Writer | 1 | 5000 / 3000 | $0.10 |
| **Общо** | **30** | | **~$0.85** |

*При средни цени на API models (Claude Sonnet / GPT-4o-mini / Gemini Flash mix)

---

## 11. Отворени въпроси за дискусия

1. **Transcript source**: Как се получава текстът на речите? Транскрипция от аудио? Ръчно въведен? Това влияе на качеството.

2. **Real-time vs. post-hoc**: Системата работи ли по време на дебата или след него?

3. **AI Judge роля**: Замества ли истински съдия, или е допълнителен feedback tool?

4. **Budget constraint**: Колко можеш да отделиш за API calls на дебат?

5. **Format flexibility**: Само WSDC или и BP/Policy в бъдеще?

6. **Evaluation**: Как ще валидираме системата? Ще сравняваме ли AI ballot с реален съдийски ballot?
