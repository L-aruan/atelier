# Atelier Phase 3 — AI 抠图 + Key 管理 实施计划

**Goal:** 第一个 AI 工具上线（AI 抠图），本地 Key 管理可用，tRPC 基础设施搭建完成。

**Architecture:**
- tRPC 作为 Next.js API Routes 的类型安全层
- AI 网关：轻量版路由层，支持用户自带 key 和平台 key
- AI 批量执行：前端同步代理模式（浏览器 → Next.js API Route → 第三方 API），不引入 BullMQ
- Key 管理：纯 localStorage，Phase 5 迁移到用户账号

**Tech Stack (新增):**
- `@trpc/server` + `@trpc/client` + `@trpc/react-query` + `@trpc/next`
- `@tanstack/react-query` (tRPC 依赖)
- `zod` (输入校验)

**Spec:** `docs/specs/2026-04-03-mediabox-design.md` §8 Phase 3

---

## 新增/修改文件结构

```
packages/
├── shared/
│   └── types/
│       └── src/
│           └── ai.ts                    # 新增：AI 相关类型定义
├── engines/
│   └── engine-ai/                       # 新增：AI 引擎客户端
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── remove-bg.ts             # remove.bg API 封装
│           └── types.ts
├── tools/
│   └── ai-remove-bg/                    # 新增：AI 抠图工具
│       ├── package.json
│       ├── manifest.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── AiRemoveBgTool.tsx
│           └── processor.ts
├── platform/
│   └── web/
│       └── src/
│           ├── server/
│           │   ├── trpc.ts              # 新增：tRPC 初始化
│           │   └── routers/
│           │       ├── _app.ts          # 新增：根路由
│           │       └── ai.ts            # 新增：AI 路由（抠图代理）
│           ├── app/
│           │   ├── api/trpc/[trpc]/route.ts  # 新增：tRPC HTTP handler
│           │   └── settings/
│           │       └── keys/
│           │           └── page.tsx      # 新增：Key 管理页面
│           ├── components/
│           │   ├── Navbar.tsx            # 修改：添加设置入口
│           │   └── KeyManager.tsx        # 新增：Key 管理组件
│           ├── lib/
│           │   ├── trpc-client.ts        # 新增：tRPC 客户端
│           │   ├── key-store.ts          # 新增：localStorage Key 管理
│           │   └── register-tools.ts     # 修改：注册 AI 工具
│           └── stores/
│               └── app-store.ts          # 可能修改
```

---

## Task 1: tRPC 基础设施

**Files:**
- Create: `packages/platform/web/src/server/trpc.ts`
- Create: `packages/platform/web/src/server/routers/_app.ts`
- Create: `packages/platform/web/src/app/api/trpc/[trpc]/route.ts`
- Create: `packages/platform/web/src/lib/trpc-client.ts`
- Modify: `packages/platform/web/package.json` (添加 tRPC + zod + react-query 依赖)
- Modify: `packages/platform/web/src/app/layout.tsx` (包裹 TRPCProvider)

- [ ] **Step 1: 安装依赖**

```bash
pnpm --filter @atelier/web add @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query zod superjson
```

- [ ] **Step 2: 创建 server/trpc.ts — tRPC 初始化**

```typescript
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;
```

- [ ] **Step 3: 创建 server/routers/_app.ts — 根路由**

```typescript
import { router } from '../trpc';
import { aiRouter } from './ai';

export const appRouter = router({
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
```

先创建一个空的 ai router placeholder（Task 2 完善）。

