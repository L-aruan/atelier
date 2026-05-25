# P2 AI 能力扩展计划

Updated: 2026-05-25

## Context

Atelier 已完成 AI 文生图工具（ai-image-gen），现需扩展更多 AI 能力，完善电商/自媒体运营工具链。采用混合模式：用户可自带 API Key，平台也可通过环境变量提供 fallback key。

## 目标

扩展 3 个新 AI 工具 + 2 个新工作流模板，覆盖电商运营核心场景。

## 实施内容

### 1. AI 文案生成工具（ai-copy-gen）— P1

接 OpenAI GPT-4o，一键生成多平台风格的电商文案。

- tRPC: `ai.generateCopy` mutation（messages → text）
- 输入：商品名称、核心卖点、目标平台（淘宝/抖音/小红书/拼多多）
- 输出：标题 + 详情文案 + 5 个关键词标签
- 批量支持：多个商品 → 多套文案

### 2. AI 场景合成工具（ai-scene-compose）— P1

抠图 + AI 生成背景，一键合成商品场景图。

- 复用 `ai.removeBg`（已有）+ `ai.generateImage`（已有）
- 两步合成：先抠图 → 再用 gpt-image-1 生成背景 → Canvas 合成
- 预设场景模板：纯白背景、生活场景、户外场景、节日主题

### 3. 混合 Key 模式基础设施 — P1

统一所有 AI 工具的 key 查找逻辑：用户 key 优先，平台 key fallback。

- `key-store.ts`: 新增 `getEffectiveKey(provider)` 函数
- `ToolPageShell.tsx`: 统一使用 `getEffectiveKey` 替代分散的 key 查找
- 环境变量映射：OPENAI_API_KEY → openai provider

### 4. 新工作流模板

- `tpl-ai-product-set`: 抠图 → 场景合成 → 多平台导出（AI 商品图一站式）
- `tpl-ai-copy-batch`: 批量文案生成（多商品一键出文案）

### 5. 首页快速入口更新

P0QuickStarts 新增 AI 商品图和批量文案入口。

## 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `packages/tools/ai-copy-gen/` | 文案生成工具包 |
| 新建 | `packages/tools/ai-scene-compose/` | 场景合成工具包 |
| 修改 | `packages/platform/web/src/server/routers/ai.ts` | 新增 generateCopy mutation |
| 修改 | `packages/platform/web/src/lib/key-store.ts` | 新增 getEffectiveKey |
| 修改 | `packages/platform/web/src/components/ToolPageShell.tsx` | 统一 key 查找 + callApi 分发 |
| 修改 | `packages/platform/web/src/lib/register-tools.ts` | 注册新工具 |
| 修改 | `packages/platform/web/src/lib/workflow-templates.ts` | 新增 2 个模板 |
| 修改 | `packages/platform/web/src/components/P0QuickStarts.tsx` | 新增 AI 入口 |
| 修改 | `packages/platform/web/package.json` | 新增依赖 |
| 修改 | `docs/plans/p1-progress.md` | 更新进度 |

## 验证

- [x] `pnpm --filter @atelier/tool-ai-copy-gen build`
- [x] `pnpm --filter @atelier/tool-ai-scene-compose build`
- [x] `pnpm --filter @atelier/web exec tsc --noEmit`
- [x] `pnpm lint` (15/15 packages)
