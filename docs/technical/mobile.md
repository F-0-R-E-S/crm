# Мобильное приложение

## Обзор

GambChamp CRM Mobile — мобильное приложение для мониторинга платформы на iOS и Android. Построено на Expo (React Native) с file-based routing.

## Стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| Expo | 52 | Платформа и toolchain |
| React Native | 0.76.6 | UI runtime |
| Expo Router | 4 | File-based маршрутизация |
| TanStack Query | 5.18 | Data fetching |
| Zustand | 4.5 | State management |
| Expo Secure Store | — | Безопасное хранение токенов |
| date-fns | — | Форматирование дат |

## Конфигурация

- **Bundle ID:** `com.gambchamp.crm`
- **Имя:** GambChamp CRM
- **Plugins:** expo-router, expo-secure-store, expo-asset

## Экраны

### Tab Navigation (Bottom Tabs)

| Tab | Файл | Описание |
|-----|------|----------|
| Dashboard | `app/(tabs)/index.tsx` | Основные KPI, графики |
| Leads | `app/(tabs)/leads.tsx` | Список лидов, фильтрация |
| Brokers | `app/(tabs)/brokers.tsx` | Статус брокеров |
| Analytics | `app/(tabs)/analytics.tsx` | Метрики и отчёты |
| Settings | `app/(tabs)/settings.tsx` | Настройки, профиль |

### Отдельные экраны

| Экран | Файл | Описание |
|-------|------|----------|
| Login | `app/login.tsx` | Аутентификация |
| Lead Detail | `app/lead/[id].tsx` | Детальная карточка лида |

## API Client

`src/lib/api.ts`:
- Base URL: `EXPO_PUBLIC_API_URL` или `http://localhost:8080/api/v1`
- Auto-refresh token при 401 через Zustand auth store
- Methods: `get`, `post`, `put`, `patch`, `delete`
- Безопасное хранение токенов через `expo-secure-store`

## Auth Store

`src/stores/auth.ts`:
- JWT token + refresh token в Secure Store
- Auto-login при запуске (restore from Secure Store)
- Logout с очисткой токенов

## Тема

`src/theme/` — единая цветовая палитра и стилевые константы:
- `colors.ts` — цвета по категориям (primary, success, warning, danger, neutral)
- `index.ts` — typography, spacing, borderRadius, shadows

## Компоненты

- `StatusBadge.tsx` — бейдж статуса лида (адаптирован для RN)

## Типы

`src/types/index.ts` — общие типы: Lead, Broker, Affiliate, User, AnalyticsData

## Запуск

```bash
cd mobile
npm install

# iOS
npx expo start --ios

# Android
npx expo start --android

# Web (dev)
npx expo start --web
```

## Структура файлов

```
mobile/
├── app.json                   Expo конфигурация
├── package.json               Зависимости
├── babel.config.js            Babel config
├── tsconfig.json              TypeScript config
├── app/
│   ├── _layout.tsx            Root layout (auth guard)
│   ├── login.tsx              Login screen
│   ├── (tabs)/
│   │   ├── _layout.tsx        Tab navigation layout
│   │   ├── index.tsx          Dashboard
│   │   ├── leads.tsx          Leads list
│   │   ├── brokers.tsx        Brokers
│   │   ├── analytics.tsx      Analytics
│   │   └── settings.tsx       Settings
│   └── lead/
│       └── [id].tsx           Lead detail (dynamic route)
└── src/
    ├── components/            Shared components
    ├── lib/api.ts             API client
    ├── stores/auth.ts         Auth state
    ├── theme/                 Design tokens
    └── types/index.ts         TypeScript types
```
