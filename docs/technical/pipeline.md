# Видео-пайплайн анализа конкурентов

## Назначение

`video_pipeline.py` — инструмент конкурентной разведки. Автоматически обрабатывает видео-записи демо конкурентных CRM и генерирует структурированный анализ.

## Пререквизиты

```bash
pip3 install Pillow imagehash
```

Также необходимы в PATH:
- `ffmpeg` — извлечение фреймов и аудио
- `whisper-cli` (whisper-cpp) — транскрипция аудио
- Модель whisper: `~/.cache/whisper-cpp/ggml-small.bin`
- `claude` — Claude Code CLI для AI-анализа

## Запуск

```bash
# Все видео из ./videos/
python3 video_pipeline.py

# Одно видео
python3 video_pipeline.py --single videos/demo.mp4

# Пропустить уже обработанные
python3 video_pipeline.py --skip-existing

# Без веб-ресёрча (stage 6)
python3 video_pipeline.py --no-research

# Без генерации PRD (stage 7)
python3 video_pipeline.py --no-prd

# Принудительный язык транскрипции
python3 video_pipeline.py --whisper-lang ru

# Тюнинг извлечения фреймов
python3 video_pipeline.py --interval 2.5 --threshold 5

# Лимит ходов Claude CLI
python3 video_pipeline.py --max-turns 20
```

## Стадии пайплайна

### Stage 1: Извлечение фреймов
- **Инструмент:** ffmpeg
- **Вход:** видеофайл (.mp4, .mov)
- **Выход:** `frames/` — JPG-скриншоты с заданным интервалом
- **Параметры:** `--interval` (секунды между фреймами)

### Stage 2: Дедупликация фреймов
- **Инструмент:** Pillow + imagehash
- **Метод:** Perceptual hashing (pHash)
- **Параметр:** `--threshold` (минимальная разница хэшей)
- **Результат:** удаление визуально идентичных фреймов

### Stage 3: Транскрипция аудио
- **Инструмент:** whisper-cpp (локально, без API)
- **Модель:** ggml-small.bin
- **Выход:** `transcript/` — JSON с таймштампами, CSV-сегменты, `transcript.txt`
- **Параметр:** `--whisper-lang` (auto-detect по умолчанию)

### Stage 4: Маппинг фреймов и транскрипта
- Сопоставление временных меток скриншотов с сегментами транскрипта
- Каждый фрейм получает контекст — что говорилось в момент показа этого экрана

### Stage 5: AI-анализ конкурента
- **Инструмент:** Claude Code CLI
- **Вход:** скриншоты + транскрипт + маппинг
- **Выход:** `competitor_analysis.json` — структурированный анализ:
  - Product capabilities
  - UI/UX patterns
  - Feature inventory
  - Technical stack assessment
  - Pricing model

### Stage 6: Веб-обогащение
- **Инструмент:** Claude CLI + Tavily MCP
- **Вход:** имя продукта + первичный анализ
- **Выход:** `analysis_web.json` — данные из открытых источников:
  - Компания, юрисдикция
  - Технологический стек (по BuiltWith/Wappalyzer данным)
  - Отзывы, упоминания
  - Ценообразование

### Stage 7: Генерация PRD
- **Инструмент:** Claude CLI
- **Вход:** все competitor_analysis.json
- **Выход:** Product backlog, release plan

## Структура выходных данных

```
Transcript_videos/<VideoStem>/
├── frames/                    Дедуплицированные скриншоты (JPG)
├── transcript/                Сырые сегменты whisper (JSON, CSV)
├── transcript.txt             Полный текст транскрипта
├── manifest.json              Метаданные запуска пайплайна
├── overview.json              Высокоуровневый обзор продукта
├── competitor_analysis.json   Полный структурированный анализ
├── analysis.json              Альтернативное именование (некоторые запуски)
├── analysis_web.json          Данные веб-обогащения
└── enrichment_stage*.log      Логи Claude CLI по стадиям
```

## Обработанные конкуренты

| Папка | Продукт | Статус | В стратегическом отчёте |
|-------|---------|--------|------------------------|
| `CRM_Mate` | CRM Mate | Полный анализ | Да |
| `Elnopy` | Elnopy | Полный анализ | Да |
| `HyperOne` | HyperOne | Полный анализ + техническое расследование | Да |
| `Leadgreed` | Leadgreed | Полный анализ | Да |
| `GetLinked` | GetLinked | Анализ есть, overview.json | Нет |
| `trackbox` | Trackbox | Анализ есть, overview.json | Нет |

Папка `Демо CRM GetLinked` содержит отдельный прогон с `competitor_analysis.json` и `web_research.json`.
