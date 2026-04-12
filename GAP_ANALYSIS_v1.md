# GAP ANALYSIS: Конкурентный ландшафт vs GambChamp CRM
**Дата:** Апрель 2026  
**Источники:** Видео-демо + транскрипты + анализ фреймов: CRM Mate, Elnopy, HyperOne, Leadgreed, GetLinked, trackbox.ai  
**Методология:** Прямое извлечение из `competitor_analysis.json` каждого конкурента

---

## ЧАСТЬ 1. МАТРИЦА ФУНКЦИЙ (Feature Gap Matrix)

Обозначения: ✅ Есть полностью | 🟡 Частично / в разработке | ❌ Нет | ⭐ Best-in-class реализация

| Функциональная область | CRM Mate | Elnopy | HyperOne | Leadgreed | GetLinked | trackbox.ai | **Наш приоритет** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **--- ПРИЁМ ЛИДОВ ---** | | | | | | | |
| REST API intake | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Phone/email валидация | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Deduplication | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| CSV/массовый импорт | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | P0 |
| Idempotency key | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **ГЭП → P0** |
| Нормализация телефона (E.164) | ❌ | 🟡 | 🟡 | ❌ | ❌ | ❌ | **ГЭП → P0** |
| IP геолокация при intake | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | P0 |
| **--- МАРШРУТИЗАЦИЯ ---** | | | | | | | |
| Вес (Weight-based) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Приоритетные группы (waterfall) | ✅ | ✅ | ✅ | ⭐ | ✅ | ✅ | P0 |
| GEO-фильтр | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Таймслоты / расписание | ✅ | ⭐ | ✅ | ⭐ | 🟡 | ✅ | P0 |
| Daily cap | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Total cap | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Per-source caps | 🟡(dev) | ✅ | ✅ | ✅ | ✅ | ❌ | P0 |
| Cap per country (раздельный) | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ | **ГЭП → P0** |
| Специфичность матчинга (GEO+aff+params) | 🟡 | 🟡 | ✅ | ⭐ | 🟡 | ❌ | P0 |
| Sub-параметры (aff_sub 1-10) | ❌ | ✅ | ✅ | ⭐ | ✅ | ✅ | P0 |
| UTM-фильтрация | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | P1 |
| Delayed Actions (запланированные изменения) | ⭐ | ❌ | ❌ | ❌ | ❌ | ❌ | **ГЭП уникальный → P1** |
| CR Limits (ограничение конверсии по периоду) | ❌ | ⭐ | ❌ | ❌ | ❌ | ❌ | **ГЭП → P2** |
| **--- БРОКЕРСКИЕ ИНТЕГРАЦИИ ---** | | | | | | | |
| Template-based интеграции | ✅ | ✅ | ⭐ 400+ | ✅ | ✅ | ✅ | P0 |
| Количество шаблонов | ~30-50 | 200+ | 400+ | н/д | н/д | н/д | P0 |
| Postback на события | ✅ | ✅ | ✅ | ⭐ 20+ vars | ✅ | ✅ | P0 |
| Кастомный field mapping | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P0 |
| Funnel name substitution | ⭐ | ✅ | ✅ | ✅ | ✅ | ❌ | P0 |
| Тест-лид без боевой отправки | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P0 |
| Opening Hours брокера | ❌ | ✅ | ✅ | ⭐ | ✅ | ❌ | P0 |
| Clone broker config | ❌ | ❌ | ✅ | ⭐ | ❌ | ❌ | P1 |
| **--- АВТОЛОГИН ---** | | | | | | | |
| Базовый автологин | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 |
| Real Android устройства | ⭐ уникально | ❌ | ❌ | ❌ | ❌ | ❌ | P1 |
| Собственный proxy/redirect | ❌ | ❌ | ⭐ ProRedirect | ❌ | ❌ | ❌ | P1 |
| Failover autologin (смена брокера) | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ | P1 |
| Device fingerprint в autologin | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | P1 |
| IP/GEO anomaly detection | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | P1 |
| SLA гарантия autologin | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **ГЭП → P1 дифференциатор** |
| **--- АНТИФРОД ---** | | | | | | | |
| IP-проверка | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | P0 |
| Email-проверка | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Phone line type (VOIP block) | ❌ | ✅ | ⭐ | ✅ | ❌ | ✅ | P0 |
| Fraud score (0-100) | ❌ | ✅ (опц.) | ⭐ | ✅ | ✅ | ✅ | P0 |
| Per-affiliate fraud profile | ❌ | ✅ | ⭐ | ✅ | ❌ | ❌ | P0 |
| Blacklist (IP/email/phone) | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | P0 |
| Status Pipe Pending (anti-shave) | 🟡 history | ⭐ | ❌ | ❌ | ❌ | ❌ | **ГЭП → P0** |
| Shave detection (status аномалии) | ✅ | ⭐ | ✅ | ✅ | ❌ | ❌ | P0 |
| Messenger validity check | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | P2 |
| Bot/VPN/TOR/Proxy детектирование | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | P2 |
| Fraud score объяснение (per-field) | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | **ГЭП → P1** |
| **--- ПЕРЕОТПРАВКА / UAD ---** | | | | | | | |
| Cold overflows / re-inject | ✅ | ✅ (Pool) | ✅ (UAD) | ❌ | 🟡 | ❌ | P1 |
| Расписание переотправки | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | P1 |
| Непрерывная переотправка (loop) | ❌ | ❌ | ⭐ | ❌ | ❌ | ❌ | P1 |
| Интервал между батчами | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | P1 |
| **--- АНАЛИТИКА ---** | | | | | | | |
| Dashboard KPI | 🟡 | ✅ | 🟡 | ⭐ | ✅ | ✅ | P1 |
| Фильтрация по 15+ параметрам | ❌ | ✅ | 🟡 | ⭐ | ✅ | ✅ | P1 |
| Drill-down отчёты | ❌ | ✅ | ❌ | ⭐ | ✅ | ✅ | P1 |
| Client History (детали каждой попытки) | 🟡 Logs | ❌ | ❌ | ⭐ | ❌ | ❌ | **ГЭП → P1** |
| BI / custom report builder | ❌ | ⭐ | ❌ | ❌ | 🟡 | ❌ | P2 |
| Funnel report | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | P1 |
| UTM-аналитика | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | P1 |
| Cap report (статус заполнения) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | P1 |
| Compare periods | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | P2 |
| Fake FTD управление | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ | **ГЭП редкий → P2** |
| Q-Leads / Quality score | ❌ | ❌ | ❌ | ❌ | ❌ | ⭐ | **ГЭП → P1** |
| Сравнение Real vs Fake в отчёте | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ | P2 |
| **--- ФИНАНСЫ ---** | | | | | | | |
| Finance / P&L модуль | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | P1 |
| Affiliate payout tracking | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P1 |
| CRG / Special Deals | ❌ | ❌ | ❌ | ❌ | ⭐ | ❌ | **ГЭП → P2** |
| Back-to-back сделки | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | P2 |
| Автоинвойсинг | ❌ | ❌ | ❌ | ❌ | ⭐ | ❌ | **ГЭП → P2** |
| Wallet (виртуальный баланс) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | P1 |
| Multi-currency | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | P2 |
| **--- АФФИЛЕЙТ МЕНЕДЖМЕНТ ---** | | | | | | | |
| RBAC / роли | ✅ | ✅ | ✅ | ✅ | ⭐ | ✅ | P0 |
| Per-column permissions | ❌ | ✅ | ❌ | ❌ | ⭐ | ❌ | **ГЭП → P2** |
| Affiliate levels (иерархия) | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | P1 |
| Sub-accounts аффилейтов | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | P1 |
| Manager / AM роль | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Sessions audit (устройства/IP) | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | P2 |
| Days until deactivation | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | P2 |
| **--- УВЕДОМЛЕНИЯ ---** | | | | | | | |
| Telegram bot | ✅ | ✅ | ✅ 17 events | ✅ | ✅ | ❌ | P1 |
| Telegram: cap-алерты | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | P1 |
| Telegram: fraud-алерты | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | P1 |
| Telegram: autologin events | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | P1 |
| Telegram: новый фанел | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | P1 |
| Webhook / email уведомления | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | P1 |
| In-app notification feed | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | P1 |
| **--- КЛОАКИНГ И ТРЕКИНГ ---** | | | | | | | |
| Built-in cloaking | ⭐ | ❌ | ❌ | ❌ | ❌ | ❌ | **Уникально → P1** |
| Keitaro интеграция | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | P1 |
| Facebook Pixel | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | P1 |
| MagickChecker / HideClick | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | P1 |
| GitLab-hosted landings | ⭐ | ❌ | ❌ | ❌ | ❌ | ❌ | P2 |
| Parameter replacement / UTM | ✅ | ✅ | ✅ | ✅ | ✅ | ⭐ | P0 |
| **--- БЕЛЫЙ ЛЕЙБЛ ---** | | | | | | | |
| White-label | ❌ | 🟡 (self-host) | ❌ | ❌ | ⭐ | ❌ | P3 |
| Multi-tenant | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | P3 |
| Custom domain | ❌ | ✅ (Advanced) | ❌ | ❌ | ✅ | ❌ | P3 |
| **--- ОПЕРАЦИОННЫЕ ИНСТРУМЕНТЫ ---** | | | | | | | |
| Task Manager / Kanban | ⭐ | ❌ | ❌ | ❌ | ❌ | ❌ | **Уникально → P2** |
| Module name customization | ❌ | ❌ | ❌ | ⭐ | ❌ | ❌ | P3 |
| Built-in support tickets | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | P2 |
| Knowledge base / manual | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | P2 |
| Release notes в продукте | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | P3 |
| Bulk inject из UI | ✅ | ✅ | ✅ | ❌ | ⭐ | ✅ | P1 |
| Country Groups | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | P0 |
| Status Groups / normalization | ✅ | ⭐ | ✅ | ✅ | ✅ | ✅ | P0 |
| Audit log (actions) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| Security: 2FA export protection | ✅ | ❌ | ❌ | ❌ | ❌ | ⭐ | P2 |
| Security: login anomaly detection | ❌ | ✅ sessions | ❌ | ❌ | ❌ | ⭐ | P2 |
| Pentest / security audit | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | P3 |
| **--- ПОДДЕРЖКА И ОНБОРДИНГ ---** | | | | | | | |
| Setup fee | ❌ | ✅ €500-1000 | ❌ | н/д | 3 домена | ❌ | ❌ дифференциатор |
| Onboarding время | ~15 мин/интеграция | медленный | быстрый | медленный | 1-2 часа | н/д | **<30 мин SLA** |
| Support SLA | ~24/7 | 5 мин Telegram | 24/7 Advanced | 8-22 | минуты | н/д | **15 мин SLA** |
| Dedicated integrations team | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | P0 |

