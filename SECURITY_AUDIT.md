# Security Audit — Debatera

**Дата на одита:** 2026-03-14
**Обхват:** Пълен source code анализ на repository-то
**Метод:** Статичен анализ на кода (grep, четене на файлове, проследяване на data flow)

---

## ЧАСТ 1 — КРАТКО РЕЗЮМЕ

- **Debatera НЕ съхранява пароли локално.** Цялата автентикация е делегирана към Clerk v6 — в базата данни няма поле за парола, хеш или сол.
- **Няма raw SQL** в кодовата база — нито `queryRaw`, нито `executeRaw`, нито `$queryRawUnsafe`. Всички заявки минават през типово-безопасния Prisma ORM, което елиминира SQL injection.
- **Няма `dangerouslySetInnerHTML`** никъде в проекта. Няма markdown rendering библиотеки. React автоматично ескейпва потребителско съдържание.
- **Zod валидация** е приложена систематично — във всички 24 API route-а и във всички server actions входните данни се валидират преди операции с базата.
- **Judge portal токени** се генерират криптографски сигурно (32 байта `randomBytes`) и се съхраняват като SHA-256 хеш — plaintext токенът никога не се записва в базата.
- **Webhook верификация** чрез Svix библиотеката: подписите на Clerk webhooks се проверяват криптографски преди обработка.
- **Stream видео токени** са краткоживеещи (1 час), генерират се server-side и изискват проверка за допустимост (дебатьор или съдия в конкретния дебат).
- **Потенциален IDOR** в `DELETE /api/tournaments/[id]/participants/[participantId]` — институционален админ може да изтрие участник от друга институция, ако познае ID-то.
- **Токени в URL пътя** на Judge Portal — plaintext токенът присъства в URL, което създава риск от Referer leakage и поява в browser history/server logs.
- **Липсва** явна конфигурация на security headers (CSP, X-Frame-Options, HSTS), rate limiting и структурирано audit logging.
- **TypeScript strict mode** е включен, което осигурява допълнително ниво на type safety при compile time.
- **Всички server actions и API routes** извикват `auth()` като първа стъпка и връщат 401 при липса на автентикация.

---

## ЧАСТ 2 — ДОКАЗАТЕЛСТВА ОТ REPO-ТО

### 2.1 Автентикация и пароли

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| Clerk интеграция | Цялото приложение е обвито в `<ClerkProvider>` | `src/app/layout.tsx:24-33` | `<ClerkProvider>` обвива root layout; `ensureUserInDB()` се вика при всяко зареждане | Високо |
| Sign In / Sign Up | Използват се готовите Clerk компоненти | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | `<SignIn />`, `<SignUp />` — без custom auth форми | Високо |
| Парола в User модел | Няма поле за парола | `prisma/schema.prisma:12-42` | User модел съдържа само: `id`, `email`, `firstName`, `lastName`, `imageUrl`, `bio`, `pronouns`, `displayName` — без `password`, `passwordHash`, `salt` | Високо |
| bcrypt/argon2/scrypt | Не са намерени | Цяла codebase | Grep за `bcrypt`, `argon2`, `scrypt`, `pbkdf2` — 0 резултата | Високо |
| `auth()` проверка | Всички API routes и server actions | Всички файлове в `src/app/api/` и `src/actions/` | `const { userId } = await auth(); if (!userId) return ...401` | Високо |
| ensureUser синхронизация | Clerk → DB sync при всяко зареждане | `src/lib/ensureUser.ts:1-56` | Транзакционен upsert: fetch от Clerk, синхронизация на email/firstName/lastName/imageUrl | Високо |
| Middleware | Няма middleware.ts | Цяла codebase | Auth се проверява per-route чрез `auth()`, не чрез глобален middleware | Високо |

### 2.2 Webhook обработка

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| Svix верификация | Подписът се проверява преди обработка | `src/app/api/webhooks/clerk/route.ts:12-20` | `const wh = new Webhook(WEBHOOK_SECRET); const event = wh.verify(payload, headers)` — извлича `svix-id`, `svix-timestamp`, `svix-signature` | Високо |
| Webhook secret | От environment variable | `src/app/api/webhooks/clerk/route.ts:4` | `const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!` | Високо |
| Webhook обработка | В момента само логва (DEV MODE) | `src/app/api/webhooks/clerk/route.ts:21-23` | Коментар „DEV MODE: just log & ack. No DB write." — в production трябва да се активира | Средно |

