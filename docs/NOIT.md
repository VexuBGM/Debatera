# Debatera – Платформа за Организация и Провеждане на Дебатни Турнири

> **Актуализирано:** 19 февруари 2026  
> **Версия:** MVP (в активна разработка)  
> **Базиран на:** текущо състояние на repository + NOIT-raw.md

---

## A) TL;DR

**Debatera** е уеб платформа за организация и провеждане на състезания по дебати (онлайн или на живо), която обединява в едно всички основни инструменти:
- **Табулация** (регистрация, отбори, пейринги, рундове) – аналог на Tabbycat/SpeechWire
- **Видео стаи** за дебати (онлайн формат) – интеграция със Stream.io
- **Вграден таймер** с персонализирани сигнали – заменя външни таймери
- **Балотиране и резултати** – WSDC формат с автоматично изчисляване на победители
- **Фийдбек система** – съдиите дават обратна връзка на отборите директно в платформата

За разлика от сегашната практика (използване на 4+ отделни платформи – Tabbycat, Discord, таймер и др.), Debatera предлага интегрирано решение за **организатори**, **съдии** и **дебатьори**.

---

## B) Проблемът

### Текущата фрагментация в онлайн дебатите

При организацията на онлайн дебатни състезания се използват **множество несвързани платформи**:

1. **Tabbycat / SpeechWire** – за табулация (отбори, пейринги, резултати)
2. **Discord / Zoom** – за видео комуникация и казване на речите
3. **Таймер** (външен или споделен екран) – за следене на времето
4. **Ръчен обмен на информация** – копиране на данни между платформи, търсене на стаи, изпращане на линкове

### Последици за участниците

- **Организатори:** трябва ръчно да синхронизират информация между платформи, да следят дали всички са получили правилния линк към стаята, да управляват достъпа
- **Дебатьори:** трудно ориентиране – къде е стаята, срещу кой играят, колко време остава ако забравят таймера
- **Съдии:** фийдбъкът се дава в Discord/email или се губи – няма централизиран архив за развитие на участниците

---

## C) Решението

**Debatera** обединява целия процес в **една платформа**:

1. **Единна регистрация** – институции записват отбори и съдии
2. **Автоматични пейринги** – генериране на двойки отбори + назначаване на съдии (с constraint-и: без двубой от една институция, без повторения)
3. **Дебатни стаи** – всеки участник влиза в своята стая за рунда, вижда съперника, съдията, мотона и таймера
4. **Синхронизиран таймер** – shared state между всички в стаята (start/pause/reset)
5. **Видео повикване** (за онлайн турнири) – вградена функционалност чрез Stream.io
6. **Балотиране** – съдиите попълват резултати и фийдбек в структуриран формат (WSDC: 8 речи + гласуване)
7. **Автоматично изчисляване** на резултати и класиране

**Крайна цел:** организаторът създава турнир, участниците се регистрират, системата прави пейринги, хората влизат в стаите си, дебатират, съдията дава резултат – всичко на едно място.

---

## D) Текущо състояние на проекта

### ✅ Имплементирано (реално работи в кода)

#### Базова инфраструктура
- **Auth система** – пълна интеграция с Clerk ([src/app/layout.tsx](src/app/layout.tsx), [src/lib/ensureUser.ts](src/lib/ensureUser.ts))
- **User sync** – всеки Clerk user се синхронизира в локална DB с firstName/lastName/imageUrl ([prisma/schema.prisma](prisma/schema.prisma) → User model)
- **Webhook обработка** – Clerk webhooks за създаване/обновяване на users ([src/app/api/webhooks/clerk/route.ts](src/app/api/webhooks/clerk/route.ts))

