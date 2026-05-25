# P1 Implementation Progress

Updated: 2026-05-25

## Scope

P1 focuses on making the P0 workflows readable and shippable in the product UI:

- Replace mojibake text in the homepage quick starts and tool discovery surfaces.
- Fix user-facing text in batch processing states.
- Fix names, descriptions, and key controls for P0/P1 image tools.
- Keep the existing processing behavior unchanged.

## Progress

- [x] Fixed shared UI copy in file upload, tool cards, category tabs, pinned tools, and recent tools.
- [x] Fixed homepage P0 quick-start copy.
- [x] Fixed batch preview, execution, review, and compare-slider copy.
- [x] Fixed `ToolPageShell` copy for upload state, batch state, login gate, and error states.
- [x] Fixed workflow template names, descriptions, and step labels.
- [x] Fixed tool manifests for image, AI, document, and utility tools.
- [x] Fixed primary P0/P1 tool UI copy:
  - Image compression
  - Image format conversion
  - Multi-platform export
  - Image resize
  - AI background removal

## Verification

- [x] `corepack pnpm --filter @atelier/web exec tsc --noEmit`
- [x] `corepack pnpm --filter @atelier/tool-image-platform-export build`
- [x] `corepack pnpm lint`
- [ ] `corepack pnpm build`

## Build Note

Full build still fails in `@atelier/web` during `next build` production bundling, after all package
TypeScript builds and Prisma generation complete. This matches the P0 build blocker already recorded
for the current Node/Next/webpack environment and should be rechecked under the supported Node.js
18/20 runtime.
