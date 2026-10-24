# Решение по `nest-js-starter`

Дата: 2026-08-26

## Решение

Код NestJS starter не переносится в Insta Chat. Его production foundation
рассчитан на отдельный Node-процесс, PostgreSQL/Prisma, Redis, BullMQ и Docker,
тогда как этот продукт остаётся одним Cloudflare Worker с D1 и Queue.

## Что действительно адаптировано

Из примера взяты только framework-neutral принципы, которые уменьшают связанность:

- отдельный Worker composition root;
- вертикальные модули `admin-auth`, `instagram-connection`, `campaigns` и
  `deliveries`;
- application use cases, получающие явные repository ports;
- infrastructure adapters для D1 и provider boundaries;
- независимые unit/integration тесты вместо тестирования только контроллеров.

Это локальные TypeScript-модули, а не Nest modules, decorators или контейнер DI.

## Почему не PostgreSQL/ORM/Redis

D1 уже даёт typed bindings, `batch()` и нужные conditional SQL updates. В MVP
нет нагрузки и запросов, для которых ORM или отдельный Redis/BullMQ добавили бы
ценность. Queue закрывает быстрый webhook response и повтор обработки, а
идемпотентность защищена уникальным campaign/comment ключом в D1.

Пересмотр понадобится только при мультиаккаунтном SaaS, командах и ролях,
биллинге, требованиях PostgreSQL или отдельных постоянно работающих процессах.
