# Фронтенд

## Стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 18.3 | UI-фреймворк |
| TypeScript | 5.3 | Типизация |
| Vite | 5.1 | Dev server + bundler |
| Tailwind CSS | 3.4 | Стилизация (Liquid Glass UI) |
| React Router | 6.22 | SPA-маршрутизация |
| TanStack Query | 5.18 | Data fetching / caching |
| Zustand | 4.5 | State management |
| date-fns | 3.3 | Форматирование дат |

## Дизайн-система: Liquid Glass UI

Кастомная дизайн-система в стиле iOS 26 / macOS 26:
- Glassmorphism эффекты (backdrop-blur, transparency)
- Мягкие тени и скруглённые углы
- Анимации переходов
- Адаптивная палитра

Конфигурация: `web/tailwind.config.js`, `web/src/index.css`

## Страницы (15 шт.)

### Основные

| Страница | Файл | Описание |
|----------|------|----------|
| Login | `LoginPage.tsx` | JWT-аутентификация |
| Dashboard | `DashboardPage.tsx` | KPI: лиды, конверсии, антифрод |
| Leads | `LeadsPage.tsx` | Список лидов с фильтрацией, поиском, статусами |
| Affiliates | `AffiliatesPage.tsx` | Управление аффилейтами, API-ключи |
| Brokers | `BrokersPage.tsx` | Конфигурация брокеров, health status |
| Routing | `RoutingPage.tsx` | Правила маршрутизации, caps, алгоритмы |
| Analytics | `AnalyticsPage.tsx` | ClickHouse дашборды, графики |
| Settings | `SettingsPage.tsx` | Настройки тенанта, профиль, 2FA |

### Новые (после MVP)

| Страница | Файл | Описание |
|----------|------|----------|
| Smart Routing | `SmartRoutingPage.tsx` | ML-рекомендации весов, прогноз исчерпания капов |
| UAD | `UADPage.tsx` | Сценарии реинъекции (batch/continuous/scheduled) |
| Users | `UsersPage.tsx` | Управление пользователями, приглашения, роли |
| Sessions | `SessionsPage.tsx` | Активные сессии устройств, revoke |
| Onboarding | `OnboardingPage.tsx` | 6-шаговый мастер настройки с шаблонами |
| Accept Invite | `AcceptInvitePage.tsx` | Принятие приглашения (имя, пароль) |
| Notification Preferences | `NotificationPreferencesPage.tsx` | Telegram, Email, Webhook настройки |

## Компоненты

### Layout
- `Layout.tsx` — App shell с сайдбаром навигации и AI assistant panel

### AI Assistant
- `AssistantPanel.tsx` — Полный чат-интерфейс в сайдбаре (список сессий, создание, загрузка)
- `AssistantInput.tsx` — Поле ввода с отправкой, disabled при streaming
- `AssistantMessage.tsx` — Рендеринг сообщений (user vs assistant), tool calls

### Общие
- `LeadDetail.tsx` — Детальная карточка лида с историей событий
- `StatusBadge.tsx` — Цветной бейдж статуса лида
- `NotificationBell.tsx` — Иконка с счётчиком непрочитанных, dropdown список
- `PermissionGate.tsx` — Условный рендеринг по RBAC-разрешениям

## Hooks

| Hook | Файл | Назначение |
|------|------|------------|
| useAssistantSSE | `hooks/useAssistantSSE.ts` | SSE streaming для AI assistant chat |
| useAssistantWS | `hooks/useAssistantWS.ts` | WebSocket для real-time событий assistant |
| usePermissions | `hooks/usePermissions.ts` | Проверка RBAC-разрешений текущего пользователя |

## Stores (Zustand)

### auth.ts
```typescript
user, token, refreshToken, permissions
login(), logout(), refresh(), setUser()
```

### assistant.ts
```typescript
isOpen, sessions, currentSessionId, messages
streamingMessage, isStreaming, pendingConfirmation
toggle(), open(), close()
setSessions(), setCurrentSession(), addMessage()
setStreaming(), appendStreamDelta()
addToolCall(), updateToolResult()
setPendingConfirmation(), finalizeStreamingMessage()
```

### notifications.ts
```typescript
items (Notification[]), unreadCount, loading
fetch(), markRead(id), markAllRead()
```
Polling каждые 30 секунд через `/notifications?limit=20`.

## API Client

`lib/api.ts` — fetch-обёртка с:
- Auto-refresh token при 401
- Bearer token injection
- Base URL: `/api/v1`

`lib/assistantApi.ts` — специализированный клиент для assistant:
- SSE streaming для chat
- Session CRUD
- Confirmation handling

## Структура файлов

```
web/src/
├── App.tsx                    Роутер и layout
├── main.tsx                   Entry point
├── index.css                  Global styles (Liquid Glass)
├── pages/                     15 страниц
├── components/                7 компонентов
├── hooks/                     3 хука
├── stores/                    3 стора (auth, assistant, notifications)
└── lib/
    ├── api.ts                 Основной API клиент
    └── assistantApi.ts        Assistant API клиент
```
