# Repository Guidelines

## Project Structure & Module Organization

Atelier is a pnpm/Turborepo monorepo. The web platform lives in `packages/platform/web` and uses Next.js App Router, tRPC, Prisma, Zustand, and Tailwind CSS. Shared types are in `packages/shared/types`, reusable UI components are in `packages/ui-kit`, and browser image processing logic is in `packages/engines/engine-image`.

Tool plugins live under `packages/tools/*`, for example `image-crop`, `image-compress`, `ai-remove-bg`, `doc-format-brush`, and `file-organizer`. Each tool should keep its `manifest.json`, `src/index.ts`, `src/processor.ts`, and UI component together. Design notes, screenshots, and phase plans are under `docs/`.

## Build, Test, and Development Commands

Use pnpm 9 with Node.js 18 or newer.

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm clean
```

`pnpm dev` starts the Turborepo development pipeline; the web app runs on port `3200`. `pnpm build` builds all packages, including Prisma generation for `@atelier/web`. `pnpm lint` runs package lint scripts. `pnpm test` is wired through Turbo, but only works for packages that define a `test` script.

For database setup:

```bash
pnpm --filter @atelier/web exec prisma db push
```

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing 2-space indentation, semicolons, single quotes, trailing commas, and 100-column Prettier width from `.prettierrc`.

Name React components in `PascalCase` (`ToolPageShell.tsx`), hooks and helpers in `camelCase`, and tool packages with kebab-case directories (`packages/tools/image-watermark`). Tool manifests should use stable kebab-case IDs such as `image-crop`.

## Testing Guidelines

Prefer focused tests around processors, engines, workflow execution, and server routers. Browser-only logic should be isolated so it can be tested without a full Next.js runtime where possible.

Until a package has a test runner configured, at minimum run:

```bash
pnpm lint
pnpm build
```

When adding tests, use names that describe behavior, such as `processor.test.ts` or `workflow-engine.test.ts`, colocated near the module or in a package-level test directory.

## Commit & Pull Request Guidelines

The repository history uses Conventional Commits: `feat:`, `fix:`, `docs:`, and `chore:`. Keep commits scoped and imperative, for example `fix: handle oversized image uploads`.

Pull requests should include a short summary, affected packages, verification commands, and screenshots or screen recordings for UI changes. Link related issues or planning docs when applicable. Call out environment or migration changes, especially Prisma schema, `.env.example`, and tool manifest updates.

## Security & Configuration Tips

Do not commit real API keys or production secrets. Local development uses `packages/platform/web/.env`; keep `.env.example` safe and current. AI tools may call external APIs, so validate file size limits, avoid leaking provider error bodies, and keep user-supplied keys client-only unless the feature explicitly requires server-side use.
