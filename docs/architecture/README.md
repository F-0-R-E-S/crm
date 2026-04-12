# GambChamp CRM — Architecture Catalog

**Версия:** 1.0  
**Дата:** Апрель 2026  
**Статус:** Draft → Review

Этот каталог — единая точка входа в техническую архитектуру продукта.  
Каждый документ поддерживается в актуальном состоянии вместе с кодом.

---

## Структура каталога

```
docs/architecture/
├── README.md                    ← этот файл, индекс каталога
├── 01-overview.md               ← обзор системы, принципы, стек
├── 02-services.md               ← описание каждого сервиса
├── 03-data-model.md             ← схема БД, ER-модель, партиционирование
├── 04-lead-lifecycle.md         ← полный жизненный цикл лида
├── 05-tech-stack.md             ← технологические решения и их обоснование
├── 06-infrastructure.md         ← деплой, CI/CD, мониторинг
├── services/
│   ├── intake-service.md        ← Lead Intake Service spec
│   ├── router-service.md        ← Routing Engine spec
│   ├── integration-service.md   ← Broker Integration Service spec
│   ├── autologin-service.md     ← Autologin Pipeline spec
│   ├── fraud-service.md         ← Anti-Fraud Service spec
│   ├── notification-service.md  ← Notification Service spec
│   ├── analytics-service.md     ← Analytics & Reporting spec
│   └── admin-api.md             ← Admin / CRUD API spec
├── data-model/
│   ├── leads.md                 ← таблица leads (основная)
│   ├── routing.md               ← distributions, flows, caps
│   ├── integrations.md          ← brokers, templates, autologin
│   └── analytics.md             ← events, conversions (ClickHouse)
├── api/
│   ├── intake-api.md            ← POST /leads, webhooks
│   ├── admin-api.md             ← CRUD endpoints
│   └── affiliate-api.md         ← affiliate-facing endpoints
└── infrastructure/
    ├── docker-compose.yml        ← локальная разработка
    ├── deployment.md             ← production deployment
    └── monitoring.md             ← метрики, алерты, SLO
```

---

## Быстрый старт

| Что хочу понять | Куда идти |
|----------------|-----------|
| Общая картина системы | [01-overview.md](01-overview.md) |
| Как обрабатывается лид | [04-lead-lifecycle.md](04-lead-lifecycle.md) |
| Схема базы данных | [03-data-model.md](03-data-model.md) |
| API для аффилейта | [api/intake-api.md](api/intake-api.md) |
| Как добавить нового брокера | [services/integration-service.md](services/integration-service.md) |
| Как работает антифрод | [services/fraud-service.md](services/fraud-service.md) |
| Как деплоить | [infrastructure/deployment.md](infrastructure/deployment.md) |

---

## Версии документов

| Документ | Версия | Последнее обновление | Автор |
|----------|--------|---------------------|-------|
| README (этот) | 1.0 | 2026-04-12 | — |
| 01-overview | 1.0 | 2026-04-12 | — |
| 02-services | 1.0 | 2026-04-12 | — |
| 03-data-model | 1.0 | 2026-04-12 | — |
| 04-lead-lifecycle | 1.0 | 2026-04-12 | — |
| 05-tech-stack | 1.0 | 2026-04-12 | — |
| 06-infrastructure | 1.0 | 2026-04-12 | — |
