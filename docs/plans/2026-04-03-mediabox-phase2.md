# Atelier Phase 2 — 批量处理 + 更多图片工具 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加图片压缩和格式转换工具，实现完整的批量处理流程（预览确认 → 批量执行 → 结果审查 → 打包下载）。

**Architecture:** 在 Phase 1 的 Monorepo 基础上，新增 2 个工具包，重构 ToolPageShell 支持批量模式。批量处理引擎在浏览器端运行，通过 Zustand 管理进度状态，UI 分为预览确认、执行进度、结果审查三个阶段。

**Tech Stack:** 沿用 Phase 1（Next.js 14, React 18, Tailwind, Zustand, browser-image-compression, Canvas API）+ JSZip（批量打包下载）

**Spec:** `docs/specs/2026-04-03-mediabox-design.md` §5.4 批量处理流程, §7.1 MVP 包含

---

## 新增/修改文件结构

```
packages/
├── tools/
│   ├── image-compress/              # 新增：图片压缩工具
│   │   ├── package.json
│   │   ├── manifest.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ImageCompressTool.tsx
│   │       └── processor.ts
│   └── image-format/                # 新增：格式转换工具
│       ├── package.json
│       ├── manifest.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── ImageFormatTool.tsx
│           └── processor.ts
├── platform/
│   └── web/
│       └── src/
│           ├── components/
│           │   ├── ToolPageShell.tsx      # 重构：接入批量流程
│           │   ├── BatchPreview.tsx       # 新增：预览确认组件
│           │   ├── BatchProgress.tsx      # 新增：执行进度组件
│           │   ├── BatchReview.tsx        # 新增：结果审查组件
│           │   └── CompareSlider.tsx      # 新增：原图/结果对比滑块
│           ├── lib/
│           │   ├── batch-engine.ts        # 新增：批量处理引擎
│           │   ├── register-tools.ts      # 修改：注册新工具
│           │   └── download-utils.ts      # 新增：ZIP 打包下载
│           └── stores/
│               └── app-store.ts           # 修改：添加批量状态
```

---

## Task 1: image-compress 工具

**Files:**
- Create: `packages/tools/image-compress/package.json`
- Create: `packages/tools/image-compress/manifest.json`
- Create: `packages/tools/image-compress/tsconfig.json`
- Create: `packages/tools/image-compress/src/processor.ts`
- Create: `packages/tools/image-compress/src/ImageCompressTool.tsx`
- Create: `packages/tools/image-compress/src/index.ts`

- [ ] **Step 1: 创建 package.json + manifest.json + tsconfig.json**

`packages/tools/image-compress/package.json`:
```json
{
  "name": "@atelier/tool-image-compress",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "build": "tsc", "lint": "eslint src/", "clean": "rm -rf dist" },
  "dependencies": {
    "@atelier/types": "workspace:*",
    "@atelier/engine-image": "workspace:*",
    "@atelier/ui-kit": "workspace:*",
    "react": "^18.3.0"
  },
  "devDependencies": { "@types/react": "^18.3.0", "typescript": "^5.4.0" }
}
```

`packages/tools/image-compress/manifest.json`:
```json
{
  "id": "image-compress",
  "name": "图片压缩",
  "category": "image",
  "description": "智能压缩图片，保持画质的同时大幅减小文件体积",
  "icon": "🗜️",
  "version": "1.0.0",
  "runtime": { "client": true, "server": false, "offline": true, "downloadable": true },
  "input": { "accept": ["image/jpeg", "image/png", "image/webp"], "maxSize": "50MB", "batch": true },
  "output": { "formats": ["jpeg", "png", "webp"] },
  "engine": "@atelier/engine-image",
  "component": "./ImageCompressTool.tsx"
}
```

`packages/tools/image-compress/tsconfig.json`:
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "jsx": "react-jsx" },
  "include": ["src"]
}
```

- [ ] **Step 2: 实现 processor.ts**

```typescript
import { compressImage } from '@atelier/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface CompressToolOptions extends ToolOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

export async function processCompress(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as CompressToolOptions;
  const compressed = await compressImage(input.file, {
    maxSizeMB: opts.maxSizeMB ?? 1,
    maxWidthOrHeight: opts.maxWidthOrHeight ?? 1920,
    quality: opts.quality ?? 0.8,
  });

  const baseName = input.name.replace(/\.[^.]+$/, '');
  const ext = input.type.split('/')[1] || 'jpg';
  const name = `${baseName}_compressed.${ext}`;

  return {
    blob: compressed,
    name,
    type: compressed.type,
    size: compressed.size,
    url: URL.createObjectURL(compressed),
  };
}
```

- [ ] **Step 3: 实现 ImageCompressTool.tsx**

UI 包含：质量滑块（0.1-1.0）、最大尺寸输入（MB）、最大宽高输入（px）、压缩前后大小对比显示。

```tsx
import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { CompressToolOptions } from './processor';