#### Институции
- **Създаване/управление** на институции (училища, клубове, университети) ([src/app/api/institutions/route.ts](src/app/api/institutions/route.ts))
- **Членства** с роли (ADMIN/MEMBER) – ([prisma/schema.prisma](prisma/schema.prisma) → InstitutionMember, InstitutionRole)
- **Invitations система** – покани за присъединяване към институция ([prisma/schema.prisma](prisma/schema.prisma) → InstitutionInvitation)
- **Notifications** – уведомления за покани и други системни събития ([src/app/api/notifications/route.ts](src/app/api/notifications/route.ts))

#### Турнири – основна логика
- **Създаване на турнири** ([src/app/api/tournaments/route.ts](src/app/api/tournaments/route.ts))
- **Tournament Settings** – дебатен формат (WSDC), режим (ONLINE/IRL), размер на отборите, регистрационни прозорци ([prisma/schema.prisma](prisma/schema.prisma) → TournamentSettings)
- **Регистрация на институции** – институциите кандидатстват за участие (PENDING/APPROVED/REJECTED) ([src/app/api/tournaments/[id]/institution-registrations/route.ts](src/app/api/tournaments/[id]/institution-registrations/route.ts))
- **Регистрация на участници** – с роли DEBATER/JUDGE ([src/app/api/tournaments/[id]/participants/route.ts](src/app/api/tournaments/[id]/participants/route.ts))
- **Team size constraints** – min/max дебатьори в отбор

#### Отбори
- **TournamentTeam model** – отборите се създават от админ на институция ([prisma/schema.prisma](prisma/schema.prisma) → TournamentTeam)
- **Drag & Drop** team builder – визуален редактор за назначаване на дебатьори към отбори ([src/actions/teams.actions.ts](src/actions/teams.actions.ts))
- **Auto-generated team names** – "Institution Name 1", "Institution Name 2" и т.н.
- **Constraint:** един участник може да е само в един отбор ([TournamentTeamMember.participantId](prisma/schema.prisma) unique)

#### Рундове и пейринги
- **TournamentRound** model – създаване на рундове с номер, име, мотон, статус ([prisma/schema.prisma](prisma/schema.prisma))
- **Round status lifecycle** – DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED ([docs/rounds.md](docs/rounds.md))
- **TournamentDebate** – пейринги (Proposition vs Opposition) + BYE логика ([prisma/schema.prisma](prisma/schema.prisma) → TournamentDebate)
- **Judge assignment** – назначаване на съдии към дебати с роли CHAIR/PANELIST ([TournamentDebateJudge](prisma/schema.prisma))
- **Auto-pairing generator** – API endpoint за автоматично генериране на пейринги ([src/app/api/tournaments/[id]/rounds/[roundId]/generate/route.ts](src/app/api/tournaments/[id]/rounds/[roundId]/generate/route.ts))
- **Manual pairing editor** – API за ръчно редактиране на пейринги ([src/app/api/tournaments/[id]/rounds/[roundId]/pairings/route.ts](src/app/api/tournaments/[id]/rounds/[roundId]/pairings/route.ts))
- **Motion & InfoSlide fields** – рунд може да има тема (motion) и контекстна информация ([prisma/schema.prisma](prisma/schema.prisma) → TournamentRound.motion, infoSlide)

#### Venues (за IRL турнири)
- **Venue management** – дефиниране на физически стаи ([prisma/schema.prisma](prisma/schema.prisma) → Venue)
- **VenueCategory** – категоризация (напр. "Wheelchair Accessible", "Building A") ([src/app/api/tournaments/[id]/venues](src/app/api))
- **Venue priority** – приоритизация при авто-разпределение на стаи

