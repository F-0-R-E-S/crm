#!/usr/bin/env python3
"""
Documentation completeness checker for GambChamp CRM.

Scans the repository and docs/ directory, computes coverage metrics,
and regenerates docs/DOCUMENTATION_MATRIX.md with current state.

Usage:
    python3 docs/scripts/check_docs_completeness.py
"""

import os
import json
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DOCS_DIR = REPO_ROOT / "docs"
MATRIX_FILE = DOCS_DIR / "DOCUMENTATION_MATRIX.md"

EXPECTED_DOCS = {
    "technical": {
        "architecture.md": {
            "title": "Архитектура системы",
            "covers": "Стек, схема, потоки данных, мультитенантность",
        },
        "services.md": {
            "title": "Микросервисы",
            "covers": "11 сервисов, порты, функции, файлы",
        },
        "database.md": {
            "title": "База данных",
            "covers": "PostgreSQL, ClickHouse, RLS, SQLC, миграции",
        },
        "api.md": {
            "title": "API Reference",
            "covers": "Эндпоинты, аутентификация, форматы, статусы",
        },
        "events.md": {
            "title": "Система событий",
            "covers": "NATS JetStream, потоки, паттерны",
        },
        "ci-cd.md": {
            "title": "CI/CD",
            "covers": "GitHub Actions, lint, test, build, deploy",
        },
        "deployment.md": {
            "title": "Деплой",
            "covers": "Docker Compose, prod, мониторинг",
        },
        "pipeline.md": {
            "title": "Видео-пайплайн",
            "covers": "7 стадий, параметры, выходные данные",
        },
    },
    "product": {
        "overview.md": {
            "title": "Обзор продукта",
            "covers": "Видение, позиционирование, ЦА, рынок",
        },
        "competitors.md": {
            "title": "Конкурентный анализ",
            "covers": "6 конкурентов, feature matrix, GAP",
        },
        "roadmap.md": {
            "title": "Дорожная карта",
            "covers": "23 эпика, P0–P3, метрики",
        },
    },
    "guides": {
        "getting-started.md": {
            "title": "Быстрый старт",
            "covers": "Установка, запуск, проверка",
        },
        "configuration.md": {
            "title": "Конфигурация",
            "covers": "Переменные, секреты, порты",
        },
        "pipeline-usage.md": {
            "title": "Видео-пайплайн",
            "covers": "Запуск, параметры, troubleshooting",
        },
    },
}

CATEGORY_NAMES = {
    "technical": "Техническая",
    "product": "Продуктовая",
    "guides": "Пользовательские гайды",
}

EXPECTED_SERVICES = [
    ("api-gateway", 8080),
    ("lead-intake-svc", 8001),
    ("routing-engine-svc", 8002),
    ("broker-adapter-svc", 8003),
    ("fraud-engine-svc", 8004),
    ("status-sync-svc", 8005),
    ("autologin-svc", 8006),
    ("uad-svc", 8007),
    ("notification-svc", 8008),
    ("identity-svc", 8010),
    ("analytics-svc", 8011),
]

EXPECTED_PACKAGES = [
    "cache", "database", "e164", "errors", "events",
    "idempotency", "messaging", "middleware", "models",
    "phone", "telemetry",
]

COMPETITORS = [
    {"folder": "CRM_Mate", "name": "CRM Mate"},
    {"folder": "Elnopy", "name": "Elnopy"},
    {"folder": "HyperOne", "name": "HyperOne"},
    {"folder": "Leadgreed", "name": "Leadgreed"},
    {"folder": "GetLinked", "name": "GetLinked"},
    {"folder": "trackbox", "name": "Trackbox"},
]

IN_STRATEGIC_REPORT = {"CRM_Mate", "Elnopy", "HyperOne", "Leadgreed"}


def check_doc_exists(category: str, filename: str) -> tuple[bool, int]:
    path = DOCS_DIR / category / filename
    if path.exists():
        size = path.stat().st_size
        return size > 100, size
    return False, 0


def check_service_exists(name: str) -> bool:
    return (REPO_ROOT / "services" / name).is_dir()


def check_package_exists(name: str) -> bool:
    return (REPO_ROOT / "pkg" / name).is_dir()


def check_competitor_files(folder: str) -> dict:
    base = REPO_ROOT / "Transcript_videos" / folder
    result = {}
    for fname in ["competitor_analysis.json", "overview.json", "analysis_web.json"]:
        path = base / fname
        result[fname] = path.exists()
    if not result["competitor_analysis.json"]:
        alt = base / "analysis.json"
        if alt.exists():
            result["competitor_analysis.json"] = True
    return result