export function ImageCompressTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [quality, setQuality] = useState(0.8);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [maxDimension, setMaxDimension] = useState(1920);

  const handleCompress = useCallback(async () => {
    const options: CompressToolOptions = { quality, maxSizeMB, maxWidthOrHeight: maxDimension };
    await onProcess(files, options);
  }, [files, onProcess, quality, maxSizeMB, maxDimension]);

  const totalInputSize = files.reduce((s, f) => s + f.size, 0);
  const totalOutputSize = outputs.reduce((s, f) => s + f.size, 0);
  const hasOutput = outputs.length > 0;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            质量 ({Math.round(quality * 100)}%)
          </label>
          <input
            type="range" min="0.1" max="1" step="0.05" value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最大体积 (MB)</label>
          <input
            type="number" min="0.1" max="50" step="0.1" value={maxSizeMB}
            onChange={(e) => setMaxSizeMB(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最大宽高 (px)</label>
          <input
            type="number" min="100" max="10000" step="100" value={maxDimension}
            onChange={(e) => setMaxDimension(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {hasOutput && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">压缩前: <strong>{formatSize(totalInputSize)}</strong></span>
            <span className="text-green-600">压缩后: <strong>{formatSize(totalOutputSize)}</strong></span>
            <span className="text-green-700 font-bold">
              节省 {Math.round((1 - totalOutputSize / totalInputSize) * 100)}%
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleCompress} disabled={processing || files.length === 0} className="flex-1">
          {processing ? '压缩中...' : `压缩 ${files.length} 张图片`}
        </Button>
        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)}>下载结果</Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 index.ts + 安装依赖**

```typescript
import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { ImageCompressTool } from './ImageCompressTool';
import { processCompress } from './processor';

export const imageCompressTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: ImageCompressTool,
  process: processCompress,
};
```

Run: `pnpm install`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add image-compress tool with quality/size controls"
```

---

## Task 2: image-format 工具

**Files:**
- Create: `packages/tools/image-format/package.json`
- Create: `packages/tools/image-format/manifest.json`
- Create: `packages/tools/image-format/tsconfig.json`
- Create: `packages/tools/image-format/src/processor.ts`
- Create: `packages/tools/image-format/src/ImageFormatTool.tsx`
- Create: `packages/tools/image-format/src/index.ts`

- [ ] **Step 1: 创建 package.json + manifest + tsconfig**

与 image-compress 结构相同，manifest.json:
```json
{
  "id": "image-format",
  "name": "格式转换",
  "category": "image",
  "description": "在 JPEG、PNG、WebP 格式之间自由转换",
  "icon": "🔄",
  "version": "1.0.0",
  "runtime": { "client": true, "server": false, "offline": true, "downloadable": true },
  "input": { "accept": ["image/jpeg", "image/png", "image/webp"], "maxSize": "50MB", "batch": true },
  "output": { "formats": ["jpeg", "png", "webp"] },
  "engine": "@atelier/engine-image",
  "component": "./ImageFormatTool.tsx"
}
```

- [ ] **Step 2: 实现 processor.ts**

```typescript
import { convertFormat, type ImageFormat } from '@atelier/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface FormatToolOptions extends ToolOptions {
  targetFormat: ImageFormat;
  quality?: number;
}

export async function processFormat(input: FileInput, options: ToolOptions): Promise<FileOutput> {
  const opts = options as FormatToolOptions;
  const blob = await convertFormat(input.file, {
    format: opts.targetFormat,
    quality: opts.quality ?? 0.92,
  });

  const ext = opts.targetFormat.split('/')[1];
  const baseName = input.name.replace(/\.[^.]+$/, '');
  const name = `${baseName}.${ext}`;

  return { blob, name, type: blob.type, size: blob.size, url: URL.createObjectURL(blob) };
}
```

- [ ] **Step 3: 实现 ImageFormatTool.tsx**

UI 包含：目标格式选择（JPEG/PNG/WebP 三个按钮）、质量滑块、转换前后格式对比。

```tsx
import { useState, useCallback } from 'react';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { ImageFormat } from '@atelier/engine-image';
import type { FormatToolOptions } from './processor';

const FORMATS: { label: string; value: ImageFormat }[] = [
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' },
];

export function ImageFormatTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/webp');
  const [quality, setQuality] = useState(0.92);
  const hasOutput = outputs.length > 0;

  const handleConvert = useCallback(async () => {
    const options: FormatToolOptions = { targetFormat, quality };
    await onProcess(files, options);
  }, [files, onProcess, targetFormat, quality]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">目标格式</label>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTargetFormat(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  targetFormat === f.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            质量 ({Math.round(quality * 100)}%)
          </label>
          <input
            type="range" min="0.1" max="1" step="0.05" value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-400 mt-1">PNG 格式忽略此参数</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleConvert} disabled={processing || files.length === 0} className="flex-1">
          {processing ? '转换中...' : `转换 ${files.length} 张图片为 ${targetFormat.split('/')[1].toUpperCase()}`}
        </Button>
        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)}>下载结果</Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 index.ts + 安装 + 注册到平台**