#### Балоти и резултати (WSDC формат)
- **Ballot model** – един балот на съдия на дебат ([prisma/schema.prisma](prisma/schema.prisma) → Ballot)
- **BallotSpeech** – оценки за всяка от 8-те речи (PROP_1, OPP_1, ... PROP_REPLY, OPP_REPLY) ([prisma/schema.prisma](prisma/schema.prisma))
- **Ballot status** – DRAFT → SUBMITTED ([BallotStatus](prisma/schema.prisma))
- **Voting** – всеки съдия избира winning side (PROPOSITION/OPPOSITION)
- **DebateResult** – автоматично изчислен резултат (win count + average scores) ([prisma/schema.prisma](prisma/schema.prisma) → DebateResult)
- **Chair tiebreaker** – decidedByChair flag при равен брой гласове
- **API endpoints** – GET/PUT ballot, POST submit ([src/app/api/ballots](src/app/api/ballots))

#### Видео повиквания
- **Stream.io integration** – VideoCall model за дебати ([prisma/schema.prisma](prisma/schema.prisma) → VideoCall)
- **Token generation** – API endpoint за получаване на Stream токени ([src/app/api/stream/token/route.ts](src/app/api/stream/token/route.ts))
- **Call creation** – автоматично създаване на call per debate ([src/app/api/stream/calls/ensure/route.ts](src/app/api/stream/calls/ensure/route.ts))

#### Дебатна стая – таймер
- **DebateStopwatch model** – синхронизиран таймер състояние (running, elapsed, version) ([prisma/schema.prisma](prisma/schema.prisma) → DebateStopwatch)
- **REST API** – GET/PUT stopwatch state ([src/app/api/debates/[debateId]/stopwatch/route.ts](src/app/api/debates/[debateId]/stopwatch/route.ts))
- **SyncedStopwatch component** – React компонент за таймер UI ([src/components/debate/SyncedStopwatch.tsx](src/components/debate/SyncedStopwatch.tsx))

---

### 🚧 Частично имплементирано / В процес

#### UI за дебатна стая
- **Какво има:** синхронизиран таймер компонент
- **Какво липсва:** пълен UI за стаята (видео layout, списък участници, показване на motion, интерфейс за POI)
- **Следваща стъпка:** създаване на `/tournaments/[id]/rounds/[roundId]/debates/[debateId]/room` маршрут с Stream video интеграция

#### Standings (класиране)
- **Какво има:** data model за DebateResult с wins/points
- **Какво липсва:** UI страница за класиране + API endpoint за сортиране на отбори
- **Следваща стъпка:** изчисляване на standings от DebateResult → показване в UI

#### Judge panel roles
- **Какво има:** enum JudgeRole (CHAIR/PANELIST) в schema
- **Какво липсва:** enforce на constraint "exactly 1 CHAIR per debate", UI индикация
- **Следваща стъпка:** валидация при publish на round + badge в UI

#### Feedback/Comments система
- **Какво има:** поле за коментари в BallotSpeech и Ballot (privateNotes)
- **Какво липсва:** dedicated UI view за дебатьорите да виждат архив от фийдбък
- **Следваща стъпка:** страница `/profile/feedback-history`

---

### 📝 Планирано (бъдещо)

#### POI (Point of Information)
- Режим за автоматично активиране на микрофон при POI
- Логване на POI бомбардиране (кой/кога направи POI)
- Два варианта: POI на сигнал vs POI standard

#### AI опонент
- Интеграция с AI API за дебатиране срещу бот
- Нива на трудност (easy/medium/hard)

#### Elo/Рейтинг система
- League mode като chess.com
- Ranking на играчи

#### Advanced pairing algorithms
- Swiss pairing (power-pairing)
- Bubble sorting
- Pull-up/pull-down logic
- Constraint satisfaction (избягване на конфликти)

#### Export функционалност
- CSV export на резултати
- PDF ballots за печат

#### IRL logistics
- Информация за настаняване (хотели)
- Maps/locations за venues

---

### ❌ Какво липсва за пълен MVP турнир (immediate blockers)

1. **Debate room UI** – участниците не могат да влязат в стая и да видят motion + video + timer на едно място
2. **Standings page** – няма публичен UI за класиране
3. **End-to-end test** – нужен е реален турнир (2+ rounds) за валидиране на flow-а