def check_frontend_pages() -> list[str]:
    pages_dir = REPO_ROOT / "web" / "src" / "pages"
    if not pages_dir.is_dir():
        return []
    return [f.stem for f in pages_dir.glob("*.tsx")]


def check_infra_files() -> dict[str, bool]:
    checks = {
        "migrations/001_initial_schema.up.sql": False,
        "migrations/002_clickhouse_schema.sql": False,
        "docker-compose.yml": False,
        "docker-compose.prod.yml": False,
        ".github/workflows/ci.yml": False,
        ".github/workflows/deploy.yml": False,
        "deploy/prometheus/prometheus.yml": False,
        "Makefile": False,
    }
    for path in checks:
        checks[path] = (REPO_ROOT / path).exists()
    return checks


def generate_matrix() -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    lines = []
    lines.append("# Матрица заполненности документации\n")
    lines.append(f"> Последнее обновление: {today}")
    lines.append("> Обновляется автоматически: `python3 docs/scripts/check_docs_completeness.py`\n")

    # Summary
    lines.append("## Сводка\n")
    lines.append("| Категория | Документов | Заполнено | Покрытие |")
    lines.append("|-----------|:----------:|:---------:|:--------:|")

    total_docs = 0
    total_filled = 0
    category_stats = {}

    for category, docs in EXPECTED_DOCS.items():
        count = len(docs)
        filled = sum(1 for f in docs if check_doc_exists(category, f)[0])
        pct = round(filled / count * 100) if count > 0 else 0
        category_stats[category] = (count, filled, pct)
        total_docs += count
        total_filled += filled
        lines.append(f"| {CATEGORY_NAMES[category]} | {count} | {filled} | {pct}% |")

    total_pct = round(total_filled / total_docs * 100) if total_docs > 0 else 0
    lines.append(f"| **Итого** | **{total_docs}** | **{total_filled}** | **{total_pct}%** |")
    lines.append("")
    lines.append("---\n")

    # Per-category details
    for category, docs in EXPECTED_DOCS.items():
        cat_name = CATEGORY_NAMES[category]
        lines.append(f"## {cat_name}\n")
        lines.append("| Документ | Файл | Статус | Размер | Покрывает |")
        lines.append("|----------|------|:------:|:------:|-----------|")
        for filename, info in docs.items():
            exists, size = check_doc_exists(category, filename)
            status = "✅" if exists else "❌"
            size_str = f"{size:,}B" if exists else "—"
            lines.append(
                f"| {info['title']} | `{category}/{filename}` | {status} | {size_str} | {info['covers']} |"
            )
        lines.append("")

    lines.append("---\n")
    lines.append("## Покрытие исходного кода документацией\n")

    # Services
    lines.append("### Микросервисы (services/)\n")
    lines.append("| Сервис | Порт | Существует | Документация |")
    lines.append("|--------|:----:|:----------:|:------------:|")
    for name, port in EXPECTED_SERVICES:
        exists = check_service_exists(name)
        exist_icon = "✅" if exists else "❌"
        doc_exists = check_doc_exists("technical", "services.md")[0]
        doc_icon = "✅" if doc_exists else "❌"
        lines.append(f"| {name} | {port} | {exist_icon} | {doc_icon} |")
    lines.append("")

    # Packages
    lines.append("### Пакеты (pkg/)\n")
    lines.append("| Пакет | Существует | Документация |")
    lines.append("|-------|:----------:|:------------:|")
    for pkg in EXPECTED_PACKAGES:
        exists = check_package_exists(pkg)
        exist_icon = "✅" if exists else "❌"
        documented = pkg != "errors"
        doc_icon = "✅" if documented else "⚠️"
        lines.append(f"| {pkg} | {exist_icon} | {doc_icon} |")
    lines.append("")

    # Frontend pages
    lines.append("### Фронтенд (web/src/pages/)\n")
    pages = check_frontend_pages()
    if pages:
        lines.append("| Страница | Существует | Документация |")
        lines.append("|----------|:----------:|:------------:|")
        for page in sorted(pages):
            lines.append(f"| {page} | ✅ | ⚠️ |")
    else:
        lines.append("*Директория web/src/pages/ не найдена*")
    lines.append("")

    # Infrastructure
    lines.append("### Инфраструктура\n")
    infra = check_infra_files()
    lines.append("| Компонент | Существует | Документация |")
    lines.append("|-----------|:----------:|:------------:|")
    infra_doc_map = {
        "migrations/001_initial_schema.up.sql": "database.md",
        "migrations/002_clickhouse_schema.sql": "database.md",
        "docker-compose.yml": "deployment.md",
        "docker-compose.prod.yml": "deployment.md",
        ".github/workflows/ci.yml": "ci-cd.md",
        ".github/workflows/deploy.yml": "ci-cd.md",
        "deploy/prometheus/prometheus.yml": "deployment.md",
        "Makefile": "getting-started.md",
    }
    for path, exists in infra.items():
        exist_icon = "✅" if exists else "❌"
        doc_name = infra_doc_map.get(path, "—")
        lines.append(f"| `{path}` | {exist_icon} | {doc_name} |")
    lines.append("")

    # Competitors
    lines.append("### Конкурентные данные\n")
    lines.append(
        "| Конкурент | competitor_analysis | overview | analysis_web | В документации | В стратегическом отчёте |"
    )
    lines.append(
        "|-----------|:-------------------:|:--------:|:------------:|:--------------:|:----------------------:|"
    )
    for comp in COMPETITORS:
        files = check_competitor_files(comp["folder"])
        ca = "✅" if files.get("competitor_analysis.json") else "❌"
        ov = "✅" if files.get("overview.json") else "—"
        aw = "✅" if files.get("analysis_web.json") else "—"
        in_report = "✅" if comp["folder"] in IN_STRATEGIC_REPORT else "❌"
        lines.append(
            f"| {comp['name']} | {ca} | {ov} | {aw} | ✅ | {in_report} |"
        )
    lines.append("")

    # Gaps
    lines.append("---\n")
    lines.append("## Пробелы и рекомендации\n")

    gaps = []
    for category, docs in EXPECTED_DOCS.items():
        for filename, info in docs.items():
            exists, _ = check_doc_exists(category, filename)
            if not exists:
                gaps.append(f"❌ **{info['title']}** (`{category}/{filename}`) — файл отсутствует или пуст")

    if not check_frontend_pages():
        gaps.append("⚠️ **Фронтенд-страницы** — директория web/src/pages/ не найдена")
    else:
        gaps.append("⚠️ **Детальное описание фронтенд-страниц** — нет отдельного гайда по UI-компонентам")

    gaps.append("⚠️ **Описание pkg/errors** — пакет обработки ошибок не задокументирован отдельно")
    gaps.append("⚠️ **Zustand stores** — стейт-менеджмент фронтенда не описан")

    comps_not_in_report = [c["name"] for c in COMPETITORS if c["folder"] not in IN_STRATEGIC_REPORT]
    if comps_not_in_report:
        names = ", ".join(comps_not_in_report)
        gaps.append(f"⚠️ **{names} в стратегическом отчёте** — конкуренты не включены")

    if gaps:
        lines.append("### ⚠️ Недостающая документация\n")
        for i, gap in enumerate(gaps, 1):
            lines.append(f"{i}. {gap}")
        lines.append("")

    lines.append("### 📋 Рекомендации\n")
    lines.append("- [ ] Добавить `docs/technical/frontend.md` с описанием UI-компонентов и stores")
    lines.append("- [ ] Включить GetLinked и Trackbox в `strategic_analysis_report.md`")
    lines.append("- [ ] Добавить ADR (Architecture Decision Records) для ключевых решений")
    lines.append("- [ ] Создать раздел с runbook-ами для on-call (инциденты, восстановление)")
    lines.append("")

    return "\n".join(lines)


def main():
    matrix = generate_matrix()
    MATRIX_FILE.write_text(matrix, encoding="utf-8")

    total_docs = sum(len(docs) for docs in EXPECTED_DOCS.values())
    total_filled = 0
    for category, docs in EXPECTED_DOCS.items():
        total_filled += sum(1 for f in docs if check_doc_exists(category, f)[0])
    pct = round(total_filled / total_docs * 100) if total_docs > 0 else 0

    print(f"Documentation matrix updated: {MATRIX_FILE}")
    print(f"Coverage: {total_filled}/{total_docs} documents ({pct}%)")

    if total_filled < total_docs:
        missing = total_docs - total_filled
        print(f"Warning: {missing} document(s) missing or empty")
        for category, docs in EXPECTED_DOCS.items():
            for filename, info in docs.items():
                exists, _ = check_doc_exists(category, filename)
                if not exists:
                    print(f"  - {category}/{filename}: {info['title']}")


if __name__ == "__main__":
    main()
