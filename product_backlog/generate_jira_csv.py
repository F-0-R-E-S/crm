#!/usr/bin/env python3
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT_FILES = [
    ROOT / "epic-01-lead-intake-api.md",
    ROOT / "epic-02-lead-routing-engine.md",
    ROOT / "epics-03-07-p0.md",
    ROOT / "epics-08-13-p1.md",
    ROOT / "epics-14-19-p2.md",
    ROOT / "epics-20-23-p3.md",
]
OUTPUT_FILE = ROOT / "jira_import_all_issues.csv"
README_FILE = ROOT / "jira_import_readme.md"

RE_EPIC = re.compile(r"^## \[(EPIC-\d{2})\]\s+(.+?)\s*$")
RE_STORY = re.compile(r"^\[(STORY-\d{3})\]\s+(.+?)\s*$")
RE_TASK = re.compile(r"^\[(TASK-\d{4})\]\s+(.+?)\s*$")
RE_STORY_POINTS = re.compile(r"^Story Points:\s*(\d+)")
RE_STORY_PRIORITY = re.compile(r"^Приоритет:\s*(Must|Should|Could|Won't)")
RE_STORY_EPIC = re.compile(r"^Epic:\s*\[(EPIC-\d{2})\]")
RE_STORY_DEP = re.compile(r"^Зависит от:\s*(.+)$")
RE_TASK_TYPE = re.compile(r"^Тип:\s*(Backend|Frontend|Design|DevOps|QA|Docs)")
RE_TASK_DESC = re.compile(r"^Описание:\s*(.+)$")
RE_TASK_EST = re.compile(r"^Оценка:\s*(\d+h)")
RE_TASK_STORY = re.compile(r"^Story:\s*\[(STORY-\d{3})\]")
RE_EPIC_PRIORITY = re.compile(r"^Приоритет:\s*(P0|P1|P2|P3)")
RE_EPIC_DEP = re.compile(r"^Зависит от:\s*(.+)$")
RE_EPIC_EST = re.compile(r"^Оценка:\s*(.+)$")

EPIC_PRIORITY_MAP = {
    "P0": "Highest",
    "P1": "High",
    "P2": "Medium",
    "P3": "Low",
}
STORY_PRIORITY_MAP = {
    "Must": "Highest",
    "Should": "High",
    "Could": "Medium",
    "Won't": "Lowest",
}


def normalize_dep(raw: str) -> str:
    raw = raw.strip()
    if raw == "-":
        return ""
    return raw