---

## ЧАСТЬ 2. ГЭП-АНАЛИЗ ПО БИЗНЕС-ЦЕННОСТЯМ

### 2.1 Приём и качество лидов

**Что делают все**: базовый REST API, phone/email валидация, дедупликация, CSV импорт.

**Критические гэпы рынка:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **Idempotency Key** — защита от двойной отправки при retry аффилейта | Никто | Стандарт надёжного API. Обязательно в P0. Стоимость: 2 дня |
| **E.164 нормализация телефона** — +38067... vs 067... vs 38067 — все хранят как пришло | Никто полностью | Автоматическая нормализация при intake — снизит фрод, улучшит дедуп |
| **Объяснение отклонения лида** — аффилейт не знает почему лид ушёл в rejected | Только Leadgreed (Client History) | Подробный response с причиной + история в профиле лида |

---

### 2.2 Маршрутизация лидов

**Best-in-class**: Leadgreed — специфичность матчинга (GEO+aff+params), таймслоты с timezone, SLOTS vs CHANCE алгоритм, отдельный кап на каждую страну одним кликом.

**Критические гэпы рынка:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **Кап отдельно на каждую страну** внутри одной дистрибуции | Только Leadgreed | Аффилейты, льющие multi-GEO, это критически нужно |
| **Delayed Actions** — запланировать смену фанела/стран на завтра 19:05 | Только CRM Mate | Снимает боль "ночных изменений руками" |
| **CR Limits** — ограничить конверсию брокера по периоду (не дать ему "зашейвить") | Только Elnopy | Мощный инструмент защиты от шейва на уровне роутера |
| **Timezone-aware caps** — кап Австралии сбрасывается в полночь по Сиднею | Только Leadgreed | Стандарт для мультигео-операций |

