# Решение по `react-starter`

Дата: 2026-08-26

## Решение

`react-starter` использован как reference, а не как template. В Insta Chat
адаптированы только его полезные frontend-механизмы: React SPA composition,
router/provider boundary, TanStack Query, RHF + Zod, responsive UI, простая
FSD-структура, Tailwind v4 token layer и shadcn/Base UI primitives.

## Что вошло в проект

- `app` содержит providers, router, auth guard и responsive operator shell;
- `pages` содержат login, dashboard, campaign editor, history и public info;
- `features` содержат query/mutation models и содержательные editor, login,
  connection и history UI-компоненты;
- `entities` содержат campaign list, delivery metrics и form schema/defaults/DTO
  mapping;
- `shared/api.ts` использует Hono RPC/native fetch, а `shared/ui/` содержит
  небольшие доступные UI primitives.

Сохранены продуктовые URL и добавлены loading/empty/error состояния, client-side
filters последних 50 deliveries и confirmation для массовых public replies.
После login OAuth endpoint получает полную document navigation к Worker, тогда
как admin routes остаются client-side navigation.

## Tailwind и tokens

`src/frontend/styles.css` следует структуре
`react-starter/src/app/styles/index.css`: это только Tailwind v4 imports,
`@theme inline`, OKLCH light/dark variables и глобальный base layer. Поверхности
компонентов используют semantic utilities (`bg-background`, `bg-card`,
`text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring` и
sidebar tokens), а не прежние page-specific CSS selectors.
`@fontsource-variable/inter`, `tw-animate-css` и `shadcn/tailwind.css`
подключены как реальные части token/build слоя.

`components.json` описывает Base UI/Vite/FSD aliases для будущего `shadcn add`,
но CLI не запускался поверх темы: source-owned компоненты были адаптированы
вручную из starter. Для сложных primitives действует shadcn-first правило:
при добавлении Dialog, Sheet, Select, Popover, Tooltip или Table сначала берём
Base UI composition из starter, затем меняем только theme/API integration.

## Что сознательно не перенесено

Не нужны полный auth/account foundation, универсальный CRUD, пустые slices,
Axios, Orval/OpenAPI, собственная design-system registry или отдельный frontend
deployment. Backend contract находится в том же репозитории и типизирован через
Hono client.

Если появятся несколько продуктов или команд, starter можно пересмотреть как
отдельный package. Для текущего Worker локальная адаптация проще для поддержки и
не скрывает бизнес-правила за большим foundation.

## Точный source → adapted mapping

| `react-starter` source                                                   | Insta Chat adaptation                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/ui/button.tsx`                                               | `src/frontend/shared/ui/button.tsx`: Base UI `Button`, CVA variants, starter `isLoading`/`loadingLabel`, `data-slot` и `Spinner`; классы переведены на semantic Tailwind tokens       |
| `src/shared/ui/input.tsx`                                                | `src/frontend/shared/ui/input.tsx`: Base UI `Input` с typed props и `data-slot="input"`                                                                                               |
| `src/shared/ui/textarea.tsx`                                             | `src/frontend/shared/ui/textarea.tsx`: typed textarea с `data-slot="textarea"`, потому что starter не добавляет отдельный textarea primitive                                          |
| `src/shared/ui/label.tsx`                                                | `src/frontend/shared/ui/label.tsx`: starter-compatible `Label`, `data-slot` и явный `htmlFor`                                                                                         |
| `src/shared/ui/field.tsx` и `field-a11y.ts`                              | `src/frontend/shared/ui/field.tsx`: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, стабильные IDs и `aria-describedby`/`aria-invalid`                                       |
| `src/shared/ui/alert.tsx`                                                | `src/frontend/shared/ui/alert.tsx`: `Alert`, `AlertTitle`, `AlertDescription`; `InlineError` использует destructive variant                                                           |
| `src/shared/ui/badge.tsx`                                                | `src/frontend/shared/ui/badge.tsx`: Base UI `useRender`/`mergeProps` + CVA `Badge`; `StatusBadge` добавляет доменные статусы                                                          |
| `src/shared/ui/card.tsx`                                                 | `src/frontend/shared/ui/card.tsx`: `Card` и header/content/footer primitives для dashboard/history с token utilities                                                                  |
| `src/shared/ui/spinner.tsx`                                              | `src/frontend/shared/ui/spinner.tsx`: Tailwind spinner с `role="status"`                                                                                                              |
| `src/shared/ui/alert-dialog.tsx`                                         | `src/frontend/shared/ui/alert-dialog.tsx`: Base UI alert-dialog primitive с portal, focus management, Escape и restore; campaign backfill/retry больше не используют `window.confirm` |
| `src/shared/ui/sheet.tsx`                                                | `src/frontend/shared/ui/sheet.tsx`: Base UI Dialog composition для мобильной навигации с controlled open, modal focus trap, Escape и restore; desktop aside остаётся отдельным        |
| `src/shared/ui/button.test.tsx`, `field.test.tsx`, `text-field.test.tsx` | `test/frontend-ui.test.tsx`: loading contract, `data-slot`, field label/error wiring и Base UI alert-dialog focus/Escape/restore                                                      |

## Правило для следующих компонентов

Для сложных компонентов `Dialog`, `Sheet`, `Select`, `Popover`, `Tooltip` и
`Table` сначала используется соответствующий shadcn/Base UI source из starter,
а затем он адаптируется к текущей теме и API продукта. Самописная имитация
поведения допустима только если в starter нет подходящего primitive и это
зафиксировано в решении. В текущем наборе `@base-ui/react`, CVA, `clsx` и
`tailwind-merge` используются для реальных Button, Input, Badge и
AlertDialog; Sidebar, Tooltip, auth foundation и прочие неиспользуемые slices
не переносятся.