### 2.3 Токени и сесии

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| Judge portal токен генерация | 32 байта криптографски random | `src/lib/portal/tokens.ts:15-17` | `randomBytes(32).toString('base64url')` | Високо |
| Токен хеширане | SHA-256, plaintext не се пази | `src/lib/portal/tokens.ts:19-21` | `createHash('sha256').update(token).digest('hex')` | Високо |
| Токен в DB | Само хешът се записва | `prisma/schema.prisma:446` | `tokenHash String @unique` в модел `TournamentParticipantAccessLink` | Високо |
| Токен валидация | Множество проверки | `src/lib/portal/auth.ts:39-86` | Hash lookup → tournament match → revocation check → role == JUDGE → ballot ownership | Високо |
| Токен в URL | Plaintext в URL пътя | `src/app/api/tournaments/[id]/portal/generate-link/route.ts:93` | `` `${protocol}://${host}/tournaments/${tournamentId}/p/${token}` `` — риск от Referer leakage | Високо |
| Stream токени | Server-side, 1 час, eligibility check | `src/app/api/stream/token/route.ts:45-61` | `getDebateRoleForUser()` → 403 ако не е допустим; `generateUserToken({ validity_in_seconds: 3600 })` | Високо |
| Clerk сесии/cookies | Управлявани от Clerk | Няма custom cookie код | httpOnly, secure, sameSite — настройват се от Clerk автоматично. **Не е потвърдено с код от repo-то** — типично поведение на Clerk. | Средно |

### 2.4 SQL injection и валидация

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| Raw SQL | 0 случая | Цяла codebase | Grep за `queryRaw`, `executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe` — нула резултати | Високо |
| Prisma singleton | Правилна имплементация | `src/lib/prisma.ts` | PrismaPg адаптер с pg connection pool; singleton в globalThis | Високо |
| Prisma import | Винаги от `@/lib/prisma` | 63 файла | 99 срещания на `import ... from '@/lib/prisma'` — без директен `new PrismaClient()` другаде | Високо |
| Zod валидация — профил | Max length, trim | `src/lib/validations/profile.ts` | `displayName: z.string().max(128).trim()`, `bio: z.string().max(1000).trim()` | Високо |
| Zod валидация — турнирни настройки | Cross-field refinements | `src/lib/validations/tournamentSettings.ts` | `.refine(data => data.teamSizeMax >= data.teamSizeMin)`, datetime валидация | Високо |
| Zod валидация — участници | Enum + length bounds | `src/lib/validations/participants.ts` | `role: z.enum(['DEBATER', 'JUDGE'])`, `displayName: z.string().min(1).max(128)` | Високо |
| Zod валидация — балоти | Strict schema + custom validator | `src/lib/ballots/validation.ts` | `speeches: z.array(SubmitSpeechSchema).length(8)` + `validateBallotSubmission()` с бизнес логика | Високо |
| Zod валидация — рундове | Max length на текст | `src/lib/tournamentRounds/validation.ts` | `motion: z.string().max(1000)`, `infoSlide: z.string().max(5000)` | Високо |
| Пагинация | Bounds checking | `src/lib/pagination.ts:31-45` | `Number.isFinite()`, `rawPageSize <= MAX_PAGE_SIZE`, safe defaults | Високо |
| TypeScript strict | Включен | `tsconfig.json:11` | `"strict": true` | Високо |

### 2.5 XSS и HTML rendering

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| dangerouslySetInnerHTML | 0 случая | Цяла codebase | Пълен grep — нула резултати | Високо |
| innerHTML / outerHTML | 0 случая | Цяла codebase | Grep за `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` — нула | Високо |
| Markdown rendering | Няма | Цяла codebase | Grep за `react-markdown`, `remark`, `rehype`, `marked`, `showdown` — нула | Високо |
| eval() / Function() | Няма | Цяла codebase | Grep за `eval(`, `new Function(` — нула | Високо |
| React auto-escaping | Стандартно поведение | Всички `.tsx` компоненти | Потребителско съдържание се подава като text в JSX `{}` — React го ескейпва автоматично | Високо |

