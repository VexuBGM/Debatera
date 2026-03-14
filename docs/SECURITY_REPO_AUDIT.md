# Security Audit на Debatera (по доказателства от repo-то)

Забележки за обхвата:
- Този документ е изготвен само по код и конфигурация, налични в repository-то.
- `SECURITY_AUDIT.md` не е използван като източник.
- Когато дадена защита е делегирана на външен доставчик, това е посочено изрично.
- Когато нещо не може да се докаже от repo-то, е маркирано като `не е потвърдено от repo-то`.

## ЧАСТ 1 — КРАТКО РЕЗЮМЕ

- Стандартното удостоверяване е делегирано към Clerk: приложението използва `ClerkProvider`, `SignIn`, `SignUp`, `auth()` и `clerkMiddleware`, а локалната таблица `User` пази snapshot на Clerk потребителя, не парола.
- В Prisma схемата няма поле за парола, hash на парола или credential store за потребители; локално се съхраняват email, имена, avatar URL и профилни полета.
- Авторизацията е server-side и е реализирана основно в route handlers и server actions чрез `auth()`, `isTournamentAdmin()`, проверки за `InstitutionRole.ADMIN` и ownership проверки за ballot/portal access.
- `tournament admin` в текущия код е опростен до `Tournament.createdByUserId` (creator-only модел), което е работещо, но ограничено.
- Judge portal-ът използва собствен token-based достъп: генерира се случаен token, в базата се пази само `SHA-256` hash (`tokenHash`), а валидаторът проверява tournament match, `revokedAt` и дали участникът е `JUDGE`.
- За judge portal token-ите няма видима expiry дата в схемата или валидатора; те изглеждат валидни до revoke/rotation. Това е реален риск за “insecure direct token/link access”.
- Stream token-ите се създават server-side след eligibility check и са с 1 час валидност.
- Webhook-ът от Clerk се верифицира чрез Svix signature (`svix-id`, `svix-timestamp`, `svix-signature` + `Webhook.verify`), което е добра защита срещу forged webhook-и.
- Няма evidence за `dangerouslySetInnerHTML`, markdown/html renderer или DOM sanitization библиотека; user content се рендерира като обикновен JSX текст, което означава, че приложението разчита на стандартното React escaping.
- Няма evidence за Prisma raw SQL в приложния runtime код (`queryRaw`, `executeRaw`, `$queryRawUnsafe` и подобни не се срещат).
- Има реални рискове от broken access control / data exposure: няколко GET endpoints са достижими през публичния `/api/*` слой и не проверяват `isPublic`, membership или login, въпреки че връщат чувствителни или детайлни данни.
- В repo-то не се виждат custom security headers, CSP, rate limiting, app-level CSRF защита или audit logging механизъм.

## ЧАСТ 2 — ДОКАЗАТЕЛСТВА ОТ REPO-ТО