---

### 2.3 Антифрод и защита от шейва

**Best-in-class по уровням:**
- HyperOne: 5-layer антифрод (profile rules + score + fingerprint + anomaly + device)
- Elnopy: Status Pipe Pending — уникальная защита от шейва через мониторинг истории статусов
- Leadgreed: IP autologin comparison — детектирование автоматизации по IP мисматчу

**Критические гэпы рынка:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **Fraud score с объяснением по полям** (почему этот лид получил score 75?) | HyperOne + GetLinked | Прозрачность = доверие клиента |
| **Status Pipe Pending** — автоматический флаг шейва, без ручного анализа | Только Elnopy | Включить в P0 anti-fraud — это боль №1 |
| **VOIP-блокировка** | HyperOne, Leadgreed, Elnopy | Стандарт. В P0 |
| **Публичная отчётность по антифроду** — клиент видит ЧТО заблочено и ПОЧЕМУ | Никто полностью | Дифференциатор "прозрачного антифрода" |

---

### 2.4 Автологин и надёжность доставки

**Текущий рынок:**
- CRM Mate: реальные Android-устройства (уникально, но дорого в масштабе)
- HyperOne: собственный ProRedirect proxy
- Leadgreed: failover — при отказе брокера 1 выдаёт autologin брокера 2