### 2.6 IDOR и access control

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| Tournament admin check | Creator = admin | `src/lib/tournamentRounds/authorization.ts:1-20` | `isTournamentAdmin()` проверява `tournament.createdByUserId === userId` | Високо |
| Ballot authorization | Ownership + status checks | `src/lib/ballots/authorization.ts:65-99` | `canEditBallot`: само owning adjudicator, само DRAFT, само IN_PROGRESS round | Високо |
| Team management scope | Scope-based access | `src/lib/domains/teams/teamManagementScope.ts` | `resolveTeamManagementScope()` → `assertCanManageInstitution()` | Високо |
| **IDOR в participant delete** | **Липсва проверка за институция** | `src/app/api/tournaments/[id]/participants/[participantId]/route.ts` (DELETE) | Проверява `membership.role === ADMIN` но **НЕ** проверява дали participant принадлежи на институцията на админа | Високо |
| Participant scoping | Правилно ограничен | `src/actions/participants.actions.ts:363-369` | `isCreator ? { tournamentId } : { tournamentId, institutionId: { in: scope.manageableInstitutionIds } }` | Високо |
| Stream token eligibility | Проверка преди генерация | `src/app/api/stream/token/route.ts:45-51` | `getDebateRoleForUser()` → 403 ако не е debater или judge в дебата | Високо |
| Draft rounds visibility | Скрити за не-админи | `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts:34-61` | DRAFT рундове връщат 404 за не-админи | Високо |

### 2.7 Secrets и environment

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| .gitignore за .env | Правилно конфигуриран | `.gitignore:34,50` | `.env` и `.env*.local` изключени от git | Високо |
| NEXT_PUBLIC_ разделение | Правилно | `.env.example` | Само publishable keys са `NEXT_PUBLIC_*`; `CLERK_SECRET_KEY`, `STREAM_API_SECRET`, `DATABASE_URL` са server-only | Високо |
| Hardcoded secrets | Няма | Цяла codebase | Grep за `sk_test`, `pk_test`, hardcoded keys — нула | Високо |
| Error responses | Generic към клиента | Всички API routes | `{ error: 'Internal Server Error' }` + `console.error()` server-side | Високо |
| Zod error details | Изпращат се към клиента | Няколко API routes | `details: parsed.error.flatten()` — нисък риск, но може да помогне на атакуващ | Средно |

### 2.8 Security headers, CSRF, rate limiting

| Тема | Какво откри | Файл(ове) | Ключов код / обяснение | Увереност |
|------|-------------|-----------|------------------------|-----------|
| CSP / Security headers | Не са конфигурирани | `next.config.ts` | Празна конфигурация — няма custom headers | Високо |
| CSRF | Имплицитна защита | — | Next.js server actions + Clerk SameSite cookies = CSRF защита по подразбиране. **Не е потвърдено с explicit CSRF token в кода.** | Средно |
| Rate limiting | Липсва | Цяла codebase | Grep за `rate`, `limit`, `throttle` — нула | Високо |
| Audit logging | Минимално | Всички API routes | Само `console.error()` за грешки; няма структурирано логване на auth/authz събития | Високо |
| CORS | Не е конфигуриран | `next.config.ts` | Вероятно разчита на Next.js default поведение | Средно |
| Open redirect | Безопасно | Всички redirect-и | Всички redirect-и използват hardcoded paths или валидирани от DB данни | Високо |
| File upload | Няма | Цяла codebase | Grep за `upload`, `multipart`, `multer`, `busboy` — нула; формите са text-only | Високо |

---

## ЧАСТ 3 — ПАРОЛИ И AUTH

### Съхранява ли Debatera пароли в собствената си база?

**НЕ.** Debatera не съхранява пароли в собствената си PostgreSQL база данни.

**Доказателства:**

1. **User моделът в `prisma/schema.prisma` (редове 12-42)** не съдържа полета `password`, `passwordHash`, `salt` или подобни. Полетата са: `id` (Clerk user ID), `email`, `firstName`, `lastName`, `imageUrl`, `bio`, `pronouns`, `displayName`.

2. **Grep за `password`, `bcrypt`, `argon2`, `scrypt`, `pbkdf2`** в цялата codebase дава **нула резултати** в application код.

3. **Sign In и Sign Up** страниците (`src/app/(auth)/`) използват готовите Clerk компоненти `<SignIn />` и `<SignUp />` — без custom форми за парола.