---

## E) Основни функционалности (детайлен преглед)

### 🏆 Турнири

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Създаване на турнир | ✅ Готово | POST /api/tournaments |
| Tournament settings (формат, размер отбори, регистрация) | ✅ Готово | TournamentSettings model |
| Onboarding на институции | ✅ Готово | PENDING/APPROVED/REJECTED |
| Регистрация на дебатьори/съдии | ✅ Готово | TournamentParticipant с роля |
| Заключване на регистрация (deadline) | ✅ Готово | registrationClosesAt constraint |

### 👥 Отбори

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Team builder (drag-drop) | ✅ Готово | Server actions в teams.actions.ts |
| Auto-naming ("Institution 1", "Institution 2") | ✅ Готово | createTeam() logic |
| Constraint: един участник = един отбор | ✅ Готово | DB unique constraint |
| Validation: min/max размер отбор | ✅ Готово | Server-side check |
| Read-only view за non-admins | ✅ Готово | Permission check в actions |

### 🎲 Рундове и пейринги

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Създаване на рундове | ✅ Готово | POST /api/tournaments/[id]/rounds |
| Round status lifecycle | ✅ Готово | DRAFT → PUBLISHED → IN_PROGRESS → COMPLETED |
| Motion & InfoSlide поля | ✅ Готово | Schema fields |
| Auto-pairing генератор | ✅ Готово | POST .../rounds/[roundId]/generate |
| Manual pairing редактор | ✅ Готово | PUT .../rounds/[roundId]/pairings |
| BYE логика (нечетен брой отбори) | ✅ Готово | isBye флаг |
| Constraint: не пейрваме институция срещу себе си | ✅ Готово | Generator логика |
| Constraint: без повторения на двубои | ✅ Готово | Generator check |
| Публикуване на пейринги | ✅ Готово | Status = PUBLISHED |

### 👨‍⚖️ Съдии

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Назначаване на съдии към дебати | ✅ Готово | TournamentDebateJudge |
| Judge roles (CHAIR/PANELIST) | 🚧 Частично | Enum има, enforce липсва |
| Constraint: съдия в 1 дебат на рунд | ✅ Готово | Unique constraint check |

### 🗳️ Балоти и резултати

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| WSDC ballot формат (8 speeches) | ✅ Готово | BallotSpeech model |
| Попълване на scores | ✅ Готово | PUT /api/ballots/[ballotId] |
| Коментари per speech | ✅ Готово | BallotSpeech.comment |
| Private notes за съдия | ✅ Готово | Ballot.privateNotes |
| Submit ballot | ✅ Готово | POST /api/ballots/[ballotId]/submit |
| Автоматично изчисляване на winner | ✅ Готово | DebateResult computed |
| Chair tiebreaker | ✅ Готово | decidedByChair flag |
| Standings/класиране | 🚧 Липсва UI | Model готов |

### 🏢 Venues (стаи за IRL)

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Създаване на venues | ✅ Готово | Venue model |
| Категоризация (wheelchair, building) | ✅ Готово | VenueCategory M2M |
| Priority сортиране | ✅ Готово | Venue.priority |
| Active/Inactive флаг | ✅ Готово | Venue.isActive |
| Manual venue assignment | ✅ Готово | TournamentDebate.venueId |

### 🎥 Видео дебати (online)

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| VideoCall creation | ✅ Готово | POST /api/stream/calls/ensure |
| Stream token generation | ✅ Готово | POST /api/stream/token |
| Video SDK setup | ✅ Готово | @stream-io/video-react-sdk |
| Full debate room UI | 🚧 Липсва | Нужен маршрут + layout |

### ⏱️ Таймер

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Synced stopwatch state | ✅ Готово | DebateStopwatch model |
| Start/Pause/Reset API | ✅ Готово | PUT /api/debates/[debateId]/stopwatch |
| React компонент | ✅ Готово | SyncedStopwatch.tsx |
| Персонализирани сигнали на играч | ❌ Планирано | User preferences |