def parse_files():
    epics = {}
    stories = {}
    tasks = {}

    current_epic = None
    current_story = None
    current_task = None
    collecting_epic_metrics = False

    def ensure_epic(epic_id: str, title: str):
        if epic_id not in epics:
            epics[epic_id] = {
                "id": epic_id,
                "title": title,
                "goal": "",
                "metrics": [],
                "priority": "P2",
                "depends": "",
                "estimate": "",
            }

    for path in INPUT_FILES:
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        for i, line in enumerate(lines):
            line = line.rstrip()

            m_epic = RE_EPIC.match(line)
            if m_epic:
                epic_id, title = m_epic.groups()
                ensure_epic(epic_id, title)
                current_epic = epic_id
                current_story = None
                current_task = None
                collecting_epic_metrics = False
                continue

            m_story = RE_STORY.match(line)
            if m_story:
                story_id, title = m_story.groups()
                current_story = story_id
                current_task = None
                collecting_epic_metrics = False
                stories[story_id] = {
                    "id": story_id,
                    "title": title,
                    "as_line": "",
                    "acceptance": [],
                    "points": "",
                    "priority": "Should",
                    "epic": current_epic or "",
                    "depends": "",
                }
                continue

            m_task = RE_TASK.match(line)
            if m_task:
                task_id, title = m_task.groups()
                current_task = task_id
                collecting_epic_metrics = False
                tasks[task_id] = {
                    "id": task_id,
                    "title": title,
                    "type": "",
                    "description": "",
                    "dod": [],
                    "estimate": "",
                    "story": current_story or "",
                }
                continue

            if current_task:
                mt = RE_TASK_TYPE.match(line)
                if mt:
                    tasks[current_task]["type"] = mt.group(1)
                    continue

                md = RE_TASK_DESC.match(line)
                if md:
                    tasks[current_task]["description"] = md.group(1)
                    continue

                me = RE_TASK_EST.match(line)
                if me:
                    tasks[current_task]["estimate"] = me.group(1)
                    continue

                ms = RE_TASK_STORY.match(line)
                if ms:
                    tasks[current_task]["story"] = ms.group(1)
                    continue

                if line.startswith("- [ ]"):
                    tasks[current_task]["dod"].append(line.replace("- [ ]", "-").strip())
                    continue

            if current_story and not current_task:
                if line.startswith("Как "):
                    stories[current_story]["as_line"] = line
                    continue

                ma = RE_STORY_POINTS.match(line)
                if ma:
                    stories[current_story]["points"] = ma.group(1)
                    continue

                mp = RE_STORY_PRIORITY.match(line)
                if mp:
                    stories[current_story]["priority"] = mp.group(1)
                    continue

                mep = RE_STORY_EPIC.match(line)
                if mep:
                    stories[current_story]["epic"] = mep.group(1)
                    continue

                mdp = RE_STORY_DEP.match(line)
                if mdp:
                    stories[current_story]["depends"] = normalize_dep(mdp.group(1))
                    continue

                if line.startswith("- [ ] AC"):
                    stories[current_story]["acceptance"].append(line.replace("- [ ]", "-").strip())
                    continue

            if current_epic and not current_story and not current_task:
                if line.startswith("Метрика успеха:"):
                    collecting_epic_metrics = True
                    continue

                if collecting_epic_metrics:
                    if line.startswith("-"):
                        epics[current_epic]["metrics"].append(line.strip())
                        continue
                    if line.startswith("Приоритет:"):
                        collecting_epic_metrics = False

                if line.startswith("Цель:"):
                    epics[current_epic]["goal"] = line.split("Цель:", 1)[1].strip()
                    continue

                mp = RE_EPIC_PRIORITY.match(line)
                if mp:
                    epics[current_epic]["priority"] = mp.group(1)
                    continue

                md = RE_EPIC_DEP.match(line)
                if md:
                    epics[current_epic]["depends"] = normalize_dep(md.group(1))
                    continue

                me = RE_EPIC_EST.match(line)
                if me:
                    epics[current_epic]["estimate"] = me.group(1).strip()
                    continue

    # Backfill missing story->epic from local context if absent
    for sid, story in stories.items():
        if not story["epic"]:
            # find nearest epic by numeric ranges not needed due source consistency
            pass

    # Derive task story if somehow missing by adjacency (already captured from field)
    return epics, stories, tasks


def row_description_epic(epic):
    metrics = "\n".join(epic["metrics"])
    parts = [
        f"Цель: {epic['goal']}" if epic["goal"] else "",
        f"Метрика успеха:\n{metrics}" if metrics else "",
        f"Зависит от: {epic['depends']}" if epic["depends"] else "",
        f"Оценка: {epic['estimate']}" if epic["estimate"] else "",
    ]
    return "\n\n".join([p for p in parts if p])


def row_description_story(story):
    ac = "\n".join(story["acceptance"])
    parts = [
        story["as_line"],
        f"Acceptance Criteria:\n{ac}" if ac else "",
        f"Зависит от: {story['depends']}" if story["depends"] else "",
        f"Epic: {story['epic']}" if story["epic"] else "",
    ]
    return "\n\n".join([p for p in parts if p])


def row_description_task(task):
    dod = "\n".join(task["dod"])
    parts = [
        f"Тип: {task['type']}" if task["type"] else "",
        f"Описание: {task['description']}" if task["description"] else "",
        f"Критерии готовности (DoD):\n{dod}" if dod else "",
    ]
    return "\n\n".join([p for p in parts if p])