4. **`ensureUser.ts`** синхронизира от Clerk само профилни данни (email, firstName, lastName, imageUrl) — **никога пароли**.

5. **`package.json`** не съдържа библиотеки за хеширане на пароли (bcrypt, argon2, scrypt и др.).

### Кой управлява паролите?

**Clerk v6** (`@clerk/nextjs@^6.36.9`). Clerk е external Identity-as-a-Service доставчик, който поема:

- Регистрация и вход (email/password, OAuth, SSO)
- Хеширане и съхранение на пароли (в Clerk инфраструктурата)
- Сесийно управление (httpOnly cookies, token rotation)
- Password reset flow
- Multi-factor authentication (ако е конфигурирано)
- Rate limiting на auth endpoints
- Brute force защита

### Какво означава това за документацията?

- **Можем да напишем:** „Debatera делегира автентикацията към Clerk и не съхранява пароли локално."
- **НЕ бива да пишем:** „Паролите се хешират с bcrypt/argon2" — това не е доказано и е отговорност на Clerk.
- **Можем да кажем:** „Clerk управлява хеширането, съхранението и валидирането на пароли извън обхвата на Debatera."

---

## ЧАСТ 4 — ГОТОВ ТЕКСТ ЗА ДОКУМЕНТАЦИЯ

### Сигурност

#### Удостоверяване и роли

Debatera използва Clerk (версия 6) като външен доставчик за управление на самоличността и достъпа. Регистрацията и входът в системата се извършват изцяло чрез Clerk — приложението не реализира собствени форми за автентикация, а използва готовите компоненти на доставчика. При всяко зареждане на приложението се извършва синхронизация на потребителските данни от Clerk към локалната PostgreSQL база данни чрез функцията `ensureUserInDB()`, която записва само профилна информация (имена, email, снимка), но не и пароли или автентикационни данни.

Системата за роли е двуслойна. На ниво институция потребителите могат да бъдат администратори (`ADMIN`) или членове (`MEMBER`). На ниво турнир участниците имат роля дебатьор (`DEBATER`) или съдия (`JUDGE`). Създателят на турнира получава пълен администраторски достъп. Допълнително съществува токен-базиран портал за съдии, който позволява достъп без регистрация в системата чрез еднократно генериран линк.

#### Защита на данните и паролите

Debatera не съхранява пароли в собствената си база данни. Цялото управление на идентификационни данни — включително хеширане, съхранение, валидиране и възстановяване на пароли — е делегирано към Clerk. В Prisma схемата на модела `User` няма поле за парола. В кодовата база липсват библиотеки за хеширане на пароли (bcrypt, argon2, scrypt и подобни).

Токените за достъп до съдийския портал се генерират с 32 байта криптографски случайни данни (`crypto.randomBytes`) и се съхраняват в базата данни единствено като SHA-256 хеш. Plaintext стойността на токена никога не се записва в базата. При всяко използване токенът се валидира чрез хеш lookup, проверка за принадлежност към турнира, проверка за отмяна и проверка на ролята.

#### Защита срещу SQL injection

Приложението използва изцяло Prisma ORM за достъп до базата данни. В кодовата база няма нито един случай на raw SQL заявки (`queryRaw`, `executeRaw`, `$queryRawUnsafe` или подобни). Всички заявки преминават през типово-безопасния API на Prisma, което елиминира риска от SQL injection. Prisma клиентът се импортира винаги от централизиран модул (`src/lib/prisma.ts`), който осигурява singleton pattern и connection pooling.

#### Защита срещу XSS и HTML injection

В кодовата база не се използва `dangerouslySetInnerHTML`, `innerHTML`, `eval()` или подобни механизми за директно инжектиране на HTML. Не се използват markdown rendering библиотеки. Цялото потребителско съдържание се рендерира чрез стандартните JSX механизми на React, който автоматично ескейпва текстови стойности, предотвратявайки XSS атаки. Формите приемат само текстови данни — в приложението няма механизъм за качване на файлове.

#### Server-side валидации и проверки на достъпа

