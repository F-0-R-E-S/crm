# Working notes for Claude Code

## Stack
- Next.js 15 (App Router, Server Components by default, `"use client"` only when needed).
- tRPC v11 with `superjson` transformer. Client lives in `src/lib/trpc.ts`, router in `src/server/routers/_app.ts`.
- Prisma 5 (Postgres). Schema: `prisma/schema.prisma`. Always run `pnpm db:push` (or create a migration) after schema edits.
- NextAuth v5 (Auth.js) with Credentials provider. JWT sessions. Config: `src/auth.ts`.
- Biome for lint + format. Run `pnpm lint` before finishing.
- Vitest for unit tests (Node env). No jsdom wired yet.

## Conventions
- Import alias `@/*` → `src/*`.
- Server-only code lives under `src/server/`. Do not import `@/server/db` or `@/auth` from a `"use client"` file.
- Mutations must invalidate the relevant query via `trpc.useUtils().<router>.<proc>.invalidate()`.
- Use `protectedProcedure` for anything user-scoped; it exposes `ctx.userId`.
- Auth state on the server: `await auth()` inside RSC / route handlers / server actions.

## When adding a new entity
1. Add model to `prisma/schema.prisma` (+ indexes).
2. `pnpm db:push`.
3. Create `src/server/routers/<entity>.ts` with `list`/`byId`/`create`/`update`/`delete`.
4. Register it in `src/server/routers/_app.ts`.
5. Build `src/app/(dashboard)/<entity>/page.tsx` (client component using `trpc.<entity>.*`).
6. Add nav link in `src/app/(dashboard)/layout.tsx`.

## Before declaring a task done
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (if logic changed)