def main():
    epics, stories, tasks = parse_files()

    story_priority_by_id = {}
    for sid, story in stories.items():
        story_priority_by_id[sid] = STORY_PRIORITY_MAP.get(story["priority"], "Medium")

    rows = []

    # Epics
    for epic_id in sorted(epics.keys()):
        epic = epics[epic_id]
        rows.append({
            "Issue ID": epic_id,
            "Issue Type": "Epic",
            "Summary": f"[{epic_id}] {epic['title']}",
            "Description": row_description_epic(epic),
            "Priority": EPIC_PRIORITY_MAP.get(epic["priority"], "Medium"),
            "Story Points": "",
            "Original Estimate": "",
            "Epic Name": f"{epic_id} {epic['title']}",
            "Epic Link": "",
            "Parent ID": "",
            "Labels": f"crm-prd,backlog,{epic_id.lower()}",
            "Depends On": epic["depends"],
        })

    # Stories
    for story_id in sorted(stories.keys()):
        story = stories[story_id]
        rows.append({
            "Issue ID": story_id,
            "Issue Type": "Story",
            "Summary": f"[{story_id}] {story['title']}",
            "Description": row_description_story(story),
            "Priority": STORY_PRIORITY_MAP.get(story["priority"], "Medium"),
            "Story Points": story["points"],
            "Original Estimate": "",
            "Epic Name": "",
            "Epic Link": story["epic"],
            "Parent ID": story["epic"],
            "Labels": f"crm-prd,backlog,{story['epic'].lower()},{story_id.lower()}" if story["epic"] else f"crm-prd,backlog,{story_id.lower()}",
            "Depends On": story["depends"],
        })

    # Tasks as Sub-tasks under stories
    for task_id in sorted(tasks.keys()):
        task = tasks[task_id]
        parent_story = task["story"]
        task_priority = story_priority_by_id.get(parent_story, "Medium")
        rows.append({
            "Issue ID": task_id,
            "Issue Type": "Sub-task",
            "Summary": f"[{task_id}] {task['title']}",
            "Description": row_description_task(task),
            "Priority": task_priority,
            "Story Points": "",
            "Original Estimate": task["estimate"],
            "Epic Name": "",
            "Epic Link": "",
            "Parent ID": parent_story,
            "Labels": f"crm-prd,backlog,{parent_story.lower()},{task.get('type', '').lower()}" if parent_story else "crm-prd,backlog",
            "Depends On": "",
        })

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "Issue ID",
                "Issue Type",
                "Summary",
                "Description",
                "Priority",
                "Story Points",
                "Original Estimate",
                "Epic Name",
                "Epic Link",
                "Parent ID",
                "Labels",
                "Depends On",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    README_FILE.write_text(
        """
# Jira Import Guide

## Files
- `jira_import_all_issues.csv`: единый импорт-файл (Epic + Story + Sub-task).

## Recommended Jira CSV Mapping
- `Issue ID` -> External Issue ID (для связей внутри импорта)
- `Issue Type` -> Issue Type
- `Summary` -> Summary
- `Description` -> Description
- `Priority` -> Priority
- `Story Points` -> Story Points
- `Original Estimate` -> Original estimate
- `Epic Name` -> Epic Name (для Epic)
- `Epic Link` -> Epic Link (для Story, если project company-managed)
- `Parent ID` -> Parent (если project team-managed / hierarchy через parent)
- `Labels` -> Labels

## Notes
- В файле одновременно заполнены `Epic Link` и `Parent ID` для Story. При импорте выберите схему, которая подходит вашему Jira project type.
- `Depends On` оставлен как вспомогательная колонка (можно импортировать в custom field или обработать post-import automation).
""".strip()
        + "\n",
        encoding="utf-8",
    )

    print(f"Generated: {OUTPUT_FILE}")
    print(f"Generated: {README_FILE}")
    print(f"Epics: {len(epics)}")
    print(f"Stories: {len(stories)}")
    print(f"Tasks: {len(tasks)}")
    print(f"Total rows: {len(rows)}")


if __name__ == "__main__":
    main()
