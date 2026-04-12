# Конкурентный анализ

## Обзор

Проанализировано 6 конкурентов через видео-демо записи, транскрипты и веб-исследование. Данные хранятся в `Transcript_videos/<CompetitorName>/`.

## Конкуренты

### CRM Mate
- **Ценовой сегмент:** ~$700/мес
- **Регион:** Восточная Европа
- **Сильные стороны:**
  - Уникальная фича: автологин через реальные Android-устройства
  - Cloaking (единственный конкурент с этим)
  - Delayed Actions (запланированные изменения правил) — уникальная фича
- **Слабые стороны:**
  - Нет idempotency key
  - Нет нормализации телефонов E.164
  - Нет per-country caps
  - Нет UTM-фильтрации
- **Источник:** `Transcript_videos/CRM_Mate/competitor_analysis.json`

### Elnopy
- **Ценовой сегмент:** ~$200/мес (самый дешёвый)
- **Сильные стороны:**
  - 200+ шаблонов брокерских интеграций
  - CR Limits (ограничение конверсии по периоду) — уникальная фича
  - Status Pipe Pending — уникальный антифрод-подход
  - Продвинутые таймслоты
- **Слабые стороны:**
  - Базовый UI/UX
  - Ограниченная аналитика
- **Источник:** `Transcript_videos/Elnopy/competitor_analysis.json`

### HyperOne
- **Ценовой сегмент:** $999+/мес (самый дорогой)
- **Регион:** Украина/Кипр
- **Сильные стороны:**
  - 400+ шаблонов интеграций (максимум на рынке)
  - ProRedirect — собственный proxy для автологина
  - 4D антифрод-анализ + WebGL fingerprint
  - Мультивертикальность (крипто, форекс, gambling, nutra)
  - Клонирование конфигурации брокеров
- **Слабые стороны:**
  - Переусложнённый UI
  - Высокая цена
  - Enterprise-фокус, сложный onboarding
- **Техническое расследование:** `Transcript_videos/HyperOne/investigation app/`
  - Frontend: Angular 16.2.12
  - Backend: 4 микросервиса, session-based auth
  - Полный API reference и forms catalog

### Leadgreed
- **Сильные стороны:**
  - Best-in-class waterfall routing
  - Per-country caps (уникальная фича)
  - 20+ переменных в postback
  - Failover autologin (смена брокера при неудаче)
  - Лучшая специфичность матчинга (GEO+aff+params)
  - Opening Hours — лучшая реализация
  - Clone broker config
- **Слабые стороны:**
  - Нет CSV/массового импорта
  - Нет idempotency key
- **Источник:** `Transcript_videos/Leadgreed/competitor_analysis.json` (125K — самый детальный)

### GetLinked
- **Статус:** Анализ завершён, НЕ включён в стратегический отчёт
- **Данные:**
  - `Transcript_videos/GetLinked/` — analysis.json, analysis_web.json, overview.json
  - `Transcript_videos/Демо CRM GetLinked/` — competitor_analysis.json, web_research.json
- **Особенности:** Два прогона пайплайна (разные стадии)

### Trackbox (trackbox.ai)
- **Статус:** Самый новый, НЕ включён в стратегический отчёт и бэклог
- **Данные:** `Transcript_videos/trackbox/` — analysis.json, analysis_web.json, overview.json
- **Особенности:** Обработан через обновлённую версию пайплайна (3-стадийная)

## Функциональная матрица (выборка)

Полная матрица: [`GAP_ANALYSIS_v1.md`](../../GAP_ANALYSIS_v1.md)

| Функция | CRM Mate | Elnopy | HyperOne | Leadgreed | GetLinked | Trackbox |
|---------|:--------:|:------:|:--------:|:---------:|:---------:|:--------:|
| REST API intake | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Idempotency key | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| E.164 normalization | ❌ | 🟡 | 🟡 | ❌ | ❌ | ❌ |
| Waterfall routing | ✅ | ✅ | ✅ | ⭐ | ✅ | ✅ |
| Per-country caps | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ |
| 400+ broker templates | — | — | ⭐ | — | — | — |
| Cloaking | ⭐ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Real Android autologin | ⭐ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Failover autologin | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ |

**Ключевые ГЭПы (gaps) — наши возможности:**
- Idempotency key — никто не имеет
- E.164 нормализация — только частичная у двух конкурентов
- Per-country caps — только Leadgreed
- Delayed Actions — только CRM Mate
- CR Limits — только Elnopy
- Прозрачное ценообразование — никто

## Источники данных

| Конкурент | competitor_analysis.json | overview.json | analysis_web.json | В отчёте |
|-----------|:------------------------:|:-------------:|:-----------------:|:--------:|
| CRM Mate | ✅ (50K) | — | — | ✅ |
| Elnopy | ✅ (97K) | — | — | ✅ |
| HyperOne | ✅ (65K) | — | — | ✅ |
| Leadgreed | ✅ (125K) | — | — | ✅ |
| GetLinked | ✅ (59K + 63K) | ✅ (13K) | ✅ (25K) | ❌ |
| Trackbox | — | ✅ (67K) | ✅ (28K) | ❌ |
