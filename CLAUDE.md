# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atelier is a media tools aggregation platform (媒体工具聚合平台) for e-commerce operators and content creators. It provides browser-based image processing, AI-powered tools, and workflow chaining through a plugin architecture. The UI is in Chinese.

## Commands

```bash
# Install dependencies
pnpm install

# Start dev server (runs on port 3200)
pnpm dev

# Build all packages
pnpm build

# Build only the web app (prisma generate + next build)
pnpm --filter @atelier/web build

# Lint all packages
pnpm lint

# Clean build artifacts
pnpm clean

# Prisma commands (run from packages/platform/web)
pnpm --filter @atelier/web exec prisma generate
pnpm --filter @atelier/web exec prisma db push
pnpm --filter @atelier/web exec prisma migrate dev
```

## Architecture

### Monorepo Structure

pnpm workspaces + Turborepo. All packages use the `@atelier/` scope.

- `packages/platform/web` — Next.js 14 App Router (main application)
- `packages/tools/*` — Plugin tool packages (each is an independent npm package)
- `packages/engines/*` — Shared processing engines (engine-image, engine-ai)
- `packages/shared/types` — Shared TypeScript types
- `packages/ui-kit` — Shared React UI components

### Plugin-Based Tool System

Tools are the core abstraction. Each tool lives in `packages/tools/<id>/` and must include:

1. `manifest.json` — Declares id, name, category, runtime (client/server/offline), input MIME types, output formats
2. `src/processor.ts` — Processing logic, exports `process()` function
3. `src/<Name>Tool.tsx` — React UI component receiving `ToolComponentProps` (files, onResult, apiKey?, callApi?)
4. `src/index.ts` — Unified export of `AtelierTool` object
5. `package.json` — Named `@atelier/<id>`, depends on @atelier/types, @atelier/ui-kit, and optionally an engine

Tools register at startup in `packages/platform/web/src/lib/register-tools.ts`. The registry (`tool-registry.ts`) supports lookup by id, category, and MIME type.

**Dual runtime**: Image tools (crop, compress, format) run client-side via Canvas API. AI and document tools (remove-bg, doc-format-brush) run server-side via tRPC mutations.

### API Layer (tRPC 11)

- Entry: `src/app/api/trpc/[trpc]/route.ts` using `fetchRequestHandler`
- tRPC init: `src/server/trpc.ts` (with SuperJSON transformer)
- Routers in `src/server/routers/`: `_app.ts` (root), `ai.ts`, `doc.ts`, `user.ts`
- Auth: `src/server/auth.ts` (JWT via jose, bcryptjs for passwords)
- DB: `src/server/db.ts` (Prisma client singleton)
- Input validation: Zod v4+ (use `z.email()` not `z.string().email()`)
- Errors: throw `TRPCError` with user-friendly Chinese messages

### Client-Side Architecture

- **State**: Zustand stores in `src/stores/` (app-store, key-store, pinned-store, toast-store, workflow-store)
- **Batch engine** (`src/lib/batch-engine.ts`): preview first N files -> confirm -> execute all -> review -> download
- **Workflow engine** (`src/lib/workflow-engine.ts`): chains tools sequentially, output of one step feeds the next
- **Persistence**: localStorage (auth tokens, API keys) and IndexedDB via idb-keyval (workflows), all keys prefixed `atelier:`
- **Auth context** (`src/lib/auth-context.tsx`): provides `useAuth()` hook with login/logout

### Database

Prisma ORM with PostgreSQL. Models: User, PinnedTool, RecentTool. Schema at `packages/platform/web/prisma/schema.prisma`.

## Conventions

- TypeScript strict mode throughout. `catch` blocks use `unknown`, not `any`.
- React: functional components + Hooks only
- Styling: Tailwind CSS only (no custom CSS except globals.css)
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- Never `git push` without user confirmation
- Error messages in user-facing code must be in Chinese
- Tool components: files should be immediately usable after upload; parameter changes update preview in real time; disabled buttons show reason text
- Tailwind config content paths already cover `packages/tools/` and `packages/engines/` — verify when adding new package directories