注册：修改 `packages/platform/web/src/lib/register-tools.ts`，导入并注册 `imageCompressTool` 和 `imageFormatTool`。
同时在 `packages/platform/web/package.json` 添加两个工具依赖，在 `next.config.mjs` 的 `transpilePackages` 中添加。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add image-format tool and register compress+format tools"
```

---

## Task 3: 批量处理引擎

**Files:**
- Create: `packages/platform/web/src/lib/batch-engine.ts`
- Modify: `packages/platform/web/src/stores/app-store.ts`

- [ ] **Step 1: 实现 batch-engine.ts**

批量处理引擎负责：并行处理文件、追踪进度、收集结果和错误。

```typescript
import type { FileInput, FileOutput, ToolOptions, AtelierTool } from '@atelier/types';

export interface BatchResult {
  input: FileInput;
  output: FileOutput | null;
  error: string | null;
  status: 'success' | 'failed';
}

export interface BatchState {
  phase: 'idle' | 'preview' | 'executing' | 'review';
  total: number;
  completed: number;
  failed: number;
  currentFile: string | null;
  previewResults: BatchResult[];
  allResults: BatchResult[];
}

export async function runPreview(
  tool: AtelierTool,
  files: FileInput[],
  options: ToolOptions,
  count = 3,
): Promise<BatchResult[]> {
  const previewFiles = files.slice(0, Math.min(count, files.length));
  const results: BatchResult[] = [];

  for (const file of previewFiles) {
    try {
      const output = await tool.process(file, options);
      results.push({ input: file, output, error: null, status: 'success' });
    } catch (e) {
      results.push({ input: file, output: null, error: String(e), status: 'failed' });
    }
  }

  return results;
}

export async function runBatch(
  tool: AtelierTool,
  files: FileInput[],
  options: ToolOptions,
  onProgress: (completed: number, total: number, currentFile: string) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(i, files.length, file.name);

    try {
      const output = await tool.process(file, options);
      results.push({ input: file, output, error: null, status: 'success' });
    } catch (e) {
      results.push({ input: file, output: null, error: String(e), status: 'failed' });
    }
  }

  onProgress(files.length, files.length, '');
  return results;
}

export async function retryFailed(
  tool: AtelierTool,
  failedResults: BatchResult[],
  options: ToolOptions,
  onProgress: (completed: number, total: number, currentFile: string) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (let i = 0; i < failedResults.length; i++) {
    const item = failedResults[i];
    onProgress(i, failedResults.length, item.input.name);

    try {
      const output = await tool.process(item.input, options);
      results.push({ input: item.input, output, error: null, status: 'success' });
    } catch (e) {
      results.push({ input: item.input, output: null, error: String(e), status: 'failed' });
    }
  }

  return results;
}
```

- [ ] **Step 2: 扩展 app-store.ts 添加批量状态**

在 Zustand store 中添加 `batchState` 和相关 actions。

```typescript
// 在现有 AppState 接口中添加:
batchPhase: 'idle' | 'preview' | 'executing' | 'review';
batchResults: BatchResult[];
batchPreviewResults: BatchResult[];
batchProgress: { completed: number; total: number; currentFile: string };
setBatchPhase: (phase: AppState['batchPhase']) => void;
setBatchResults: (results: BatchResult[]) => void;
setBatchPreviewResults: (results: BatchResult[]) => void;
setBatchProgress: (progress: AppState['batchProgress']) => void;
resetBatch: () => void;
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add batch processing engine with preview/execute/retry"
```

---

## Task 4: 批量预览确认组件

**Files:**
- Create: `packages/platform/web/src/components/BatchPreview.tsx`
- Create: `packages/platform/web/src/components/CompareSlider.tsx`

- [ ] **Step 1: 实现 CompareSlider.tsx — 原图/结果对比**

左右滑动对比原图和处理结果。

```tsx
import { useState, useRef, useCallback } from 'react';

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function CompareSlider({ beforeUrl, afterUrl, beforeLabel = '原图', afterLabel = '处理后' }: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-lg cursor-col-resize select-none"
      onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-contain bg-gray-100" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeUrl} alt={beforeLabel} className="w-full h-full object-contain bg-gray-100" style={{ width: `${containerRef.current?.offsetWidth || 0}px` }} />
      </div>
      <div className="absolute top-0 bottom-0" style={{ left: `${position}%` }}>
        <div className="w-0.5 h-full bg-white shadow-lg" />
      </div>
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{beforeLabel}</div>
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{afterLabel}</div>
    </div>
  );
}
```

- [ ] **Step 2: 实现 BatchPreview.tsx — 预览确认界面**

显示 2-3 张预览结果，用户确认后执行全部。

```tsx
import type { BatchResult } from '@/lib/batch-engine';
import { CompareSlider } from './CompareSlider';
import { Button } from '@atelier/ui-kit';