Всички входни данни се валидират server-side чрез Zod схеми преди каквато и да е операция с базата данни. Валидационните схеми налагат ограничения за дължина на низове, допустими стойности (enum), числови граници и cross-field консистентност. Всеки API route и server action започва с проверка на автентикацията чрез `auth()` и връща грешка 401 при липса на валиден потребител. Авторизацията се проверява server-side чрез guard функции, които валидират собствеността върху ресурса и ролята на потребителя преди извършване на операция.

#### Работа с външни услуги и токени

За реалновременни видео дебати Debatera използва Stream SDK. Токените за видео достъп се генерират server-side, имат валидност от 1 час и се издават само след проверка, че потребителят е допустим участник в конкретния дебат. Clerk webhooks се верифицират криптографски чрез Svix библиотеката — подписът на всяко входящо съобщение се проверява преди обработка. Конфиденциалните ключове (`CLERK_SECRET_KEY`, `STREAM_API_SECRET`, `DATABASE_URL`, `CLERK_WEBHOOK_SECRET`) се съхраняват като environment variables и никога не се експонират към клиентската страна на приложението.

---

## ЧАСТ 5 — КАКВО ЛИПСВА / РИСКОВЕ

### Наличие в текущия код

| Мярка | Статус | Доказателство |
|-------|--------|---------------|
| Автентикация чрез Clerk | Реализирано | `ClerkProvider` в layout, `auth()` във всички routes/actions |
| Zod валидация на входни данни | Реализирано | 5+ validation файла, safeParse/parse преди DB операции |
| Типово-безопасен DB достъп чрез Prisma | Реализирано | 0 raw SQL; всички заявки през Prisma API |
| XSS защита чрез React auto-escaping | Реализирано | 0 dangerouslySetInnerHTML; 0 innerHTML |
| Криптографски сигурни токени | Реализирано | `randomBytes(32)` + SHA-256 хеширане в DB |
| Webhook signature verification | Реализирано | Svix `wh.verify()` за Clerk webhooks |
| Stream token eligibility check | Реализирано | `getDebateRoleForUser()` преди генерация на видео токен |
| Server-side authorization guards | Реализирано | `isTournamentAdmin`, `canEditBallot`, `requireParticipantManager`, `resolveTeamManagementScope` |
| Secrets не в source control | Реализирано | `.gitignore` изключва `.env` и `.env*.local` |
| NEXT_PUBLIC_ разделение | Реализирано | Само publishable keys са public; secrets са server-only |
| Generic error responses | Реализирано | `{ error: 'Internal Server Error' }` без stack traces |
| TypeScript strict mode | Реализирано | `"strict": true` в `tsconfig.json` |
| Транзакционна User sync | Реализирано | `prisma.$transaction` в `ensureUserInDB()` |
| Pagination bounds checking | Реализирано | `Number.isFinite()`, MAX_PAGE_SIZE лимит |
| Token revocation | Реализирано | `revokedAt` поле в `TournamentParticipantAccessLink` |
| Open redirect prevention | Реализирано | Всички redirect-и с hardcoded paths или валидирани данни |
| Безопасна CSRF защита | Реализирано (имплицитно) | Next.js server actions + Clerk SameSite cookies |

### Не е потвърдено от repo-то

| Тема | Обяснение |
|------|-----------|
| Clerk cookie flags (httpOnly, secure, sameSite) | Типично поведение на Clerk, но не е видимо в кода на Debatera — управлява се от Clerk SDK |
| Clerk password hashing алгоритъм | Clerk вероятно използва bcrypt или подобен, но това не може да се потвърди от repo-то |
| Clerk brute force / rate limiting на login | Стандартна функционалност на Clerk, но не е конфигурирана/потвърдена в кода |
| CORS поведение | Вероятно се управлява от Next.js defaults, но няма explicit конфигурация |
| HTTPS enforcement | Зависи от deployment, не от кода |
| MFA (multi-factor auth) | Clerk поддържа MFA, но не е ясно дали е активирано за Debatera |

### Препоръчителни подобрения