- [ ] **Step 4: 创建 api/trpc/[trpc]/route.ts — HTTP handler**

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };
```

- [ ] **Step 5: 创建 lib/trpc-client.ts — 客户端 + Provider**

```typescript
'use client';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({ url: '/api/trpc', transformer: superjson }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 6: 修改 layout.tsx 包裹 TRPCProvider**

在 body 内添加 `<Providers>` 包裹组件（需要 'use client' 的 Providers wrapper）。

- [ ] **Step 7: Commit**

```
feat: add tRPC infrastructure with server/client setup
```

---

## Task 2: AI 网关 + Key 管理 API

**Files:**
- Create: `packages/platform/web/src/lib/key-store.ts`
- Modify: `packages/platform/web/src/server/routers/ai.ts`

- [ ] **Step 1: 实现 key-store.ts — localStorage Key 管理**

```typescript
const STORAGE_KEY = 'atelier:api-keys';

export interface ApiKeyEntry {
  id: string;
  provider: string;    // 'remove-bg' | 'openai' | 'stability' ...
  key: string;
  label: string;
  createdAt: number;
}

export function getApiKeys(): ApiKeyEntry[] { ... }
export function addApiKey(entry: Omit<ApiKeyEntry, 'id' | 'createdAt'>): ApiKeyEntry { ... }
export function removeApiKey(id: string): void { ... }
export function getKeyForProvider(provider: string): string | null { ... }
```

- [ ] **Step 2: 实现 AI 路由 — server/routers/ai.ts**

```typescript
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const aiRouter = router({
  removeBg: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const key = input.apiKey || process.env.REMOVE_BG_API_KEY || '';
      // 调用 remove.bg API
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: input.imageBase64,
          size: 'auto',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`remove.bg API error: ${response.status} ${errorBody}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return { resultBase64: base64, type: 'image/png' };
    }),
});
```

- [ ] **Step 3: Commit**

```
feat: add AI gateway with remove.bg proxy and localStorage key store
```

---

## Task 3: engine-ai 客户端封装

**Files:**
- Create: `packages/engines/engine-ai/package.json`
- Create: `packages/engines/engine-ai/tsconfig.json`
- Create: `packages/engines/engine-ai/src/types.ts`
- Create: `packages/engines/engine-ai/src/remove-bg.ts`
- Create: `packages/engines/engine-ai/src/index.ts`

- [ ] **Step 1: 创建 package.json + tsconfig**

```json
{
  "name": "@atelier/engine-ai",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": { "@atelier/types": "workspace:*" },
  "devDependencies": { "typescript": "^5.4.0" }
}
```

- [ ] **Step 2: 实现 types.ts + remove-bg.ts**

`remove-bg.ts` 封装调用 tRPC 的 `ai.removeBg` mutation。但由于 engine 包不应直接依赖 tRPC 客户端，所以 engine-ai 提供一个 `createRemoveBgProcessor` 工厂，接收一个 `callApi` 函数作为参数。

```typescript
export interface RemoveBgOptions {
  apiKey?: string;
}

export type RemoveBgCallFn = (imageBase64: string, apiKey?: string) => Promise<{ resultBase64: string; type: string }>;

export function createRemoveBgProcessor(callApi: RemoveBgCallFn) {
  return async function removeBg(file: File, options?: RemoveBgOptions): Promise<Blob> {
    const base64 = await fileToBase64(file);
    const result = await callApi(base64, options?.apiKey);
    const binary = atob(result.resultBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: result.type });
  };
}
```

- [ ] **Step 3: Commit**

```
feat: add engine-ai package with remove-bg processor factory
```

---

## Task 4: ai-remove-bg 工具

**Files:**
- Create: `packages/tools/ai-remove-bg/package.json`
- Create: `packages/tools/ai-remove-bg/manifest.json`
- Create: `packages/tools/ai-remove-bg/tsconfig.json`
- Create: `packages/tools/ai-remove-bg/src/processor.ts`
- Create: `packages/tools/ai-remove-bg/src/AiRemoveBgTool.tsx`
- Create: `packages/tools/ai-remove-bg/src/index.ts`
- Modify: `packages/platform/web/src/lib/register-tools.ts`
- Modify: `packages/platform/web/next.config.mjs`
- Modify: `packages/platform/web/package.json`

- [ ] **Step 1: 创建包结构**

manifest.json:
```json
{
  "id": "ai-remove-bg",
  "name": "AI 抠图",
  "category": "ai",
  "description": "AI 智能去除图片背景，一键生成透明 PNG",
  "icon": "🪄",
  "version": "1.0.0",
  "runtime": { "client": false, "server": true, "offline": false, "downloadable": false },
  "input": { "accept": ["image/jpeg", "image/png", "image/webp"], "maxSize": "25MB", "batch": true },
  "output": { "formats": ["png"] },
  "engine": "@atelier/engine-ai",
  "component": "./AiRemoveBgTool.tsx"
}
```

- [ ] **Step 2: 实现 processor.ts**

```typescript
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface RemoveBgToolOptions extends ToolOptions {
  apiKey?: string;
  callApi: (imageBase64: string, apiKey?: string) => Promise<{ resultBase64: string; type: string }>;
}

