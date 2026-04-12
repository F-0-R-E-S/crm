# AI Assistant Architecture

## Обзор

Assistant Service — AI-ассистент для управления GambChamp CRM через естественный язык. Построен на Claude API с tool calling, интегрирован во все микросервисы через NATS.

## Стек

| Компонент | Технология |
|-----------|------------|
| LLM | Claude Sonnet (claude-sonnet-4-20250514) |
| Streaming | SSE (Server-Sent Events) |
| Real-time | WebSocket |
| Коммуникация | NATS request/reply (cmd_handler в каждом сервисе) |
| Персистентность | PostgreSQL (сессии, сообщения, аудит) |
| Кэш/контекст | Redis (tenant snapshots) |

## Архитектура

```
┌──────────────┐    SSE/WS     ┌──────────────────┐
│  Web UI      │◄─────────────►│  Assistant Svc   │
│  (React)     │               │     :8012        │
│  Assistant   │               │                  │
│  Panel       │               │  ┌────────────┐  │
└──────────────┘               │  │Claude API  │  │
                               │  │(streaming) │  │
                               │  └────────────┘  │
                               │                  │
                               │  ┌────────────┐  │      NATS
                               │  │Action      │──┼──────────────┐
                               │  │Executor    │  │              │
                               │  └────────────┘  │    ┌─────────▼──────────┐
                               │                  │    │ cmd_handler.go     │
                               │  ┌────────────┐  │    │ (в каждом сервисе) │
                               │  │Context     │  │    │                    │
                               │  │Manager     │  │    │ routing-engine     │
                               │  └────────────┘  │    │ broker-adapter     │
                               └──────────────────┘    │ fraud-engine       │
                                                       │ lead-intake        │
                                                       │ uad                │
                                                       │ notification       │
                                                       │ autologin          │
                                                       │ analytics          │
                                                       └────────────────────┘
```

## Компоненты

### Claude Client (`claude_client.go`)
- Обёртка над Claude API v1/messages
- Streaming и non-streaming режимы
- Prompt caching (ephemeral cache control)
- Трекинг токенов (input/output)

### Tools Registry (`tools.go`)
40+ инструментов, разделённых по сервисам:

| Категория | Примеры инструментов | Confirmation |
|-----------|---------------------|-------------|
| routing-engine | list_rules, create_rule, update_rule, delete_rule | None → Standard → Dangerous |
| broker-adapter | list_brokers, test_broker, update_broker | None → Standard |
| fraud-engine | check_lead, get_fraud_stats, update_profile | None → Standard |
| lead-intake | search_leads, get_lead_detail, export_leads | None |
| UAD | list_scenarios, create_scenario, toggle_scenario | None → Standard |
| notifications | get_preferences, update_preferences | None → Standard |
| autologin | list_sessions, get_session_status | None |
| analytics | get_dashboard, get_conversions, get_caps | None |

### RBAC для инструментов

Каждый инструмент привязан к ролям:

| Роль | Доступные категории |
|------|-------------------|
| super_admin | Все инструменты |
| network_admin | routing, brokers, affiliates, leads, fraud, UAD |
| affiliate_manager | affiliates, leads (свои) |
| team_lead | routing, leads, analytics |
| media_buyer | leads (свои), analytics (свои) |
| finance_manager | analytics, billing (read-only) |

### Action Executor (`action_executor.go`)
- Отправляет NATS request к целевому сервису
- Ожидает response с timeout
- Возвращает результат Claude для следующего шага
- Логирует в `assistant_action_log`

### Context Manager (`context_manager.go`)
Собирает snapshot контекста тенанта:
- Текущие caps и их утилизация (Redis)
- Активные правила маршрутизации (PostgreSQL)
- Последние алерты и события
- Используется в system prompt для контекстных ответов

### Confirmation Flow (`confirmation.go`)
Для опасных операций (delete, bulk update):
1. Claude генерирует tool_call
2. Frontend показывает confirmation dialog с impact analysis
3. Пользователь подтверждает/отклоняет
4. При подтверждении — Action Executor выполняет

### Rollback (`rollback.go`)
- Отслеживает выполненные действия в сессии
- Позволяет откатить последнее действие
- Хранит pre-state для восстановления

## API

### REST Endpoints

```
POST   /api/v1/assistant/sessions        — Создать сессию
GET    /api/v1/assistant/sessions        — Список сессий
GET    /api/v1/assistant/sessions/{id}   — Сессия с сообщениями
DELETE /api/v1/assistant/sessions/{id}   — Удалить сессию
POST   /api/v1/assistant/chat            — SSE chat (streaming)
GET    /api/v1/assistant/ws              — WebSocket для событий
```

### SSE Chat Flow

```
POST /api/v1/assistant/chat
Content-Type: application/json

{"session_id": "uuid", "message": "покажи лиды из UA за сегодня"}

--- SSE Response ---
data: {"type":"delta","content":"Ищу лиды..."}
data: {"type":"tool_call","name":"search_leads","input":{...}}
data: {"type":"tool_result","content":{...}}
data: {"type":"delta","content":"Найдено 42 лида из Украины..."}
data: {"type":"done","usage":{"input_tokens":1200,"output_tokens":350}}
```

## Схема БД

```sql
-- assistant_sessions
id, tenant_id, user_id, title, model,
total_input_tokens, total_output_tokens,
is_active, created_at, updated_at

-- assistant_messages
id, session_id, role (user|assistant|tool_use|tool_result),
content, tool_name, tool_input, created_at

-- assistant_action_log
id, session_id, tool_name, tool_input,
status (pending|success|failed|rolled_back),
result, error, rolled_back_at, created_at
```

Все таблицы защищены RLS по `tenant_id`.