| Приоритет | Подобрение | Обосновка |
|-----------|------------|-----------|
| **Висок** | Поправка на IDOR в DELETE participant endpoint | Институционален админ може да изтрие участник от друга институция. Трябва да се добави проверка `participant.institutionId` спрямо институциите на админа. Файл: `src/app/api/tournaments/[id]/participants/[participantId]/route.ts` |
| **Висок** | Премахване на plaintext токен от URL пътя на Judge Portal | Токенът в URL може да изтече чрез Referer header, browser history и server logs. Вече се поддържа `Authorization: Bearer` header — може да се мигрира изцяло към него. Файл: `src/app/api/tournaments/[id]/portal/generate-link/route.ts:93` |
| **Среден** | Добавяне на security headers | CSP, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin` — чрез `next.config.ts` или middleware |
| **Среден** | Rate limiting на чувствителни endpoints | Особено за: token generation, ballot submission, institution creation, portal link generation |
| **Среден** | Активиране на webhook DB writes в production | В момента webhook-ът логва, но не записва в DB (DEV MODE) |
| **Нисък** | Структурирано audit logging | JSON-формат логове за: auth failures, authz failures, token generation, ballot submissions, participant CRUD |
| **Нисък** | Намаляване на Zod error details в responses | `parsed.error.flatten()` може да даде на атакуващ информация за структурата на данните; в production може да се върне generic „Invalid input" |
| **Нисък** | Добавяне на Clerk middleware.ts | Глобален middleware за route protection вместо per-route `auth()` проверки — по-трудно да се пропусне |

---

## ДОПЪЛНИТЕЛНИ СПИСЪЦИ

### Файлове за задължителен ръчен преглед

1. `src/app/api/tournaments/[id]/participants/[participantId]/route.ts` — IDOR уязвимост в DELETE handler
2. `src/app/api/tournaments/[id]/portal/generate-link/route.ts` — токен в URL
3. `src/app/api/tournaments/[id]/portal/generate-all-links/route.ts` — масово генериране на токени
4. `src/lib/portal/auth.ts` — цялата portal token валидационна логика
5. `src/lib/ballots/authorization.ts` — ballot access control правила
6. `src/app/api/webhooks/clerk/route.ts` — webhook обработка (DEV MODE)
7. `src/lib/ensureUser.ts` — user sync и email migration logic
8. `src/lib/tournamentRounds/authorization.ts` — tournament admin guard
9. `next.config.ts` — за добавяне на security headers
10. `src/actions/invitation.actions.ts` — invitation/member removal logic

### Точни твърдения, които можем безопасно да сложим в документацията

1. „Debatera не съхранява пароли в собствената си база данни."
2. „Автентикацията е делегирана изцяло към Clerk."
3. „Приложението не използва raw SQL заявки — всички DB операции минават през Prisma ORM."
4. „В кодовата база няма `dangerouslySetInnerHTML`, `innerHTML` или markdown rendering."
5. „Входните данни се валидират server-side чрез Zod схеми преди операции с базата."
6. „Токените за съдийски портал се генерират с `crypto.randomBytes(32)` и се съхраняват като SHA-256 хеш."
7. „Stream видео токените имат валидност от 1 час и изискват проверка за допустимост."
8. „Clerk webhooks се верифицират криптографски чрез Svix."
9. „Конфиденциалните ключове се съхраняват като environment variables и не се експонират към клиента."
10. „TypeScript strict mode е включен."
11. „Всички API routes и server actions проверяват автентикацията чрез `auth()` като първа стъпка."

### Твърдения, които НЕ бива да пишем (не са доказани от repo-то)

1. ~~„Паролите се хешират с bcrypt/argon2."~~ — Debatera не хешира пароли; Clerk го прави, но алгоритъмът не е видим.
2. ~~„Приложението има CSRF токени."~~ — Няма explicit CSRF tokens; защитата е имплицитна чрез SameSite cookies.
3. ~~„Cookies са httpOnly и secure."~~ — Clerk вероятно ги настройва, но не може да се потвърди от кода.
4. ~~„Има rate limiting на API-то."~~ — Няма rate limiting в кода.
5. ~~„Има Content Security Policy."~~ — Няма CSP конфигурация.
6. ~~„Има audit logging."~~ — Само `console.error()`, няма структурирано логване.
7. ~~„Има middleware за глобална route protection."~~ — Няма middleware.ts; auth е per-route.
8. ~~„MFA е активирано."~~ — Не е потвърдено от кода.
9. ~~„Има CORS конфигурация."~~ — Разчита на Next.js defaults, не е конфигурирано явно.
10. ~~„Всички endpoints проверяват институционална принадлежност."~~ — DELETE participant не го прави.
