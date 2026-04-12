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
