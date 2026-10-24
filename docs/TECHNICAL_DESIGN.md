# Technical Design: Insta Chat

Статус: модернизация MVP v0.4
Дата: 2026-08-26
Продуктовый источник истины: [`PRD.md`](PRD.md)

## 1. Граница решения

Insta Chat остаётся одним Cloudflare deployment для одного Instagram-аккаунта:
React SPA, Hono API, D1, Queue и cron работают внутри одного Worker. React
обслуживается через Cloudflare Static Assets; Worker запускается первым для
API, admin, OAuth, webhook и health путей. Остальные asset-запросы идут прямо
в assets binding, а неизвестный SPA-путь получает index.html fallback.

Публичные сценарии, OAuth/webhook URL и delivery-семантика сохранены. Единственное
изменение хранения — записи `deliveries` старше 30 дней удаляются cron; кампании
и подключение Instagram не удаляются.

## 2. Стек и границы зависимостей

- TypeScript, Node.js 24, pnpm 11.15.1;
- React 19, Vite, React Router, TanStack Query, React Hook Form и Zod;
- Hono, Hono RPC поверх native `fetch`, Cloudflare Vite plugin;
- Cloudflare Workers, Static Assets, D1, Queue и cron;
- прямой типизированный D1 API и существующие Wrangler migrations;
- официальный `@cloudflare/vitest-plugin` для workerd/D1 integration tests;
- Tailwind v4 как build utility/token layer, `@fontsource-variable/inter`,
  `tw-animate-css`, `@base-ui/react`/CVA и небольшой адаптированный shadcn UI
  слой. `src/frontend/styles.css` содержит только imports, semantic OKLCH
  variables и global base rules; page/component selectors туда не возвращаются.

Не используются NestJS, Prisma/PostgreSQL, Redis, BullMQ, Docker, Axios,
Orval/OpenAPI и универсальный DI-контейнер: они не дают пользу в одном Worker с
D1 и Queue.

## 3. Runtime и composition root

```text
Browser -> Cloudflare Static Assets (hashed files / SPA fallback)
       -> Worker fetch: Hono API, admin boundary, OAuth, webhook, health
Instagram webhook -> Hono -> Queue -> Worker queue consumer -> D1 + Meta API
Worker scheduled cron -> delivery retention cleanup (30 days)
```

`src/index.ts` — Worker entry: связывает fetch, queue и scheduled handlers.
`src/api.ts` — HTTP composition root: secure headers, repository assembly,
route mounting и единый safe error handler. `src/composition/repositories.ts`
создаёт D1 adapters per request. `Env`, D1 и provider `fetch` не попадают в
domain/application функции.

## 4. Структура проекта

```text
src/
  index.ts                         # Worker entry
  api.ts                           # Hono composition root
  composition/repositories.ts      # D1 adapter assembly
  modules/
    admin-auth/{application,presentation}
    instagram-connection/{application,infrastructure,presentation}
    campaigns/{application,infrastructure,presentation}
    deliveries/{application,infrastructure,presentation}
  frontend/
    app/{providers,router,shell}
    pages/{login,public-info,dashboard,campaign-editor,history}
    features/{session,dashboard,campaign-editor,instagram-connection,delivery-history}
    entities/{campaign,delivery}/ui
    shared/{api,navigation,ui/*}
  shared/{http,api-error,app-context}.ts
  infrastructure/db.ts           # storage rows and SQL primitives
```

Вертикальные модули разделены по реальной ответственности. Infrastructure
маппит D1 rows и инкапсулирует database/provider details; application получает
явные repository ports; presentation валидирует HTTP и возвращает DTO.
Storage snake_case, числовые boolean и encrypted token наружу не проходят:
каждый infrastructure adapter явно маппит rows в camelCase application/API
модели и нормализует timestamps в ISO/RFC3339.

## 5. Frontend

У SPA сохранены маршруты `/login`, `/admin`, `/admin/campaigns/new`,
`/admin/campaigns/:id`, `/admin/history`, `/privacy` и `/data-deletion`.
`main.tsx` — только entry. Router/providers/shell, страницы, feature mutations,
campaign entity schema/defaults и shared UI/API находятся в отдельных слоях.

Формы используют React Hook Form + Zod и показывают доступные ошибки, loading,
empty и error states. История получает последние 50 deliveries и фильтруется
на клиенте. Backfill/retry публичных ответов требуют подтверждения и передают
expected count, чтобы backend обнаружил изменение списка. UI responsive: desktop
sidebar превращается в мобильное меню. Страницы остаются тонкими композициями:
editor sections, login form, connection banner, campaign list, delivery metrics,
history filters/table живут в features/entities.