### 🔔 Нотификации и покани

| Функционалност | Статус | Детайли |
|---------------|--------|---------|
| Institution invitations | ✅ Готово | InstitutionInvitation model |
| Notification center | ✅ Готово | GET/PATCH /api/notifications |
| Email notifications | ❌ Планирано | Clerk email template |

### 🛡️ Роли и достъп

| Роля | Права |
|------|-------|
| **Tournament creator** | Може да трие турнира, да одобрява институции |
| **Institution ADMIN** | Създава отбори, добавя участници |
| **Institution MEMBER** | Само read access |
| **Tournament participant (DEBATER)** | Вижда пейринги, влиза в дебат |
| **Tournament participant (JUDGE)** | Попълва балоти, дава фийдбек |

---

## F) Tech Stack и архитектура

### Frontend & Backend Framework
- **Next.js 16** (App Router) – SSR + client components ([package.json](package.json))
- **React 19** – UI библиотека
- **TypeScript 5** – type safety

### Styling & UI
- **Tailwind CSS 4** – utility-first styling ([postcss.config.mjs](postcss.config.mjs))
- **shadcn/ui** – Radix UI компоненти ([components.json](components.json))
  - Dialog, Dropdown, Select, Tabs, Avatar, Scroll Area, etc.
- **Lucide React** – икони
- **next-themes** – dark mode support

### Auth & User Management
- **Clerk** (@clerk/nextjs) – пълно auth решение ([src/app/layout.tsx](src/app/layout.tsx))
  - Email/password, OAuth, webhooks
  - User sync в локална DB ([src/lib/ensureUser.ts](src/lib/ensureUser.ts))

### Database & ORM
- **PostgreSQL** – production база
- **Prisma 7** – ORM ([prisma/schema.prisma](prisma/schema.prisma))
  - Migrations в [prisma/migrations/](prisma/migrations/)
  - Seed script: [prisma/seed-tournament.ts](prisma/seed-tournament.ts)

### Realtime & Video
- **Stream.io** (@stream-io/video-react-sdk) – video calls ([package.json](package.json))
  - Server SDK: @stream-io/node-sdk
  - Token generation: [src/app/api/stream/token/route.ts](src/app/api/stream/token/route.ts)

### Validation & Forms
- **Zod 4** – schema validation ([lib/validations/](src/lib/validations/))
- **React Hook Form** (implicit чрез shadcn form patterns)

### Deployment & Hosting
- Предполага се **Vercel** (Next.js оптимизиран)
- DB: Vercel Postgres или external PostgreSQL (напр. Supabase, Neon)

### Utilities
- **date-fns** – date manipulation
- **cmdk** – command palette (може би за UI shortcuts)
- **clsx / tailwind-merge** – conditional class names
- **Sonner** – toast notifications

---

### Организация на Repository

```
Debatera/
├── prisma/
│   ├── schema.prisma          # Централен data model
│   ├── migrations/            # DB миграции (15+ файла)
│   └── seed-tournament.ts     # Seed скрипт
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Auth маршрути (sign-in, sign-up)
│   │   ├── (main)/           # Main маршрути (home, tournaments)
│   │   ├── api/              # REST API endpoints
│   │   │   ├── tournaments/  # CRUD + settings + rounds + participants
│   │   │   ├── ballots/      # Ballot API
│   │   │   ├── debates/      # Stopwatch API
│   │   │   ├── institutions/ # Institution management
│   │   │   ├── notifications/
│   │   │   ├── stream/       # Video token + call creation
│   │   │   └── webhooks/     # Clerk webhooks
│   │   └── tournaments/[id]/ # Tournament detail pages
│   ├── actions/              # Server Actions (teams, invitations, venues)
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   └── debate/          # SyncedStopwatch
│   └── lib/
│       ├── prisma.ts        # Singleton Prisma client
│       ├── ensureUser.ts    # Clerk → DB sync
│       ├── services/        # Domain services (ballots, tournaments, rounds)
│       ├── guards/          # Authorization helpers
│       ├── validations/     # Zod schemas
│       └── utils.ts
├── docs/
│   ├── NOIT.md              # ТОЗИ ДОКУМЕНТ
│   ├── NOIT-raw.md          # Оригинална визия
│   ├── mvp_plan.md          # 16-седмичен план
│   ├── forward_plan.md      # Дългосрочна архитектура
│   ├── rounds.md            # Round документация
│   ├── tournament-teams.md  # Teams feature spec
│   └── tournament-settings.md
├── package.json             # Dependencies & scripts
├── next.config.ts           # Next.js config
├── eslint.config.mjs        # Linting
└── tsconfig.json            # TypeScript config
```

