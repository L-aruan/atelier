# P0 Implementation Progress

Updated: 2026-05-25

## Scope

P0 focuses on three concrete industry workflows:

- Ecommerce product image batch processing
- Multi-platform image size export
- Word report/document format normalization

## Progress

- [x] Added `@atelier/tool-image-platform-export`
  - Exports ecommerce and social presets into a ZIP package.
  - Supports fill/fit modes, JPEG/PNG/WebP, quality control, and platform folders.
- [x] Registered the new platform export tool in the web app.
- [x] Added a homepage `核心场景` quick-start section.
  - Ecommerce image workflow template
  - Multi-platform export tool
  - Word format brush tool
- [x] Updated workflow templates for P0 scenarios.
  - `电商商品图批处理`
  - `多平台尺寸批量导出`
- [x] Added workflow editor controls for platform export settings.
- [x] Allowed offline tools to run without login.
  - Online/server tools still require login.
- [x] Fixed existing `file-organizer` lint errors.

## Verification

- [x] `corepack pnpm install`
- [x] `corepack pnpm --filter @atelier/tool-image-platform-export build`
- [x] `corepack pnpm --filter @atelier/web exec tsc --noEmit`
- [x] `corepack pnpm lint`
- [ ] `corepack pnpm build`

## Build Blocker

Full build currently fails during `next build` with:

```text
TypeError: Cannot read properties of undefined (reading 'length')
at WasmHash._updateWithBuffer
Node.js v22.22.0
```

This occurs in Next.js 14 / webpack during production bundling on Node 22. Re-run with the project-supported Node.js 18/20 before treating it as an application regression.