## 6. HTTP API

Внутренний admin API:

- `GET|POST|DELETE /api/admin/session`;
- `GET /api/admin/dashboard` и `GET /api/admin/media`;
- `POST /api/admin/campaigns`;
- `GET|PUT /api/admin/campaigns/:id`;
- `PUT /api/admin/campaigns/:id/status`;
- `POST /api/admin/campaigns/:id/public-replies/backfill`;
- `POST /api/admin/campaigns/:id/public-replies/retry-failed`;
- `GET /api/admin/history`.

Write DTO кампании не принимает `id`, `status` или revision: создание всегда
даёт draft, update сохраняет текущий status, активация и пауза — отдельная
операция. Даты — ISO strings, booleans — JSON booleans. Zod и `ApiError`
используют стабильные коды `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`,
`VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE` и
`INTERNAL_ERROR`.

## 7. Storage и delivery

Применённые `0001–0003` не изменяются. `0004_delivery_public_reply_lookup.sql`
добавляет индекс `(campaign_id, public_reply_status, created_at)` для выборок
backfill/retry. D1 `batch()` и conditional updates сохраняют атомарность
замены keywords и claim public reply.

Семантика доставки:

- unique campaign/comment не создаёт duplicate delivery;
- draft/paused не отправляют;
- `false` или unknown follower result не выдают ссылку;
- успешный Direct предшествует публичному ответу;
- provider unknown остаётся `unknown`, а не превращается в ложный success.

## 8. Security

Сессия остаётся HttpOnly/Secure/SameSite=Lax, Cloudflare Access email принимается
как дополнительный способ входа. Unsafe API requests требуют точного same-origin
и обязательного `Sec-Fetch-Site: same-origin`; локальные и workerd тесты явно
передают оба заголовка. Подключены secure headers на Worker-ответах; hashed
assets и SPA fallback могут обслуживаться напрямую Static Assets и не проходят
через этот middleware. После login Worker-owned `/oauth/instagram/start`
открывается document navigation, а SPA-owned admin paths — через router.
В логах нет token, cookie, полного комментария и сырого provider response.
OAuth token хранится только в encrypted D1 columns.

## 9. Проверка и evidence

Локальные ворота:

```bash
pnpm format
pnpm lint
pnpm architecture
pnpm typecheck
pnpm test:unit
pnpm test:worker
pnpm test:react
pnpm build
pnpm exec wrangler deploy --dry-run
```

Worker tests запускаются в workerd с реальными migrations в isolated D1 и
проверяют API not-found, SPA asset fallback, malformed JSON, ISO timestamps,
campaign lifecycle, retention и Queue consumer. Unit/use-case tests используют
fake repositories, clock и provider gateway. React tests проверяют redirect,
login/logout, campaign writes/status, confirmation, filters и safe errors.
TypeScript 7 остаётся compiler для typecheck через `@typescript/native`, а
ESLint parser работает на совместимом TypeScript 6 alias из starter pattern.
Локальный build и dry-run не доказывают
Cloudflare deploy, hosted availability, Meta App Review или real Instagram
smoke; эти действия требуют отдельного разрешения.

## 10. Starter decisions

Из `react-starter` адаптированы только идеи React SPA: router/provider
composition, TanStack Query, RHF/Zod, responsive shared UI, shadcn/Base UI
primitives и упрощённая FSD. Для новых сложных UI-элементов действует правило
shadcn-first: сначала берётся starter Base UI composition, затем адаптируются
классы и продуктовый API; неиспользуемый foundation не переносится.
`components.json` сохраняет Base UI/Vite/FSD aliases для будущего source-owned
расширения без запуска CLI, который мог бы переписать тему.
Полный starter foundation, универсальный CRUD и account slices не переносятся.

Из `nest-js-starter` адаптированы только практические границы ответственности:
composition root, repository ports, application use cases и test-first
проверка. Nest runtime, Prisma/PostgreSQL, Redis/BullMQ, Docker и generic DI не
переносятся. Подробные решения: [`REACT_STARTER_REUSE.md`](REACT_STARTER_REUSE.md)
и [`NEST_JS_STARTER_REUSE.md`](NEST_JS_STARTER_REUSE.md).
