# P1 Implementation Progress

Updated: 2026-05-25

## Scope

P1 focuses on making the P0 workflows readable and shippable in the product UI:

- Replace mojibake text in the homepage quick starts and tool discovery surfaces.
- Fix user-facing text in batch processing states.
- Fix names, descriptions, and key controls for P0/P1 image tools.
- Keep the existing processing behavior unchanged.

## Progress

### P1 文案修复

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

### AI 文生图工具（ai-image-gen）

- [x] 扩展 `ToolManifest` 类型，新增 `aiProvider` 可选字段
- [x] 扩展 tRPC AI 路由，新增 `generateImage` mutation（调用 OpenAI gpt-image-1 API）
- [x] 泛化 `ToolPageShell`，支持按 manifest 声明的 `aiProvider` 动态查找 API key
- [x] 新建 `@atelier/tool-ai-image-gen` 工具包：
  - `manifest.json` — 声明 aiProvider: "openai"，customLayout: true
  - `src/processor.ts` — 调用 callApi 并将 base64 结果转为 Blob/ZIP
  - `src/AiImageGenTool.tsx` — 文生图 UI（prompt 输入、尺寸/质量/数量选择、结果展示）
  - `src/index.ts` — 统一导出
- [x] 注册工具到 `register-tools.ts`
- [x] 更新 `@atelier/web` 依赖
- [x] TypeScript 编译通过
- [x] ESLint 通过

## Verification

- [x] `corepack pnpm --filter @atelier/web exec tsc --noEmit`
- [x] `corepack pnpm --filter @atelier/tool-image-platform-export build`
- [x] `corepack pnpm --filter @atelier/tool-ai-image-gen build`
- [x] `corepack pnpm lint`
- [ ] `corepack pnpm build`

## Build Note

Full build still fails in `@atelier/web` during `next build` production bundling, after all package
TypeScript builds and Prisma generation complete. This matches the P0 build blocker already recorded
for the current Node/Next/webpack environment and should be rechecked under the supported Node.js
18/20 runtime.

### AI 文案生成工具（ai-copy-gen）

- [x] tRPC: 新增 `ai.generateCopy` mutation（调用 GPT-4o chat completions）
- [x] 新建 `@atelier/tool-ai-copy-gen` 工具包
- [x] 支持多平台风格（淘宝/抖音/小红书/拼多多/通用）和多种文案风格
- [x] 输出：标题 + 详情文案 + 关键词标签，支持一键复制

### AI 场景合成工具（ai-scene-compose）

- [x] 新建 `@atelier/tool-ai-scene-compose` 工具包
- [x] 两步合成：先调 removeBg API 抠图 → 再调 generateImage 生成背景 → Canvas 合成
- [x] 6 个预设场景模板（纯白/影棚/生活/户外/节日/奢华）+ 自定义描述

### 混合 Key 模式

- [x] `key-store.ts`: 新增 `getEffectiveKey(provider)` 函数，用户 key 优先 + 环境变量 fallback
- [x] `ToolPageShell.tsx`: 统一使用 `getEffectiveKey`
- [x] 泛化 callApi 分发：支持 removeBg / generateImage / generateCopy 三种 mutation

### 工作流模板

- [x] `tpl-ai-product-set`: AI 抠图 → 场景合成 → 多平台导出
- [x] `tpl-ai-copy-batch`: AI 批量文案生成
- [x] 首页 P0QuickStarts 新增 AI 商品图和文案入口

## Verification

- [x] `pnpm --filter @atelier/tool-ai-copy-gen build`
- [x] `pnpm --filter @atelier/tool-ai-scene-compose build`
- [x] `pnpm --filter @atelier/web exec tsc --noEmit`
- [x] `pnpm lint` (15/15 packages)
- [ ] `pnpm build` (Node 22 兼容性问题，与本次改动无关)

## 已知限制

1. `ToolPageShell` 中 `aiCallApi` 的类型分发基于 `tool.manifest.id` 硬编码判断，后续新增 AI 工具时需扩展
2. `gpt-image-1` API 返回 base64 数据，单张图片可能较大（>5MB），需注意浏览器内存
3. 多图输出时打包为 ZIP，用户需手动解压查看
4. AI 场景合成依赖浏览器端 Canvas，非浏览器环境（SSR）不可用