| Тема | Какво откри | Файл/файлове | Ключов код или кратко обяснение | Ниво на увереност |
| --- | --- | --- | --- | --- |
| Authentication | Clerk е основният auth доставчик | `src/app/layout.tsx`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`, `src/proxy.ts` | `ClerkProvider`, `<SignIn />`, `<SignUp />`, `clerkMiddleware`, `auth.protect()` | високо |
| Локален user sync | Приложението синхронизира Clerk user -> локален `User` record | `src/lib/ensureUser.ts` | `auth()`, `clerkClient().users.getUser(userId)`, `tx.user.create/update(...)` | високо |
| Локално съхранение на пароли | Не се виждат полета за password/hash в `User` модела | `prisma/schema.prisma` | `User` съдържа `id`, `email`, `firstName`, `lastName`, `imageUrl`, `bio`, `pronouns`, `displayName`, `publicEmail`, но няма password поле | високо |
| Auth boundary | Всички `/api/*` са публични на middleware ниво; безопасността е в handler-ите | `src/proxy.ts` | `createRouteMatcher(['/api(.*)', ...])` и `if (!isPublicRoute(req)) await auth.protect()` | високо |
| Tournament admin модел | `tournament admin = tournament creator` | `src/lib/tournamentRounds/authorization.ts` | `return tournament?.createdByUserId === userId;` | високо |
| Institution роли | Има `ADMIN` / `MEMBER` роли за институции | `prisma/schema.prisma`, `src/app/api/institutions/[id]/members/route.ts`, `src/actions/invitation.actions.ts` | `InstitutionRole`, server-side проверки за `membership.role !== InstitutionRole.ADMIN` | високо |
| Tournament participant роли | Има `DEBATER` / `JUDGE` роли и отделен `JudgeRole` | `prisma/schema.prisma`, `src/app/api/tournaments/[id]/participants/route.ts` | `TournamentParticipantRole`, `JudgeRole`, server-side enrollment checks | високо |
| Ballot authorization | Ballot view/edit е ограничен до organizer или owning adjudicator според status | `src/lib/ballots/authorization.ts`, `src/app/api/ballots/[ballotId]/route.ts`, `src/app/api/ballots/[ballotId]/submit/route.ts` | `canViewBallotDetails`, `canEditBallot`, ownership и round-status проверки | високо |
| Judge portal token | Token-ът е случаен, в DB се пази само SHA-256 hash | `src/lib/portal/tokens.ts`, `prisma/schema.prisma`, `src/app/api/tournaments/[id]/portal/generate-link/route.ts` | `randomBytes(32).toString('base64url')`, `createHash('sha256')`, `tokenHash` в schema | високо |
| Judge portal authorization | Portal token-ът проверява tournament, revoke и role=JUDGE | `src/lib/portal/auth.ts` | `if (link.tournamentId !== tournamentId) return null`, `if (link.revokedAt) return null`, `if (link.participant.role !== 'JUDGE') return null` | високо |
| Judge portal ballot ownership | Portal ballot достъпът проверява ownership на ballot-а | `src/lib/portal/auth.ts`, `src/app/api/tournaments/[id]/portal/ballots/[ballotId]/route.ts` | `if (ballot.adjudicator.participantId !== link.participant.id) return null` | високо |
| Portal token expiry | Не се вижда expiry поле или expiry check | `prisma/schema.prisma`, `src/lib/portal/auth.ts` | Има `createdAt`, `lastUsedAt`, `revokedAt`, но няма `expiresAt`; валидаторът не проверява срок | високо |
| Query-string token fallback | Portal auth приема token и от query string | `src/lib/portal/auth.ts` | `return url.searchParams.get('token')` | високо |
| Stream token | Stream token се издава server-side след eligibility check, валиден 1 час | `src/app/api/stream/token/route.ts`, `src/lib/stream/eligibility.ts`, `src/lib/stream/server.ts` | `getDebateRoleForUser`, `generateUserToken`, `validity_in_seconds: 60 * 60` | високо |
| Webhook signature verification | Clerk webhook-ът се верифицира със Svix signature | `src/app/api/webhooks/clerk/route.ts` | Чете `svix-*` headers, после `wh.verify(payload, headers)` | високо |
| Input validation | Използва се Zod в множество handlers/actions | `src/lib/ballots/validation.ts`, `src/lib/tournamentRounds/validation.ts`, `src/lib/validations/profile.ts`, `src/lib/validations/tournamentSettings.ts`, `src/app/api/stream/token/route.ts` | `safeParse`/`parse`, допълнителни server-side validation helpers | високо |
| DB access / SQL injection | Prisma ORM се използва повсеместно; не се вижда raw SQL в runtime app code | `src/lib/prisma.ts`, repo-wide search в `src`, `prisma`, `scripts` | Няма `queryRaw`, `executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe` в приложния код | високо |
| XSS / HTML injection | Не се вижда raw HTML rendering; user content се подава като JSX текст | `src/components/profile/ProfileSections.tsx`, `src/components/ballot/BallotWorkspace.tsx`, repo-wide search | Няма `dangerouslySetInnerHTML`, markdown/html rendering или DOMPurify; bio/motion/infoSlide са в `{...}` текстови възли | високо |
| Public standings | Има нарочно public endpoint за standings с ограничен response shape | `src/app/api/tournaments/[id]/standings/route.ts`, `src/proxy.ts` | Коментарът казва “Public endpoint”; кодът връща rankings, без comments/private notes | високо |
| Data exposure risk: institution details | `GET /api/institutions/[id]` няма auth/visibility check и връща institution + members + `user: true` | `src/app/api/institutions/[id]/route.ts`, `src/lib/services/mvp.ts`, `src/proxy.ts` | Handler-ът извиква `getInstitution(id)` и `return NextResponse.json(institution)`; `getInstitution` включва `members: { include: { user: true }}` | високо |
| Data exposure risk: tournament details | `GET /api/tournaments/[id]` няма auth/visibility check и връща tournament + `createdBy: true` | `src/app/api/tournaments/[id]/route.ts`, `src/lib/services/mvp.ts`, `src/proxy.ts` | Handler-ът връща `getTournament(tournamentId)`; `getTournament` включва `createdBy: true` и не проверява `isPublic` | високо |
| Data exposure risk: rounds | Published/non-draft rounds са достъпни и без login | `src/app/api/tournaments/[id]/rounds/route.ts`, `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts`, `src/lib/tournamentRounds/queries.ts` | GET handlers четат `auth()` без да изискват `userId`; не-admin вижда всичко извън `DRAFT` | високо |
| Data exposure risk: pairings | Pairings endpoint за non-draft round връща `round`, `allTeams`, `allJudges`, `allVenues`, `unassignedTeams`, `unassignedJudges` без membership/isPublic check | `src/app/api/tournaments/[id]/rounds/[roundId]/pairings/route.ts`, `src/lib/tournamentRounds/queries.ts` | Ако round не е `DRAFT`, endpoint-ът връща пълни данни за editor-а дори за не-admin | високо |
| CSRF | Не се вижда app-level CSRF token или Origin/Referer check | repo-wide search в `src`, `next.config.ts` | Няма намерени `csrf` механизми; възможните cookie protections на Clerk не се виждат в repo-то | средно |
| Cookies / session flags | Не се вижда custom cookie/session implementation | repo-wide search в `src`, `next.config.ts` | Не се намират `cookies()`, `Set-Cookie`, `sameSite`, `httpOnly`, `secure` за app-defined cookies | средно |
| Security headers / CSP | Не се вижда конфигурация за CSP/HSTS/X-Frame-Options и др. | `next.config.ts`, repo-wide search | `next.config.ts` е празен; не се намират `Content-Security-Policy`, `Strict-Transport-Security`, `helmet` и др. | високо |
| Rate limiting | Не се вижда rate limiter | `package.json`, repo-wide search | Няма библиотеки или код за throttling/429 на публични/token endpoints | високо |
| Secret handling | Repo-то игнорира `.env` и `.env*.local`; tracks само `.env.example` с placeholders | `.gitignore`, `.env.example` | `.gitignore` съдържа `.env` и `.env*.local`; `.env.example` съдържа празни placeholder стойности | високо |
| Hardcoded secrets | Не се виждат hardcoded production secrets в tracked source | `.env.example`, `src/lib/stream/server.ts`, `src/app/api/webhooks/clerk/route.ts`, `.github/workflows/*.yml` | Използват се `process.env.*` и GitHub Actions `secrets.*` | високо |
| File upload | Не се виждат upload handlers или multipart processing | repo-wide search в `src` | Няма `multipart`, `formData()`, upload route или file storage logic | средно |
| Command injection | Не се виждат runtime shell/child_process извиквания в приложението | repo-wide search в `src`, `scripts` | Няма `exec`, `spawn`, `child_process`, `eval`, `new Function` в application code | високо |

## ЧАСТ 3 — ПАРОЛИ И AUTH

### Съхранява ли Debatera пароли в собствената си база?

Не се вижда Debatera да съхранява потребителски пароли в собствената си база.

Доказателства:
- `prisma/schema.prisma` дефинира `User` като `Clerk-based auth` модел и съдържа profile полета, но не съдържа `password`, `passwordHash`, `salt` или подобно поле.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` рендерира Clerk `<SignIn />`.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` рендерира Clerk `<SignUp />`.
- `src/app/layout.tsx` използва `ClerkProvider`.
- `src/lib/ensureUser.ts` синхронизира потребителя от Clerk към локалната таблица `User`, без да обработва пароли.

### Ако да: как точно?

Не е приложимо. В repo-то няма доказателство за локален password storage.

### Ако не: кой го прави вместо приложението?

По доказателствата в repo-то стандартният authentication flow е делегиран към Clerk.

Това означава следното:
- Sign up и sign in UI/flow се поемат от Clerk компонентите.
- Session management за стандартните потребители се поема от Clerk.
- Ако има password reset за Clerk-managed акаунти, точният flow не е реализиран локално в repo-то и не е напълно видим тук; той следва да се счита за отговорност на Clerk, а не на Debatera.

### Какво означава това за документацията?

В документацията е безопасно да се твърди:
- Debatera не пази локално пароли според наличния код.
- Удостоверяването на потребителите е делегирано към Clerk.
- Локалната таблица `User` се използва като application profile/snapshot слой.

Не е безопасно да се твърди:
- че Debatera хешира пароли с bcrypt/argon2/scrypt/pbkdf2;
- че Debatera има собствен password reset flow;
- че знаем точните cookie/session/security flags на Clerk от този repo.

### Какво остава отговорност на самото приложение, въпреки че auth е през Clerk?

По кода на Debatera остават отговорност на приложението:
- server-side authorization по ресурси и роли;
- проверките кой има достъп до ballot, round, team, participant, portal link и Stream token;
- защитата на custom judge portal token-ите;
- webhook verification;
- ограничаването на полетата, които API endpoints връщат;
- validation на входните данни;
- предотвратяване на broken access control в публичните `/api/*` handlers.

## ЧАСТ 4 — ГОТОВ ТЕКСТ ЗА ДОКУМЕНТАЦИЯ

Debatera използва външна услуга за удостоверяване на потребителите. По наличния код стандартният sign in и sign up flow е делегиран към Clerk чрез компонентите `SignIn`, `SignUp` и `ClerkProvider`. В локалната база данни приложението поддържа собствен модел `User`, но той служи като профилен и приложен слой и съдържа идентификатор от Clerk, email, имена и допълнителни профилни данни. В кода не се вижда Debatera да съхранява потребителски пароли или техни хешове в собствената база.

Авторизацията в приложението се реализира основно чрез server-side проверки в API route handlers и server actions. Налични са роли на ниво институция (`ADMIN`, `MEMBER`) и на ниво турнирно участие (`DEBATER`, `JUDGE`), както и роля на съдия в конкретен дебат (`CHAIR`, `PANELIST`). В текущата версия ролята „администратор на турнир“ е реализирана като създателя на турнира. При чувствителни операции като редакция на ballot, управление на участници, round management, venue management и генериране на judge portal links се правят проверки на сървъра, а не само в потребителския интерфейс.

За достъп до базата данни се използва Prisma с PostgreSQL. В приложния код не се вижда използване на raw SQL заявки от типа `queryRaw` или `executeRaw`, което ограничава риска от SQL injection при показаните пътища за достъп. Освен това в няколко ключови модула се използва schema validation със Zod, включително за ballot submission, tournament settings, rounds и профилни данни. На места има и допълнителна server-side бизнес валидация, например за допустими оценки, ownership на ballot и състояние на round.

По отношение на XSS и HTML injection, в repo-то не се вижда използване на `dangerouslySetInnerHTML`, markdown/html renderer или библиотека за директно HTML рендериране. Потребителско съдържание като bio, motion, info slide и speaker names се подава към React като обикновен текст в JSX. Това означава, че приложението разчита на стандартното escaping поведение на React при този начин на употреба.

Debatera използва и custom token-based достъп за judge portal. Този достъп не използва локални пароли, а случайно генерирани токени, при които в базата се пази само SHA-256 hash, а не plaintext стойността. За отделната video функционалност приложението издава Stream user tokens само server-side и само след проверка дали потребителят има право да влезе в конкретния debate call. Clerk webhook-ът също се проверява чрез подпис със Svix.

Трябва да се отбележи, че въпреки наличието на тези мерки, защитата на приложението зависи силно от коректността на отделните API handlers. В кода не се виждат централно конфигурирани security headers, CSP, rate limiting или app-level CSRF механизъм, а някои GET endpoints връщат данни без достатъчна проверка за видимост и достъп. Затова сигурността на Debatera е частично осигурена от използваните технологии, но частично остава отговорност на самото приложение и следва да се подобрява с допълнителни server-side ограничения.

## ЧАСТ 5 — КАКВО ЛИПСВА / РИСКОВЕ

### Наличие в текущия код

- Clerk поема стандартното удостоверяване на потребителите.
- Локалната база не показва password storage за нормалните акаунти.
- Има server-side role и ownership проверки за много mutation endpoints.
- Judge portal token-ите не се пазят в plaintext; пази се само `SHA-256` hash.
- Portal token validation проверява tournament match, revoke status и `JUDGE` role.
- Stream token-ите се издават само server-side и само след eligibility check.
- Clerk webhook-ът се верифицира чрез Svix signature.
- Използва се Zod и допълнителна server-side validation.
- Prisma се използва без raw SQL в приложния runtime код.
- Не се вижда raw HTML rendering или `dangerouslySetInnerHTML`.
- `.env` и `.env*.local` са игнорирани; tracked е само `.env.example`.

### Не е потвърдено

- Точните `httpOnly` / `secure` / `sameSite` флагове на Clerk cookies не са потвърдени от repo-то.
- MFA, email verification, password reset policy и session hardening на Clerk не са потвърдени от repo-то.
- App-level CSRF защита не се вижда; евентуални Clerk/browser protections не са потвърдени от repo-то.
- Security headers, CSP, HSTS, X-Frame-Options и Referrer-Policy не са потвърдени от repo-то.
- Rate limiting не е потвърдено от repo-то.
- Централизирано audit logging не е потвърдено от repo-то.

### Препоръчителни подобрения

- Да се добавят явни access checks за `GET /api/institutions/[id]` и `GET /api/tournaments/[id]`, съобразени с `isPublic`, membership и field minimization.
- Да се заключат `GET /api/tournaments/[id]/rounds/[roundId]` и особено `GET /api/tournaments/[id]/rounds/[roundId]/pairings` така, че да не изтичат данни за private турнири към анонимни/неупълномощени потребители.
- Да се ограничат публичните response shapes чрез `select`, вместо `user: true` и `createdBy: true`.
- Да се добави expiry за judge portal token-ите и по възможност rotation/one-time semantics.
- Да се премахне query-string fallback за portal token-а и API достъпът да остане само през `Authorization: Bearer`.
- Да се валидира/whitelist-не host/protocol при генериране на абсолютни portal URLs.
- Да се добавят security headers и CSP.
- Да се добави rate limiting за публични endpoints, token endpoints и webhook endpoint.
- Да се въведе audit log за admin действия, link generation, revoke и критични промени по tournament state.
- Да се документира изрично кое е public и кое е private API поведение, защото в момента има видима непоследователност.

## Файлове, които задължително да прегледам ръчно

- `src/proxy.ts`
- `src/app/api/institutions/[id]/route.ts`
- `src/app/api/tournaments/[id]/route.ts`
- `src/app/api/tournaments/[id]/rounds/[roundId]/pairings/route.ts`
- `src/app/api/tournaments/[id]/rounds/[roundId]/route.ts`
- `src/lib/services/mvp.ts`
- `src/lib/tournamentRounds/queries.ts`
- `src/lib/portal/auth.ts`
- `src/lib/portal/tokens.ts`
- `src/app/api/stream/token/route.ts`
- `src/app/api/webhooks/clerk/route.ts`
- `prisma/schema.prisma`

## Точни твърдения, които можем безопасно да сложим в документацията

- Debatera използва Clerk за стандартното удостоверяване на потребителите.
- По наличния код Debatera не съхранява локално пароли за потребителските акаунти.
- Локалната таблица `User` се използва за профилни данни и синхронизация с Clerk.
- Приложението използва Prisma за достъп до PostgreSQL базата данни.
- В приложния код не се вижда използване на raw SQL от типа `queryRaw`/`executeRaw`.
- В няколко ключови модула се използва Zod за server-side validation.
- Judge portal достъпът използва отделни токени, при които в базата се пази само hash, а не plaintext token.
- Clerk webhook-ът се верифицира чрез подпис със Svix.
- Потребителско съдържание не се рендерира чрез `dangerouslySetInnerHTML` според наличния код.

## Твърдения, които НЕ бива да пишем, защото не са доказани

- „Паролите се хешират с bcrypt/argon2/scrypt/pbkdf2.“
- „Debatera има собствен password reset механизъм.“
- „Всички cookies са `httpOnly`, `secure` и `sameSite=strict`.“
- „Приложението има CSRF защита.“
- „Приложението има CSP и пълен набор security headers.“
- „Приложението има rate limiting.“
- „Приложението има audit logging.“
- „Всички private турнири и институции са надеждно защитени от неупълномощен достъп.“
- „Judge portal token-ите изтичат автоматично след определено време.“
