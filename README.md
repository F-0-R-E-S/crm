# CRM Boilerplate

Agent-friendly CRM skeleton: Next.js 15 (App Router) + tRPC v11 + Prisma + PostgreSQL + NextAuth v5 + Tailwind + Biome + Vitest.

## Quickstart

```bash
# 1. Install deps (corepack will install pnpm 9 on first run)
corepack enable
pnpm install

# 2. Env
cp .env.example .env
# generate AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste into .env as AUTH_SECRET

# 3. Database
pnpm db:up          # docker compose up postgres
pnpm db:push        # create schema
pnpm db:seed        # admin@example.com / password123

# 4. Dev server
pnpm dev
# open http://localhost:3000
```

## Stack rationale (agent-friendly)

- **TypeScript everywhere** — one language, one mental model
- **tRPC** — end-to-end types without a codegen step; agent sees client/server contract as a single object
- **Prisma** — schema is the source of truth for DB + TS types
- **Biome** — single binary for lint + format, fast feedback loop
- **NextAuth v5** — credentials provider wired to Prisma `User.passwordHash`

## Layout

```
src/
├── app/                       # Next.js routes
│   ├── (auth)/login/          # credentials login
│   ├── (dashboard)/           # authenticated pages
│   └── api/{trpc,auth}/       # API handlers
├── server/
│   ├── db.ts                  # singleton PrismaClient
│   ├── trpc.ts                # context + protectedProcedure
│   └── routers/               # contact, deal, activity
├── components/ui/             # minimal button/input/table/card
├── lib/                       # trpc client, utils
├── styles/globals.css
├── auth.ts                    # NextAuth config
└── middleware.ts              # route protection
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next dev server (Turbo) |
| `pnpm build` / `pnpm start` | Production build + run |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm format` | Biome |
| `pnpm test` | Vitest |
| `pnpm db:up` / `pnpm db:down` | Postgres via docker compose |
| `pnpm db:push` | Sync Prisma schema to DB (no migrations) |
| `pnpm db:migrate` | Create + apply a migration |
| `pnpm db:seed` | Seed admin user + demo data |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:reset` | Drop DB + re-seed |

## Next steps (not in this skeleton)

- Kanban board for deals (dnd-kit)
- CSV import/export
- Email sync (Gmail/IMAP)
- Multi-tenant / team scoping
- Full-text search (pg_trgm or Meilisearch)
- Rate limiting + audit log
- E2E tests with Playwright