**Критические гэпы рынка:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **SLA на autologin** (99.5% uptime, иначе компенсация) | Никто | Первый с гарантированным SLA = дифференциатор |
| **Failover autologin** (если брокер 1 упал → брокер 2 автоматически) | Только Leadgreed | Стандарт надёжности, P1 |
| **Видимость pipeline стадий** (клик → загрузка → fingerprint → отправка) | HyperOne | Операционная прозрачность для поддержки |
| **Retry политика** с логированием причин | Никто явно | Операционный контроль |

---

### 2.5 Аналитика и отчётность

**Best-in-class**: Leadgreed — Client History (детали каждой попытки отправки: caps_full, blocked, duplicate), 20+ фильтров, сохраняемые пресеты, Share Filters.

**Критические гэпы рынка:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **Client History** — лог каждой попытки лида по каждому брокеру | Только Leadgreed | Критически важно для диагностики "куда ушёл лид" |
| **Q-Leads / Quality Score** — выделить "качественные лиды" из общего пула | Только trackbox.ai | Ключевая метрика для медиабайеров при оценке трафика |
| **Fake FTD управление** с опциями fire postback / charge client / schedule | Только Leadgreed | Редкая функция, нужна сетям для управления отношениями с аффилейтами |
| **Compare periods** в отчётах | Только Leadgreed | Стандарт BI — "этот месяц vs прошлый" |
| **Share filters** — поделиться настройкой отчёта с коллегой | Только Leadgreed | Операционное удобство команды |

---

### 2.6 Финансы и биллинг

**Серьёзный гэп всего рынка** — финансовый модуль слабый у всех, кроме GetLinked.

**Критические гэпы рынка:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **CRG / Special Deals** — автоматический расчёт CRG-сделок и автоинвойсинг | Только GetLinked | Сети с CRG-сделками делают это вручную. Огромная боль |
| **Back-to-back invoicing** — выставить счёт аффилейту зеркально от брокера | Только GetLinked | Автоматизирует недельную работу финансиста |
| **Виртуальный wallet** брокера с транзакционной историей | CRM Mate + GetLinked | Контроль exposure перед брокером |
| **Multi-currency** | Только GetLinked | USDT / EUR / USD микс стандартен для рынка |

---

### 2.7 Клоакинг и трекинг

**Серьёзный гэп**: только CRM Mate имеет built-in cloaking. Все остальные полагаются на Keitaro/HideClick как внешние инструменты.