interface BatchPreviewProps {
  results: BatchResult[];
  totalFiles: number;
  onConfirm: () => void;
  onAdjust: () => void;
}

export function BatchPreview({ results, totalFiles, onConfirm, onAdjust }: BatchPreviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-amber-500">⚡</span>
        已用前 {results.length} 张图片试运行，请确认效果：
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((r) => (
          <div key={r.input.name} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            {r.status === 'success' && r.output ? (
              <>
                <CompareSlider beforeUrl={r.input.url} afterUrl={r.output.url} />
                <div className="p-3 text-xs text-gray-500 flex justify-between">
                  <span>{r.input.name}</span>
                  <span>{formatSize(r.input.size)} → {formatSize(r.output.size)}</span>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-red-500 text-sm">
                <div className="text-2xl mb-2">❌</div>
                <p>{r.input.name}</p>
                <p className="text-xs mt-1">{r.error}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={onConfirm}>
          ✓ 效果满意，处理全部 {totalFiles} 张
        </Button>
        <Button variant="secondary" onClick={onAdjust}>
          调整参数重试
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add BatchPreview and CompareSlider components"
```

---

## Task 5: 批量执行进度 + 结果审查

**Files:**
- Create: `packages/platform/web/src/components/BatchProgress.tsx`
- Create: `packages/platform/web/src/components/BatchReview.tsx`
- Create: `packages/platform/web/src/lib/download-utils.ts`

- [ ] **Step 1: 实现 BatchProgress.tsx — 执行进度条**

```tsx
interface BatchProgressProps {
  completed: number;
  total: number;
  failed: number;
  currentFile: string;
}

export function BatchProgress({ completed, total, failed, currentFile }: BatchProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">处理进度</span>
        <span className="font-bold text-green-600">{completed}/{total}</span>
      </div>
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {currentFile && (
        <p className="text-xs text-gray-500 truncate">正在处理: {currentFile}</p>
      )}
      {failed > 0 && (
        <p className="text-xs text-red-500">{failed} 个文件处理失败</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 实现 download-utils.ts — ZIP 打包下载**

```typescript
import JSZip from 'jszip';
import type { FileOutput } from '@atelier/types';

export async function downloadSingle(output: FileOutput) {
  const a = document.createElement('a');
  a.href = output.url;
  a.download = output.name;
  a.click();
}

export async function downloadAsZip(outputs: FileOutput[], zipName = 'atelier-output.zip') {
  const zip = new JSZip();
  for (const output of outputs) {
    zip.file(output.name, output.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
```

添加 `jszip` 到 `packages/platform/web/package.json` dependencies。

- [ ] **Step 3: 实现 BatchReview.tsx — 结果审查视图**

缩略图网格，标记成功/失败项，支持重试失败项，支持一键打包下载。

```tsx
import { useState } from 'react';
import type { BatchResult } from '@/lib/batch-engine';
import { CompareSlider } from './CompareSlider';
import { Button } from '@atelier/ui-kit';
import { downloadAsZip, downloadSingle } from '@/lib/download-utils';

interface BatchReviewProps {
  results: BatchResult[];
  onRetryFailed: () => void;
  retrying: boolean;
}

export function BatchReview({ results, onRetryFailed, retrying }: BatchReviewProps) {
  const [filterFailed, setFilterFailed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const successResults = results.filter((r) => r.status === 'success');
  const failedResults = results.filter((r) => r.status === 'failed');
  const displayed = filterFailed ? failedResults : results;

  const handleDownloadAll = async () => {
    const outputs = successResults.map((r) => r.output!);
    if (outputs.length === 1) {
      downloadSingle(outputs[0]);
    } else {
      await downloadAsZip(outputs);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">
          <span className="text-green-600 font-bold">✓ {successResults.length}</span> 成功
          {failedResults.length > 0 && (
            <> · <span className="text-red-500 font-bold">✗ {failedResults.length}</span> 需检查</>
          )}
        </span>
        {failedResults.length > 0 && (
          <button
            onClick={() => setFilterFailed(!filterFailed)}
            className="text-sm text-blue-600 hover:underline"
          >
            {filterFailed ? '显示全部' : '仅显示问题项'}
          </button>
        )}
      </div>

      {selectedIndex !== null && results[selectedIndex]?.output ? (
        <div className="space-y-2">
          <button onClick={() => setSelectedIndex(null)} className="text-sm text-gray-500 hover:text-gray-700">
            ← 返回列表
          </button>
          <CompareSlider
            beforeUrl={results[selectedIndex].input.url}
            afterUrl={results[selectedIndex].output!.url}
          />
          <p className="text-xs text-gray-500 text-center">{results[selectedIndex].input.name}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {displayed.map((r, i) => {
            const globalIndex = filterFailed ? results.indexOf(r) : i;
            return (
              <button
                key={r.input.name}
                onClick={() => r.output && setSelectedIndex(globalIndex)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                  r.status === 'success' ? 'border-green-400 hover:border-green-600' : 'border-red-400'
                }`}
              >
                {r.output ? (
                  <img src={r.output.url} alt={r.input.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500 text-xs">✗</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {failedResults.length > 0 && (
          <Button variant="secondary" onClick={onRetryFailed} disabled={retrying}>
            {retrying ? '重试中...' : `重新处理 ${failedResults.length} 张问题图`}
          </Button>
        )}
        <Button onClick={handleDownloadAll} disabled={successResults.length === 0}>
          {successResults.length === 1 ? '下载结果' : `全部下载 (ZIP)`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add BatchProgress, BatchReview, download-utils with ZIP support"
```

---

## Task 6: 重构 ToolPageShell 接入批量流程

**Files:**
- Modify: `packages/platform/web/src/components/ToolPageShell.tsx`

- [ ] **Step 1: 重构 ToolPageShell 支持批量四阶段**

重写 ToolPageShell，根据 batchPhase 显示不同的视图：
- `idle`：显示工具 UI（当前行为）
- `preview`：显示 BatchPreview
- `executing`：显示 BatchProgress
- `review`：显示 BatchReview

当文件数量 > 1 时（批量模式），工具 UI 的"处理"按钮触发预览阶段而非直接执行。
当文件数量 = 1 时，保持原有的直接处理行为。

关键逻辑：
1. 用户点击工具的处理按钮 → 如果 files > 1，先跑 `runPreview` → 进入 preview 阶段
2. 用户确认预览 → 跑 `runBatch` → 进入 executing 阶段 → 完成后进入 review 阶段
3. review 阶段可重试失败项 → 用 `retryFailed` → 更新结果

- [ ] **Step 2: 验证完整流程**

启动 dev server，测试：
1. 单文件：上传 1 张图 → 裁剪/压缩/转换 → 下载（原有流程不变）
2. 多文件：上传 5+ 张图 → 设参数 → 预览 2-3 张 → 确认 → 批量执行（进度条）→ 审查结果 → 下载 ZIP

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: integrate batch processing flow into ToolPageShell"
```

---

## Task 7: 集成测试 + 打磨

- [ ] **Step 1: 验证所有工具正常工作**

在 dev server 上逐一测试：
1. 图片裁剪：单张 + 批量
2. 图片压缩：单张 + 批量，调整质量参数
3. 格式转换：JPEG→WebP, PNG→JPEG 等
4. 批量预览→确认→执行→审查→下载 ZIP

- [ ] **Step 2: 验证生产构建**

Run: `pnpm --filter @atelier/web build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: Phase 2 integration polish"
```

---

## Phase 2 完成标准

- 3 个图片工具可用（裁剪、压缩、格式转换）
- 单文件处理流程正常
- 批量处理全流程：预览确认 → 执行进度 → 结果审查 → 重试失败 → ZIP 打包下载
- 原图/结果对比滑块可用
- 生产构建通过