export async function processRemoveBg(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as RemoveBgToolOptions;
  // 转 base64
  const arrayBuffer = await input.file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const result = await opts.callApi(base64, opts.apiKey);

  // base64 → Blob
  const binary = atob(result.resultBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: result.type });

  const baseName = input.name.replace(/\.[^.]+$/, '');
  return {
    blob,
    name: `${baseName}_nobg.png`,
    type: 'image/png',
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
```

- [ ] **Step 3: 实现 AiRemoveBgTool.tsx**

UI 特殊点：
- 需要从 localStorage 读取用户的 remove-bg key
- 如果没有 key，显示提示引导用户去设置页添加
- 有 key 后可处理
- 处理结果用透明棋盘格背景展示

```tsx
import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import { getKeyForProvider } from '@/lib/key-store';
import { trpc } from '@/lib/trpc-client';
import type { RemoveBgToolOptions } from './processor';
import Link from 'next/link';

export function AiRemoveBgTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [useOwnKey, setUseOwnKey] = useState(true);
  const removeBgMutation = trpc.ai.removeBg.useMutation();

  const userKey = getKeyForProvider('remove-bg');
  const hasKey = !!userKey;
  const hasOutput = outputs.length > 0;

  const callApi = useCallback(
    async (imageBase64: string, apiKey?: string) => {
      return removeBgMutation.mutateAsync({ imageBase64, apiKey });
    },
    [removeBgMutation],
  );

  const handleRemoveBg = useCallback(async () => {
    const key = useOwnKey ? userKey || undefined : undefined;
    const options: RemoveBgToolOptions = { apiKey: key, callApi };
    await onProcess(files, options);
  }, [files, onProcess, useOwnKey, userKey, callApi]);

  return (
    <div className="space-y-6">
      {/* Key 设置提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-800">
              {hasKey ? (
                <>✓ 已配置 remove.bg API Key</>
              ) : (
                <>需要 remove.bg API Key 才能使用</>
              )}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              {hasKey ? '使用你的 Key 可获得更好的配额' : '免费 Key 每月可处理 50 张图'}
            </p>
          </div>
          <Link
            href="/settings/keys"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {hasKey ? '管理 Key' : '去添加 →'}
          </Link>
        </div>
      </div>

      {/* Key 选择 */}
      {hasKey && (
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={useOwnKey} onChange={() => setUseOwnKey(true)} />
            <span>使用我的 Key</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!useOwnKey} onChange={() => setUseOwnKey(false)} />
            <span>使用平台 Key（较慢）</span>
          </label>
        </div>
      )}

      {/* 预览 */}
      {hasOutput && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {outputs.map((output, i) => (
            <div key={output.name} className="relative rounded-lg overflow-hidden border border-gray-200">
              <div
                className="aspect-square"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                <img src={output.url} alt={output.name} className="w-full h-full object-contain" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1.5 truncate">
                {files[i]?.name || output.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleRemoveBg} disabled={processing || files.length === 0} className="flex-1">
          {processing ? '处理中...' : `AI 抠图 ${files.length} 张图片`}
        </Button>
        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)}>下载结果</Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 注册到平台（register-tools + next.config + package.json）**

- [ ] **Step 5: Commit**

```
feat: add ai-remove-bg tool with tRPC proxy and key selection
```

---

## Task 5: Key 管理页面

**Files:**
- Create: `packages/platform/web/src/components/KeyManager.tsx`
- Create: `packages/platform/web/src/app/settings/keys/page.tsx`
- Modify: `packages/platform/web/src/components/Navbar.tsx` (添加设置入口)

- [ ] **Step 1: 实现 KeyManager.tsx**

功能：
- 显示已添加的 Key 列表（provider + 脱敏显示 key + 添加时间）
- 添加新 Key：选择 provider，输入 key，保存到 localStorage
- 删除 Key
- 支持的 providers: remove-bg, openai, stability-ai

- [ ] **Step 2: 创建 settings/keys/page.tsx**

使用 KeyManager 组件的页面。

- [ ] **Step 3: 修改 Navbar — 添加设置入口**

在导航栏右侧添加齿轮图标链接到 `/settings/keys`。

- [ ] **Step 4: Commit**

```
feat: add API key management page with localStorage persistence
```

---

## Task 6: 集成测试 + 构建验证

- [ ] **Step 1: pnpm install + build 验证**
- [ ] **Step 2: Commit**

```
chore: Phase 3 integration polish
```

---

## Phase 3 完成标准

- tRPC 基础设施可用（server + client + provider）
- AI 抠图工具可用（通过 tRPC 代理调用 remove.bg）
- Key 管理页面可用（localStorage CRUD）
- 支持用户自带 key 和平台 key 切换
- 批量 AI 抠图与 Phase 2 批量流程集成
- 生产构建通过