**Наш шанс:**
| Гэп | Статус рынка | Наш шанс |
|-----|-------------|----------|
| **Built-in cloaking** (white/black page) | Только CRM Mate | Уникальный дифференциатор для медиабайеров. P1 |
| **Keitaro native integration** | Только CRM Mate | Снизить трение онбординга для текущих пользователей Keitaro |
| **Landing management** (GitLab-hosted) | Только CRM Mate | Нишевое, но ценное для anti-detect работы с Google |

---

### 2.8 Операционные инструменты

**Гэп системы управления командой:**
| Гэп | Кто делает | Наш шанс |
|-----|-----------|----------|
| **Task Manager / Kanban** внутри CRM | Только CRM Mate | Убирает Notion/Trello из операций медиабайинг-команды |
| **Built-in support tickets** | Только Elnopy | Снизить трение поддержки |
| **Per-column permissions** (показать аффилейту только выбранные колонки) | Elnopy + GetLinked | Сети, скрывающие брокеров от аффилейтов |
| **Security: login anomaly detection** | trackbox.ai + Elnopy sessions | Корпоративная безопасность |
| **Release Notes в продукте** | Только GetLinked | Повышает perceived quality и доверие |

---

### 2.9 White-label и мультитенантность

**Гэп**: ни один из конкурентов не делает это хорошо для среднего сегмента.

| Продукт | White-label | Multi-tenant | Цена |
|---------|------------|-------------|------|
| GetLinked | ✅ полный | ✅ | setup + sub |
| Elnopy | self-host (дорого) | ❌ | €999+1000 setup |
| Остальные | ❌ | ❌ | — |
| **Наш P3** | **✅** | **✅** | **—** |

---

## ЧАСТЬ 3. МАТРИЦА ЦЕНООБРАЗОВАНИЯ

| Продукт | Entry | Mid | Enterprise | Setup fee | Прозрачность |
|---------|-------|-----|-----------|-----------|-------------|
| **CRM Mate** | $200 | $700 | — | $0 | Частично |
| **Elnopy** | €499 | €999 | Custom | €500-1000 | ✅ сайт |
| **HyperOne** | $499 | $999 | $1,499 | $0 | ✅ сайт |
| **Leadgreed** | >$400 | н/д | н/д | н/д | ❌ |
| **GetLinked** | н/д (домены) | н/д | н/д | setup | ❌ |
| **trackbox.ai** | н/д | н/д | н/д | н/д | ❌ |
| **Наш таргет** | **$399** | **$699** | **$1,199** | **$0** | **✅ публично** |

**Ключевые наблюдения:**
1. **Вакуум $400–700**: между дешёвым/слабым CRM Mate ($700) и дорогим HyperOne ($999) — прямой таргет
2. **Setup fee как барьер**: Elnopy берёт €500-1000 onboarding fee. HyperOne и CRM Mate — $0. Наш $0 = GTM-преимущество
3. **Прозрачность**: только HyperOne и Elnopy публикуют цены. Остальные — "позвони". Первый с честным паблик-прайсом в нише выигрывает SEO

---

## ЧАСТЬ 4. ПОЗИЦИОНИРОВАНИЕ КОНКУРЕНТОВ

| Конкурент | Ниша | Сила | Слабость |
|-----------|------|------|---------|
| **CRM Mate** | Crypto/Forex buying+network | Android autologin, cloaking, Delayed Actions, Task Manager, flat price | Маленькая команда (7), нет роадмепа, слабый антифрод, нет CR Limits |
| **Elnopy** | Crypto/Forex network | Status Pipe (anti-shave), BI analytics, CR Limits, полная feature-матрица | Дорого (€999+setup), setup fee барьер, сложный онбординг |
| **HyperOne** | Crypto/Forex/Gambling/Nutra | 400+ интеграций, 5-layer антифрод, ProRedirect, 17 Telegram events | Слабая аналитика, нет финансов, нет cloaking, дорого ($999+) |
| **Leadgreed** | Crypto/Forex network | Best routing (специфичность, таймслоты, SLOTS/CHANCE), Fake FTD, Client History | Непрозрачное ценообразование, нет переотправки, нет UAD |
| **GetLinked** | Crypto/Forex/Gambling | White-label, финансы (CRG, back-to-back, invoice), bucket-ротация | Нет антифрода, нет autologin pipeline, цены скрыты, нужно 3 домена |
| **trackbox.ai** | Affiliate networks | Q-Leads quality score, security alerts, parameter replacement | Нет autologin, нет Telegram, нет финансов, нет аудио в демо |

