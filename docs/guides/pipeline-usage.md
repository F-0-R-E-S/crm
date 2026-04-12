# Работа с видео-пайплайном

## Назначение

Пайплайн `video_pipeline.py` автоматически обрабатывает видео-записи демо конкурентных CRM и генерирует структурированный конкурентный анализ.

## Установка зависимостей

```bash
# Python-зависимости
pip3 install Pillow imagehash

# ffmpeg (macOS)
brew install ffmpeg

# whisper-cpp
brew install whisper-cpp
# Или сборка из исходников: https://github.com/ggerganov/whisper.cpp

# Модель whisper
mkdir -p ~/.cache/whisper-cpp
# Скачать ggml-small.bin в ~/.cache/whisper-cpp/

# Claude Code CLI
# Должен быть установлен и доступен как `claude`
```

## Подготовка видео

1. Поместите видеофайл в `./videos/`
2. Поддерживаемые форматы: `.mp4`, `.mov`
3. Рекомендуется: демо-запись экрана конкурентного CRM с голосовым комментарием

## Запуск

### Обработка всех видео

```bash
python3 video_pipeline.py
```

### Обработка одного видео

```bash
python3 video_pipeline.py --single videos/competitor_demo.mp4
```

### Пропуск уже обработанных

```bash
python3 video_pipeline.py --skip-existing
```

### Без определённых стадий

```bash
# Без веб-исследования
python3 video_pipeline.py --no-research

# Без генерации PRD
python3 video_pipeline.py --no-prd
```

### Тюнинг параметров

```bash
# Интервал извлечения фреймов (секунды)
python3 video_pipeline.py --interval 2.5

# Порог дедупликации (больше = меньше фреймов)
python3 video_pipeline.py --threshold 5

# Язык транскрипции (auto-detect по умолчанию)
python3 video_pipeline.py --whisper-lang ru

# Лимит ходов Claude CLI на стадию
python3 video_pipeline.py --max-turns 20
```

## Стадии обработки

| # | Стадия | Инструмент | Выход |
|---|--------|------------|-------|
| 1 | Извлечение фреймов | ffmpeg | `frames/*.jpg` |
| 2 | Дедупликация | imagehash (pHash) | Удаление дубликатов |
| 3 | Транскрипция | whisper-cpp | `transcript/`, `transcript.txt` |
| 4 | Маппинг фрейм↔транскрипт | Python | Связанные данные |
| 5 | AI-анализ конкурента | Claude CLI | `competitor_analysis.json` |
| 6 | Веб-обогащение | Claude CLI + Tavily | `analysis_web.json` |
| 7 | Генерация PRD | Claude CLI | Product backlog |

## Выходная структура

```
Transcript_videos/<VideoStem>/
├── frames/                     Скриншоты
├── transcript/                 JSON + CSV сегменты
├── transcript.txt              Полный текст
├── manifest.json               Метаданные запуска
├── overview.json               Обзор продукта
├── competitor_analysis.json    Полный анализ
├── analysis_web.json           Веб-данные
└── enrichment_stage*.log       Логи по стадиям
```

## Работа с результатами

### Просмотр анализа конкурента

```bash
# JSON с форматированием
python3 -m json.tool Transcript_videos/CRM_Mate/competitor_analysis.json | head -100
```

### Включение в стратегический отчёт

Результаты анализа используются для обновления:
- `strategic_analysis_report.md` — сводный рыночный анализ
- `GAP_ANALYSIS_v1.md` — функциональная матрица
- Product backlog — приоритизация на основе GAP-анализа

### Текущий статус обработки

| Конкурент | Полный анализ | Веб-обогащение | В отчёте |
|-----------|:-------------:|:--------------:|:--------:|
| CRM Mate | ✅ | — | ✅ |
| Elnopy | ✅ | — | ✅ |
| HyperOne | ✅ | — | ✅ |
| Leadgreed | ✅ | — | ✅ |
| GetLinked | ✅ | ✅ | ❌ |
| Trackbox | ✅ | ✅ | ❌ |

## Troubleshooting

**whisper-cli не найден:**
Убедитесь, что бинарник whisper-cpp доступен в PATH как `whisper-cli`.

**Модель не найдена:**
Скачайте `ggml-small.bin` в `~/.cache/whisper-cpp/`.

**Claude CLI ошибки:**
Проверьте, что `claude` CLI установлен и авторизован. Увеличьте `--max-turns` если анализ обрывается.

**Мало фреймов:**
Уменьшите `--interval` (чаще извлекать) и `--threshold` (меньше дедуплицировать).
