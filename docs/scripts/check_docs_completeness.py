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
            "covers": "Стек, схема, 13 сервисов, потоки данных, мультитенантность",
        },
        "services.md": {
            "title": "Микросервисы",
            "covers": "13 сервисов, порты, функции, файлы",
        },
        "database.md": {
            "title": "База данных",
            "covers": "PostgreSQL, ClickHouse, RLS, SQLC, 6 миграций",
        },
        "api.md": {
            "title": "API Reference",
            "covers": "REST API, аутентификация, assistant, smart-routing, UAD",
        },
        "events.md": {
            "title": "Система событий",
            "covers": "NATS JetStream, потоки, cmd_handler паттерны",
        },
        "ci-cd.md": {
            "title": "CI/CD",
            "covers": "GitHub Actions, lint, test, build, deploy",
        },
        "deployment.md": {
            "title": "Деплой",
            "covers": "Docker Compose, prod, deploy.yml, мониторинг",
        },
        "pipeline.md": {
            "title": "Видео-пайплайн",
            "covers": "7 стадий, параметры, выходные данные",
        },
        "frontend.md": {
            "title": "Фронтенд",
            "covers": "React 18, 15 страниц, Liquid Glass UI, stores, hooks",
        },
        "mobile.md": {
            "title": "Мобильное приложение",
            "covers": "Expo React Native, iOS/Android, 7 экранов",
        },
        "assistant.md": {
            "title": "AI Assistant",
            "covers": "Claude API, 40+ tools, RBAC, SSE streaming",
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
            "covers": "23 эпика, 6 потоков, прогресс реализации",
        },
    },
    "guides": {
        "getting-started.md": {
            "title": "Быстрый старт",
            "covers": "Установка, запуск, бэкенд, фронтенд, мобайл",
        },
        "configuration.md": {
            "title": "Конфигурация",
            "covers": "Переменные, секреты, порты, external APIs",
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
    ("assistant-svc", 8012),
    ("smart-routing-svc", 8013),
]

EXPECTED_PACKAGES = [
    "cache", "database", "e164", "email", "errors", "events",
    "geoip", "idempotency", "messaging", "middleware", "models",
    "rbac", "telemetry",
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


def check_mobile_screens() -> list[str]:
    tabs_dir = REPO_ROOT / "mobile" / "app" / "(tabs)"
    screens = []
    if tabs_dir.is_dir():
        screens.extend(f.stem for f in tabs_dir.glob("*.tsx") if f.stem != "_layout")
    other = REPO_ROOT / "mobile" / "app"
    if other.is_dir():
        screens.extend(f.stem for f in other.glob("*.tsx") if f.stem != "_layout")
    lead_dir = REPO_ROOT / "mobile" / "app" / "lead"
    if lead_dir.is_dir():
        screens.extend(f"lead/{f.stem}" for f in lead_dir.glob("*.tsx"))
    return screens


def check_infra_files() -> dict[str, bool]:
    checks = {
        "migrations/001_initial_schema.up.sql": False,
        "migrations/002_rbac_sessions_invites.up.sql": False,
        "migrations/004_assistant_schema.up.sql": False,
        "migrations/006_streams_2_to_6.up.sql": False,
        "docker-compose.yml": False,
        "docker-compose.deploy.yml": False,
        ".github/workflows/ci.yml": False,
        ".github/workflows/deploy.yml": False,
        "deploy/prometheus/prometheus.yml": False,
        "Makefile": False,
        "contracts/lead-schema.yaml": False,
        "STREAMS.md": False,
        "PRODUCT_BACKLOG_v1.md": False,
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

    for category, docs in EXPECTED_DOCS.items():
        count = len(docs)
        filled = sum(1 for f in docs if check_doc_exists(category, f)[0])
        pct = round(filled / count * 100) if count > 0 else 0
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
    documented_pkgs = {
        "cache": "architecture.md", "database": "database.md", "e164": "api.md",
        "email": "services.md", "events": "events.md", "geoip": "services.md",
        "idempotency": "api.md", "messaging": "events.md", "middleware": "api.md",
        "models": "database.md", "rbac": "assistant.md", "telemetry": "deployment.md",
    }
    for pkg in EXPECTED_PACKAGES:
        exists = check_package_exists(pkg)
        exist_icon = "✅" if exists else "❌"
        doc_ref = documented_pkgs.get(pkg)
        if doc_ref:
            doc_icon = f"✅ ({doc_ref})"
        elif pkg == "errors":
            doc_icon = "⚠️"
        else:
            doc_icon = "⚠️"
        lines.append(f"| {pkg} | {exist_icon} | {doc_icon} |")
    lines.append("")

    # Frontend pages
    lines.append("### Фронтенд (web/src/pages/)\n")
    pages = check_frontend_pages()
    frontend_doc = check_doc_exists("technical", "frontend.md")[0]
    if pages:
        lines.append("| Страница | Существует | Документация |")
        lines.append("|----------|:----------:|:------------:|")
        for page in sorted(pages):
            doc_icon = "✅" if frontend_doc else "⚠️"
            lines.append(f"| {page} | ✅ | {doc_icon} |")
    else:
        lines.append("*Директория web/src/pages/ не найдена*")
    lines.append("")

    # Mobile screens
    lines.append("### Мобильное приложение (mobile/app/)\n")
    mobile_screens = check_mobile_screens()
    mobile_doc = check_doc_exists("technical", "mobile.md")[0]
    if mobile_screens:
        lines.append("| Экран | Существует | Документация |")
        lines.append("|-------|:----------:|:------------:|")
        for screen in sorted(mobile_screens):
            doc_icon = "✅" if mobile_doc else "⚠️"
            lines.append(f"| {screen} | ✅ | {doc_icon} |")
    else:
        lines.append("*Директория mobile/app/ не найдена*")
    lines.append("")

    # Infrastructure
    lines.append("### Инфраструктура\n")
    infra = check_infra_files()
    lines.append("| Компонент | Существует | Док��ментация |")
    lines.append("|-----------|:----------:|:------------:|")
    infra_doc_map = {
        "migrations/001_initial_schema.up.sql": "database.md",
        "migrations/002_rbac_sessions_invites.up.sql": "database.md",
        "migrations/004_assistant_schema.up.sql": "assistant.md",
        "migrations/006_streams_2_to_6.up.sql": "database.md",
        "docker-compose.yml": "deployment.md",
        "docker-compose.deploy.yml": "deployment.md",
        ".github/workflows/ci.yml": "ci-cd.md",
        ".github/workflows/deploy.yml": "ci-cd.md",
        "deploy/prometheus/prometheus.yml": "deployment.md",
        "Makefile": "getting-started.md",
        "contracts/lead-schema.yaml": "roadmap.md",
        "STREAMS.md": "roadmap.md",
        "PRODUCT_BACKLOG_v1.md": "roadmap.md",
    }
    for path, exists in infra.items():
        exist_icon = "✅" if exists else "❌"
        doc_name = infra_doc_map.get(path, "—")
        lines.append(f"| `{path}` | {exist_icon} | {doc_name} |")
    lines.append("")

    # Competitors
    lines.append("### Конкурентные д��нные\n")
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
    lines.append("- [ ] Включить GetLinked и Trackbox в `strategic_analysis_report.md`")
    lines.append("- [ ] Добавить ADR (Architecture Decision Records) для ключевых решений")
    lines.append("- [ ] Создать раздел с runbook-ами для on-call (инциденты, восстановление)")
    lines.append("- [ ] Документировать Liquid Glass UI дизайн-систему (токены, компоненты)")
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