---

## ЧАСТЬ 5. ТОП-15 ФУНКЦИЙ ДЛЯ ДИФФЕРЕНЦИАЦИИ

Ранжированы по: (уникальность на рынке) × (ценность для клиента)

| # | Функция | Кто делает сейчас | Сложность | Приоритет |
|---|---------|-----------------|-----------|----------|
| 1 | **SLA гарантия autologin** (99.5%) | Никто | Средняя | P1 |
| 2 | **Status Pipe Pending** (anti-shave прозрачный) | Только Elnopy | Средняя | P0 |
| 3 | **Client History** (лог каждой попытки лида) | Только Leadgreed | Средняя | P1 |
| 4 | **Fraud score с объяснением per-field** | HyperOne частично | Низкая | P1 |
| 5 | **Built-in cloaking** | Только CRM Mate | Высокая | P1 |
| 6 | **Delayed Actions** (запланировать изменения роутинга) | Только CRM Mate | Низкая | P1 |
| 7 | **Кап отдельно на каждую страну** | Только Leadgreed | Низкая | P0 |
| 8 | **CRG / Special Deals + автоинвойсинг** | Только GetLinked | Высокая | P2 |
| 9 | **Q-Leads / Quality Score** | Только trackbox.ai | Средняя | P1 |
| 10 | **Fake FTD с opциями** (postback, charge, schedule) | Только Leadgreed | Низкая | P2 |
| 11 | **Публичный прайс + $0 setup** | HyperOne + нас | Нулевая | GTM |
| 12 | **Failover autologin** (смена брокера при отказе) | Только Leadgreed | Средняя | P1 |
| 13 | **Task Manager / Kanban** внутри CRM | Только CRM Mate | Низкая | P2 |
| 14 | **Idempotency Key в API** | Никто | Нулевая | P0 |
| 15 | **CR Limits Calendar** | Только Elnopy | Средняя | P2 |

---

## ЧАСТЬ 6. ВЫВОДЫ И РЕКОМЕНДАЦИИ

### Что брать у каждого конкурента

| Конкурент | Что взять |
|-----------|----------|
| **Leadgreed** | Routing специфичность + SLOTS/CHANCE + таймслоты с TZ + Client History + Fake FTD + timezone caps + per-country cap |
| **Elnopy** | Status Pipe Pending + CR Limits Calendar + BI report builder + Offers / Schedule модуль + per-column permissions |
| **HyperOne** | 5-layer антифрод + fraud score per-field + 17 Telegram events + autologin pipeline visibility + integration templates объём |
| **CRM Mate** | Built-in cloaking + Delayed Actions + Task Manager + Android autologin концепт + flat pricing |
| **GetLinked** | CRG/Special Deals + back-to-back invoicing + bucket-ротация + White-label + Affiliate levels + Release Notes в продукте |
| **trackbox.ai** | Q-Leads quality score + security alerts + login anomaly detection + parameter replacement модуль |

### Где рынок слабый — наш "белый лист"
1. **Прозрачность антифрода** — никто не показывает клиенту ПОЧЕМУ лид заблочен
2. **SLA гарантии** — ни у кого нет contractual SLA на autologin / API uptime
3. **Developer experience** — idempotency, E.164, structured errors — никто не думал об этом
4. **Финансовая автоматизация** — только GetLinked (и то неполно), огромная боль сетей
5. **Onboarding < 30 минут** — все делают это долго; первый, кто сделает wizard с "first lead за 30 мин" — выиграет онбординг-метрику

---

*Файл сгенерирован на основе прямого анализа competitor_analysis.json всех 6 конкурентов*
*Версия 1.0 — Апрель 2026*