---

## G) How to Run Locally

### Prerequisites
- **Node.js 20+** (използва npm@10.0.0 – вижте package.json)
- **PostgreSQL 12+** (локално или cloud – Supabase/Neon/Vercel Postgres)
- **Clerk account** (за auth keys)
- **Stream.io account** (за video)

### Setup стъпки

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd Debatera
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment variables**  
   Създай `.env` файл с:
   ```bash
   DATABASE_URL="postgresql://..."
   
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   CLERK_WEBHOOK_SECRET="whsec_..."
   
   # Stream.io
   NEXT_PUBLIC_STREAM_API_KEY="..."
   STREAM_SECRET_KEY="..."
   ```
   
   *(Никога не commit-ваме .env файла!)*

4. **Database setup**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run all migrations
   npx prisma migrate deploy
   
   # (Optional) Seed с demo tournament
   npm run seed
   ```

5. **Start dev server**
   ```bash
   npm run dev
   ```
   Отваря се на [http://localhost:3000](http://localhost:3000)

6. **Prisma Studio (DB browser)**
   ```bash
   npx prisma studio
   ```

---

### Налични Scripts

| Команда | Действие |
|---------|----------|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint проверка |
| `npm run seed` | Seed tournament данни |
| `npm run backfill:user-names` | Мигриране на firstName/lastName |

---

## H) Roadmap

### 🚀 Близко (1–2 седмици)

**Цел:** Първи end-to-end турнир с 2+ rounds

1. **Debate room UI** ([#priority-1])
   - Маршрут: `/tournaments/[id]/rounds/[roundId]/debates/[debateId]/room`
   - Layout: video grid + motion display + timer + join button
   - Интеграция: Stream video component + SyncedStopwatch

2. **Standings page** ([#priority-2])
   - Endpoint: `GET /api/tournaments/[id]/standings`
   - Logic: aggregate wins/points from DebateResult
   - UI: sortable table (wins → total points → speaker points)

3. **Judge panel enforcement** ([#priority-3])
   - Validation: exactly 1 CHAIR per debate преди publish
   - UI: badge за CHAIR в pairing editor

4. **Testing & bug fixing**
   - E2E тест: създаване на турнир → 2 rounds → ballots → standings

---

### 🎯 Средно (1–2 месеца)

**Цел:** Production-ready за първи реален онлайн турнир

1. **POI foundation**
   - Schema: POI log table (debateId, userId, timestamp)
   - UI: POI button в debate room
   - Realtime: SSE или WebSocket за POI events

2. **Advanced pairing**
   - Swiss pairing algorithm
   - Bracket/elimination rounds
   - Constraint satisfaction с conflicts

3. **Judge feedback archive**
   - UI: `/profile/feedback-history`
   - Филтриране по турнир/round

4. **Export функционалности**
   - CSV export на резултати
   - PDF ballots

5. **Email notifications**
   - Clerk email templates
   - Round published → notify participants

6. **Mobile responsiveness**
   - Оптимизация на debate room за телефон/таблет

---

### 🔬 Далечно (R&D, 3+ месеца)

**Цел:** Разширяване на платформата с нови features

1. **AI opponent**
   - Интеграция с OpenAI/Claude API
   - Difficulty levels
   - Practice mode

2. **Elo/Rating система**
   - League mode
   - Matchmaking по рейтинг
   - Leaderboards

3. **Personalized timer signals**
   - User preferences за audio cues
   - Custom ringтones/beeps

4. **IRL logistics**
   - Hotel booking integration
   - Venue maps
   - Check-in система

5. **Multi-format support**
   - British Parliamentary (BP)
   - Policy debate
   - Custom formats

6. **Mobile app**
   - React Native или Flutter
   - Native push notifications

---

## I) Self-Check: Факти + Доказателства в кода

| Твърдение | Файл/Папка |
|-----------|-----------|
| Използваме Next.js 16 + React 19 | [package.json:38-39](package.json) |
| Auth с Clerk | [package.json:13](package.json), [src/app/layout.tsx](src/app/layout.tsx) |
| PostgreSQL + Prisma | [package.json:15-16](package.json), [prisma/schema.prisma](prisma/schema.prisma) |
| Stream.io за видео | [package.json:23-24](package.json), [src/app/api/stream/](src/app/api/stream/) |
| WSDC формат балоти | [prisma/schema.prisma:435-493](prisma/schema.prisma) (Ballot, BallotSpeech, SpeechRole enum) |
| Синхронизиран таймер | [prisma/schema.prisma:505-520](prisma/schema.prisma) (DebateStopwatch), [src/components/debate/SyncedStopwatch.tsx](src/components/debate/SyncedStopwatch.tsx) |
| Tournament rounds | [prisma/schema.prisma:235-262](prisma/schema.prisma) (TournamentRound), [src/app/api/tournaments/[id]/rounds/](src/app/api/tournaments/[id]/rounds/) |
| Auto-pairing логика | [src/app/api/tournaments/[id]/rounds/[roundId]/generate/route.ts](src/app/api/tournaments/[id]/rounds/[roundId]/generate/route.ts) |
| Institution members | [prisma/schema.prisma:46-69](prisma/schema.prisma) (InstitutionMember, InstitutionRole) |
| Team drag-drop | [src/actions/teams.actions.ts](src/actions/teams.actions.ts) |
| Venue management | [prisma/schema.prisma:338-375](prisma/schema.prisma) (Venue, VenueCategory), [docs/online_tournament_readiness.md](docs/online_tournament_readiness.md) |
| Migrations (15+) | [prisma/migrations/](prisma/migrations/) (20260121..20260217) |
| Tournament settings (WSDC, ONLINE/IRL) | [prisma/schema.prisma:103-131](prisma/schema.prisma) (TournamentSettings) |
| Notifications система | [prisma/schema.prisma:407-424](prisma/schema.prisma) (Notification), [src/app/api/notifications/route.ts](src/app/api/notifications/route.ts) |

---

## J) Заключение

**Debatera** е във фаза **MVP+** – основните модули за регистрация, отбори, рундове, пейринги, балоти и резултати са **напълно имплементирани на backend ниво**. 

**Най-важният липсващ компонент** е пълният UI на дебатната стая (видео + таймер + motion на едно място).

**Следващи 2 седмици:** фокус върху debate room UI, standings page и първи end-to-end тест с реален турнир.

**Близка цел:** онлайн турнир с 20-40 участници и 3+ rounds.

**Дългосрочна визия:** универсална платформа за всички дебатни формати (WSDC, BP, Policy), онлайн + IRL, с AI противници, Elo система и персонализирани функции като POI tracking и custom timer alerts.

---

**Автор:** GitHub Copilot (Agent mode)  
**Източник:** Repository analysis (19.02.2026)  
**Лиценз:** Следва политиката на проекта
