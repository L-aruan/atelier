# Atelier Phase 1 — 基础架构搭建 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Monorepo 骨架 + 平台壳 + 图片引擎 + 首个工具（图片裁剪），实现完整的「拖入图片 → 裁剪 → 下载」流程。

**Architecture:** pnpm Monorepo + Turborepo 管理多包构建。Next.js 14 App Router 作为平台壳，图片处理通过浏览器端 WASM（browser-image-compression + Canvas API）实现。工具通过 Tool Manifest 声明能力，平台通过注册中心动态加载。

**Tech Stack:** pnpm, Turborepo 1.x, Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, Vitest, Canvas API, browser-image-compression

> **引擎选型说明**：设计文档提到 Squoosh WASM，Phase 1 实际使用 Canvas API + browser-image-compression 实现裁剪/压缩/格式转换，效果一致且集成更轻量。如后续需要更高级的图片处理能力（如 AVIF 编码），可在 Phase 2 引入 Squoosh WASM 替换。

**Spec:** `docs/specs/2026-04-03-mediabox-design.md`

---

## File Structure

```
atelier/
├── package.json                          # Root workspace config
├── pnpm-workspace.yaml                   # pnpm workspace packages 声明
├── turbo.json                            # Turborepo pipeline 配置
├── tsconfig.base.json                    # 共享 TypeScript 基础配置
├── .eslintrc.js                          # ESLint 配置
├── .prettierrc                           # Prettier 配置
├── .gitignore
│
├── packages/
│   ├── shared/
│   │   └── types/                        # 共享类型定义包
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       └── src/
│   │           ├── index.ts              # Re-exports
│   │           ├── manifest.ts           # ToolManifest 类型
│   │           ├── file.ts               # FileInput / FileOutput 类型
│   │           └── tool.ts               # AtelierTool 接口、ToolProps
│   │
│   ├── ui-kit/                           # 通用 UI 组件库
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── Button.tsx
│   │       ├── FileDropZone.tsx
│   │       ├── ToolCard.tsx
│   │       └── styles.ts                 # Tailwind class helpers
│   │
│   ├── engines/
│   │   └── engine-image/                 # 浏览器端图片处理引擎
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       └── src/
│   │           ├── index.ts
│   │           ├── crop.ts              # 裁剪：Canvas API
│   │           ├── compress.ts          # 压缩：browser-image-compression
│   │           ├── format.ts            # 格式转换：Canvas toBlob
│   │           └── utils.ts             # loadImage, blobToFile helpers
│   │
│   ├── tools/
│   │   └── image-crop/                   # 图片裁剪工具
│   │       ├── package.json
│   │       ├── manifest.json
│   │       ├── tsconfig.json
│   │       └── src/
│   │           ├── index.ts              # 导出 AtelierTool
│   │           ├── ImageCropTool.tsx      # 裁剪 UI 组件（react-image-crop）
│   │           └── processor.ts          # 调用 engine-image/crop
│   │
│   └── platform/
│       └── web/                          # Next.js 平台壳
│           ├── package.json
│           ├── tsconfig.json
│           ├── next.config.mjs
│           ├── tailwind.config.ts
│           ├── postcss.config.mjs
│           └── src/
│               ├── app/
│               │   ├── layout.tsx        # 根布局 + 全局样式
│               │   ├── page.tsx          # 首页
│               │   ├── globals.css       # Tailwind imports
│               │   └── tool/
│               │       └── [id]/
│               │           └── page.tsx  # 工具详情页（动态路由）
│               ├── components/
│               │   ├── Navbar.tsx        # 顶部导航
│               │   ├── FileDropHero.tsx  # 首页拖放区
│               │   ├── ToolGrid.tsx      # 工具卡片网格
│               │   ├── CategoryTabs.tsx  # 分类标签
│               │   ├── SearchBar.tsx     # 搜索框
│               │   └── ToolPageShell.tsx # 工具页布局壳
│               ├── lib/
│               │   ├── tool-registry.ts  # 工具注册中心
│               │   └── file-utils.ts     # 文件类型识别、格式化工具
│               └── stores/
│                   └── app-store.ts      # Zustand 全局状态
```

---

## Task 1: 初始化 Monorepo 基础设施

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.js`
- Create: `.prettierrc`
- Create: `.gitignore`

- [ ] **Step 1: 初始化根 package.json**

```json
{
  "name": "atelier",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^1.13.0",
    "typescript": "^5.4.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.2.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "packages/shared/*"
  - "packages/engines/*"
  - "packages/tools/*"
  - "packages/platform/*"
  - "packages/ui-kit"
```

- [ ] **Step 3: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: 创建 .eslintrc.js、.prettierrc、.gitignore**

`.eslintrc.js`:
```js
module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["dist/", ".next/", "node_modules/"],
};
```

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.gitignore`:
```
node_modules/
dist/
.next/
.turbo/
*.tsbuildinfo
.env*.local
.superpowers/
```

- [ ] **Step 6: 安装依赖并验证**

Run: `pnpm install`
Expected: 依赖安装成功，无报错

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: initialize monorepo with pnpm + turborepo"
```

---

## Task 2: 创建 shared/types 包

**Files:**
- Create: `packages/shared/types/package.json`
- Create: `packages/shared/types/tsconfig.json`
- Create: `packages/shared/types/src/manifest.ts`
- Create: `packages/shared/types/src/file.ts`
- Create: `packages/shared/types/src/tool.ts`
- Create: `packages/shared/types/src/index.ts`

- [ ] **Step 1: 创建 package.json 和 tsconfig.json**

`packages/shared/types/package.json`:
```json
{
  "name": "@atelier/types",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

`packages/shared/types/tsconfig.json`:
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 定义 ToolManifest 类型**

`packages/shared/types/src/manifest.ts`:
```typescript
export type ToolCategory = 'image' | 'video' | 'design' | 'audio' | 'document' | 'ai';

export interface ToolRuntime {
  client: boolean;
  server: boolean;
  offline: boolean;
  downloadable: boolean;
}

export interface ToolInput {
  accept: string[];
  maxSize: string;
  batch: boolean;
}

export interface ToolOutput {
  formats: string[];
}

export interface ToolManifest {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  icon: string;
  version: string;
  runtime: ToolRuntime;
  input: ToolInput;
  output: ToolOutput;
  engine: string;
  component: string;
}
```

- [ ] **Step 3: 定义文件类型**

`packages/shared/types/src/file.ts`:
```typescript
export interface FileInput {
  file: File;
  name: string;
  type: string;
  size: number;
  url: string; // Object URL for preview
}

export interface FileOutput {
  blob: Blob;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
}
```

- [ ] **Step 4: 定义工具接口**

`packages/shared/types/src/tool.ts`:
```typescript
import type { ComponentType } from 'react';
import type { ToolManifest } from './manifest';
import type { FileInput, FileOutput } from './file';

export interface ToolOptions {
  [key: string]: unknown;
}

export interface ToolProps {
  files: FileInput[];
  onProcess: (files: FileInput[], options: ToolOptions) => Promise<FileOutput[]>;
  onDownload: (outputs: FileOutput[]) => void;
  processing: boolean;
  outputs: FileOutput[];
}

export interface AtelierTool {
  manifest: ToolManifest;
  Component: ComponentType<ToolProps>;
  process: (input: FileInput, options: ToolOptions) => Promise<FileOutput>;
}
```

- [ ] **Step 5: 创建 index.ts 并导出所有类型**

`packages/shared/types/src/index.ts`:
```typescript
export * from './manifest';
export * from './file';
export * from './tool';
```

- [ ] **Step 6: 验证类型编译**

Run: `cd packages/shared/types && pnpm build`
Expected: 编译成功，生成 dist 目录

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shared types package with ToolManifest, FileInput/Output, AtelierTool"
```

---

## Task 3: 创建 UI Kit 包

**Files:**
- Create: `packages/ui-kit/package.json`
- Create: `packages/ui-kit/tsconfig.json`
- Create: `packages/ui-kit/src/Button.tsx`
- Create: `packages/ui-kit/src/FileDropZone.tsx`
- Create: `packages/ui-kit/src/ToolCard.tsx`
- Create: `packages/ui-kit/src/styles.ts`
- Create: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: 创建 package.json 和 tsconfig**

`packages/ui-kit/package.json`:
```json
{
  "name": "@atelier/ui-kit",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@atelier/types": "workspace:*",
    "react": "^18.3.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.4.0"
  },
  "peerDependencies": {
    "react": "^18.3.0"
  }
}
```

- [ ] **Step 2: 实现 Button 组件**

`packages/ui-kit/src/Button.tsx`:
```tsx
import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
```

- [ ] **Step 3: 实现 FileDropZone 组件**

`packages/ui-kit/src/FileDropZone.tsx`:
```tsx
import { useCallback, useState, useRef } from 'react';
import { clsx } from 'clsx';

interface FileDropZoneProps {
  accept?: string[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export function FileDropZone({
  accept,
  multiple = true,
  onFiles,
  className,
  children,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (accept) {
        const filtered = files.filter((f) => accept.some((a) => f.type.startsWith(a.replace('/*', '/'))));
        onFiles(filtered);
      } else {
        onFiles(files);
      }
    },
    [accept, onFiles],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      onFiles(files);
      e.target.value = '';
    },
    [onFiles],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={clsx(
        'border-2 border-dashed rounded-xl cursor-pointer transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50/50',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept?.join(',')}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {children || (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-700 font-medium">拖放文件到这里，或点击上传</p>
          <p className="text-gray-500 text-sm mt-1">支持图片、视频、音频、PDF 等</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 实现 ToolCard 组件**

`packages/ui-kit/src/ToolCard.tsx`:
```tsx
import { clsx } from 'clsx';
import type { ToolManifest } from '@atelier/types';

interface ToolCardProps {
  manifest: ToolManifest;
  onClick?: () => void;
  className?: string;
}

export function ToolCard({ manifest, onClick, className }: ToolCardProps) {
  const isOffline = manifest.runtime.offline;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white border border-gray-200 rounded-xl p-5 text-center cursor-pointer',
        'hover:border-blue-300 hover:shadow-md transition-all',
        className,
      )}
    >
      <div className="text-3xl mb-3">{manifest.icon}</div>
      <h3 className="text-gray-900 font-semibold text-sm">{manifest.name}</h3>
      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{manifest.description}</p>
      <div className="mt-3">
        {isOffline ? (
          <span className="inline-block bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full">
            离线可用
          </span>
        ) : (
          <span className="inline-block bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded-full">
            需联网
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建 styles.ts 和 index.ts**

`packages/ui-kit/src/styles.ts`:
```typescript
export const categoryColors: Record<string, string> = {
  image: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  design: 'bg-pink-100 text-pink-700',
  audio: 'bg-green-100 text-green-700',
  document: 'bg-yellow-100 text-yellow-700',
  ai: 'bg-indigo-100 text-indigo-700',
};

export const categoryLabels: Record<string, string> = {
  image: '🖼️ 图片',
  video: '🎬 视频',
  design: '🎨 设计',
  audio: '🔊 音频',
  document: '📄 文档',
  ai: '🤖 AI',
};
```

`packages/ui-kit/src/index.ts`:
```typescript
export { Button } from './Button';
export { FileDropZone } from './FileDropZone';
export { ToolCard } from './ToolCard';
export { categoryColors, categoryLabels } from './styles';
```

- [ ] **Step 6: 安装依赖并验证编译**

Run: `pnpm install && cd packages/ui-kit && pnpm build`
Expected: 编译成功

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add ui-kit package with Button, FileDropZone, ToolCard"
```

---

## Task 4: 创建 engine-image 包

**Files:**
- Create: `packages/engines/engine-image/package.json`
- Create: `packages/engines/engine-image/tsconfig.json`
- Create: `packages/engines/engine-image/src/utils.ts`
- Create: `packages/engines/engine-image/src/crop.ts`
- Create: `packages/engines/engine-image/src/compress.ts`
- Create: `packages/engines/engine-image/src/format.ts`
- Create: `packages/engines/engine-image/src/index.ts`

- [ ] **Step 1: 创建 package.json 和 tsconfig**

`packages/engines/engine-image/package.json`:
```json
{
  "name": "@atelier/engine-image",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@atelier/types": "workspace:*",
    "browser-image-compression": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: 实现 utils.ts — 通用图片加载工具**

`packages/engines/engine-image/src/utils.ts`:
```typescript
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function fileToObjectURL(file: File | Blob): string {
  return URL.createObjectURL(file);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality,
    );
  });
}
```

- [ ] **Step 3: 实现 crop.ts — 图片裁剪引擎**

`packages/engines/engine-image/src/crop.ts`:
```typescript
import { loadImage, canvasToBlob, fileToObjectURL } from './utils';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  region: CropRegion;
  outputType?: string;
  quality?: number;
}

export async function cropImage(file: File, options: CropOptions): Promise<Blob> {
  const url = fileToObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = options.region.width;
    canvas.height = options.region.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');

    ctx.drawImage(
      img,
      options.region.x,
      options.region.y,
      options.region.width,
      options.region.height,
      0,
      0,
      options.region.width,
      options.region.height,
    );

    return canvasToBlob(canvas, options.outputType || file.type, options.quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 4: 实现 compress.ts — 图片压缩引擎**

`packages/engines/engine-image/src/compress.ts`:
```typescript
import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: options.maxSizeMB ?? 1,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1920,
    initialQuality: options.quality ?? 0.8,
    useWebWorker: true,
  });
}
```

- [ ] **Step 5: 实现 format.ts — 格式转换引擎**

`packages/engines/engine-image/src/format.ts`:
```typescript
import { loadImage, canvasToBlob, fileToObjectURL } from './utils';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface FormatOptions {
  format: ImageFormat;
  quality?: number;
}

export async function convertFormat(file: File, options: FormatOptions): Promise<Blob> {
  const url = fileToObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    ctx.drawImage(img, 0, 0);

    return canvasToBlob(canvas, options.format, options.quality ?? 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 6: 创建 index.ts**

`packages/engines/engine-image/src/index.ts`:
```typescript
export { cropImage, type CropRegion, type CropOptions } from './crop';
export { compressImage, type CompressOptions } from './compress';
export { convertFormat, type ImageFormat, type FormatOptions } from './format';
export { loadImage, fileToObjectURL, canvasToBlob } from './utils';
```

- [ ] **Step 7: 安装依赖并验证**

Run: `pnpm install && cd packages/engines/engine-image && pnpm build`
Expected: 编译成功

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add engine-image package with crop, compress, format capabilities"
```

---

## Task 5: 创建 Next.js 平台壳

**Files:**
- Create: `packages/platform/web/package.json`
- Create: `packages/platform/web/next.config.mjs`
- Create: `packages/platform/web/tailwind.config.ts`
- Create: `packages/platform/web/postcss.config.mjs`
- Create: `packages/platform/web/tsconfig.json`
- Create: `packages/platform/web/src/app/globals.css`
- Create: `packages/platform/web/src/app/layout.tsx`
- Create: `packages/platform/web/src/app/page.tsx`
- Create: `packages/platform/web/src/components/Navbar.tsx`

- [ ] **Step 1: 创建 package.json**

`packages/platform/web/package.json`:
```json
{
  "name": "@atelier/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3200",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@atelier/types": "workspace:*",
    "@atelier/ui-kit": "workspace:*",
    "@atelier/engine-image": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: 创建 Next.js / Tailwind 配置文件**

`packages/platform/web/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@atelier/ui-kit', '@atelier/types', '@atelier/engine-image'],
};

export default nextConfig;
```

`packages/platform/web/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui-kit/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

`packages/platform/web/postcss.config.mjs`:
```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

`packages/platform/web/tsconfig.json`:
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "module": "ESNext",
    "jsx": "preserve",
    "noEmit": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 创建 globals.css 和 layout.tsx**

`packages/platform/web/src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`packages/platform/web/src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Atelier — 媒体工具聚合平台',
  description: '一站式媒体工具平台，图片裁剪、压缩、AI 抠图、视频转码，批量处理，工作流自动化',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 创建 SearchBar 组件**

`packages/platform/web/src/components/SearchBar.tsx`:
```tsx
'use client';

import { useState } from 'react';

export function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="🔍 搜索工具..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-48 md:w-64 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 5: 创建 Navbar 组件**（依赖 Step 4 的 SearchBar）

`packages/platform/web/src/components/Navbar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { SearchBar } from './SearchBar';

export function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-blue-600 font-bold text-lg">
              📦 Atelier
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                工具库
              </Link>
              <span className="text-gray-400 text-sm cursor-not-allowed">工作流</span>
              <span className="text-gray-400 text-sm cursor-not-allowed">我的文件</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <SearchBar />
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 6: 安装依赖并启动验证**

Run: `pnpm install && cd packages/platform/web && pnpm dev`
Expected: Next.js 在 http://localhost:3200 启动，看到 Navbar

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Next.js platform shell with Navbar and Tailwind"
```

---

## Task 6: 实现首页 — 拖放入口 + 工具卡片网格

**Files:**
- Create: `packages/platform/web/src/lib/tool-registry.ts`
- Create: `packages/platform/web/src/lib/file-utils.ts`
- Create: `packages/platform/web/src/components/FileDropHero.tsx`
- Create: `packages/platform/web/src/components/CategoryTabs.tsx`
- Create: `packages/platform/web/src/components/ToolGrid.tsx`
- Modify: `packages/platform/web/src/app/page.tsx`

- [ ] **Step 1: 实现 tool-registry.ts — 工具注册中心**

`packages/platform/web/src/lib/tool-registry.ts`:
```typescript
import type { ToolManifest, AtelierTool } from '@atelier/types';

class ToolRegistry {
  private tools = new Map<string, AtelierTool>();

  register(tool: AtelierTool) {
    this.tools.set(tool.manifest.id, tool);
  }

  get(id: string): AtelierTool | undefined {
    return this.tools.get(id);
  }

  getAll(): AtelierTool[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): AtelierTool[] {
    if (category === 'all') return this.getAll();
    return this.getAll().filter((t) => t.manifest.category === category);
  }

  getManifests(): ToolManifest[] {
    return this.getAll().map((t) => t.manifest);
  }

  getForFileType(mimeType: string): ToolManifest[] {
    return this.getManifests().filter((m) =>
      m.input.accept.some((a) => {
        if (a.endsWith('/*')) return mimeType.startsWith(a.replace('/*', '/'));
        return mimeType === a;
      }),
    );
  }
}

export const toolRegistry = new ToolRegistry();
```

- [ ] **Step 2: 实现 file-utils.ts**

`packages/platform/web/src/lib/file-utils.ts`:
```typescript
import type { FileInput } from '@atelier/types';

export function filesToFileInputs(files: File[]): FileInput[] {
  return files.map((file) => ({
    file,
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
  }));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'document';
  return 'other';
}
```

- [ ] **Step 3: 实现 FileDropHero 组件**

`packages/platform/web/src/components/FileDropHero.tsx`:
```tsx
'use client';

import { useCallback, useState } from 'react';
import { FileDropZone } from '@atelier/ui-kit';
import { toolRegistry } from '@/lib/tool-registry';
import { getFileCategory } from '@/lib/file-utils';
import type { ToolManifest } from '@atelier/types';
import { useRouter } from 'next/navigation';

export function FileDropHero() {
  const router = useRouter();
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [suggestedTools, setSuggestedTools] = useState<ToolManifest[]>([]);

  const handleFiles = useCallback((files: File[]) => {
    setDroppedFiles(files);
    if (files.length > 0) {
      const primaryType = files[0].type;
      const tools = toolRegistry.getForFileType(primaryType);
      setSuggestedTools(tools);
    }
  }, []);

  const handleToolSelect = useCallback(
    (toolId: string) => {
      const params = new URLSearchParams();
      params.set('files', 'pending');
      router.push(`/tool/${toolId}?${params}`);
    },
    [router],
  );

  if (suggestedTools.length > 0) {
    const category = getFileCategory(droppedFiles[0]?.type || '');
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-green-500">✓</span>
          <span className="text-gray-700 text-sm">
            已识别 <strong>{droppedFiles.length} 个{category === 'image' ? '图片' : '文件'}</strong>
            ，以下工具可处理：
          </span>
          <button
            onClick={() => { setDroppedFiles([]); setSuggestedTools([]); }}
            className="ml-auto text-gray-400 hover:text-gray-600 text-sm"
          >
            清除
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {suggestedTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center
                         hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl">{tool.icon}</div>
              <div className="text-gray-700 text-xs font-medium mt-1">{tool.name}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <FileDropZone onFiles={handleFiles} className="bg-white" />;
}
```

- [ ] **Step 4: 实现 CategoryTabs 组件**

`packages/platform/web/src/components/CategoryTabs.tsx`:
```tsx
'use client';

import { clsx } from 'clsx';
import { categoryLabels } from '@atelier/ui-kit';

interface CategoryTabsProps {
  selected: string;
  onChange: (category: string) => void;
}

const categories = ['all', 'image', 'video', 'design', 'audio', 'document', 'ai'] as const;

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            selected === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          {cat === 'all' ? '全部' : categoryLabels[cat] || cat}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: 实现 ToolGrid 组件**

`packages/platform/web/src/components/ToolGrid.tsx`:
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { ToolCard } from '@atelier/ui-kit';
import type { ToolManifest } from '@atelier/types';

interface ToolGridProps {
  tools: ToolManifest[];
}

export function ToolGrid({ tools }: ToolGridProps) {
  const router = useRouter();

  if (tools.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">🔍</div>
        <p>该分类下暂无工具</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {tools.map((manifest) => (
        <ToolCard
          key={manifest.id}
          manifest={manifest}
          onClick={() => router.push(`/tool/${manifest.id}`)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 组装首页**

`packages/platform/web/src/app/page.tsx`:
```tsx
'use client';

import { useState, useMemo } from 'react';
import { FileDropHero } from '@/components/FileDropHero';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ToolGrid } from '@/components/ToolGrid';
import { toolRegistry } from '@/lib/tool-registry';

export default function HomePage() {
  const [category, setCategory] = useState('all');

  const tools = useMemo(
    () => toolRegistry.getByCategory(category).map((t) => t.manifest),
    [category],
  );

  return (
    <div className="space-y-8">
      <FileDropHero />

      <section className="space-y-4">
        <CategoryTabs selected={category} onChange={setCategory} />
        <ToolGrid tools={tools} />
      </section>
    </div>
  );
}
```

- [ ] **Step 7: 验证首页渲染**

Run: `cd packages/platform/web && pnpm dev`
Expected: http://localhost:3200 显示拖放区 + 分类标签 + 空工具网格

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: implement home page with FileDropHero, CategoryTabs, ToolGrid"
```

---

## Task 7: 创建 image-crop 工具

**Files:**
- Create: `packages/tools/image-crop/package.json`
- Create: `packages/tools/image-crop/tsconfig.json`
- Create: `packages/tools/image-crop/manifest.json`
- Create: `packages/tools/image-crop/src/ImageCropTool.tsx`
- Create: `packages/tools/image-crop/src/processor.ts`
- Create: `packages/tools/image-crop/src/index.ts`

- [ ] **Step 1: 创建 package.json 和 manifest.json**

`packages/tools/image-crop/package.json`:
```json
{
  "name": "@atelier/tool-image-crop",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@atelier/types": "workspace:*",
    "@atelier/engine-image": "workspace:*",
    "@atelier/ui-kit": "workspace:*",
    "react": "^18.3.0",
    "react-image-crop": "^11.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
```

`packages/tools/image-crop/manifest.json`:
```json
{
  "id": "image-crop",
  "name": "图片裁剪",
  "category": "image",
  "description": "自由裁剪、按比例裁剪、批量裁剪到指定尺寸",
  "icon": "✂️",
  "version": "1.0.0",
  "runtime": {
    "client": true,
    "server": false,
    "offline": true,
    "downloadable": true
  },
  "input": {
    "accept": ["image/jpeg", "image/png", "image/webp"],
    "maxSize": "50MB",
    "batch": true
  },
  "output": {
    "formats": ["jpeg", "png", "webp"]
  },
  "engine": "@atelier/engine-image",
  "component": "./ImageCropTool.tsx"
}
```

`packages/tools/image-crop/tsconfig.json`:
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 实现 processor.ts — 裁剪处理逻辑**

`packages/tools/image-crop/src/processor.ts`:
```typescript
import { cropImage, type CropRegion } from '@atelier/engine-image';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

export interface CropToolOptions extends ToolOptions {
  region: CropRegion;
  outputFormat?: string;
  quality?: number;
}

export async function processCrop(input: FileInput, options: CropToolOptions): Promise<FileOutput> {
  const blob = await cropImage(input.file, {
    region: options.region,
    outputType: options.outputFormat || input.type,
    quality: options.quality ?? 0.92,
  });

  const ext = (options.outputFormat || input.type).split('/')[1] || 'png';
  const baseName = input.name.replace(/\.[^.]+$/, '');
  const name = `${baseName}_cropped.${ext}`;

  return {
    blob,
    name,
    type: blob.type,
    size: blob.size,
    url: URL.createObjectURL(blob),
  };
}
```

- [ ] **Step 3: 实现 ImageCropTool.tsx — 裁剪 UI 组件**

`packages/tools/image-crop/src/ImageCropTool.tsx`:
```tsx
import { useState, useCallback, useRef } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@atelier/ui-kit';
import type { ToolProps } from '@atelier/types';
import type { CropToolOptions } from './processor';

const ASPECT_RATIOS = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '9:16', value: 9 / 16 },
];

export function ImageCropTool({ files, onProcess, onDownload, processing, outputs }: ToolProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentFile = files[currentIndex];
  const hasOutput = outputs.length > 0;

  const handleCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    const img = imgRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const options: CropToolOptions = {
      region: {
        x: Math.round(completedCrop.x * scaleX),
        y: Math.round(completedCrop.y * scaleY),
        width: Math.round(completedCrop.width * scaleX),
        height: Math.round(completedCrop.height * scaleY),
      },
    };

    await onProcess(files, options);
  }, [completedCrop, files, onProcess]);

  if (!currentFile) {
    return <div className="text-center py-12 text-gray-500">请先上传图片</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: crop area */}
      <div className="flex-1 min-w-0">
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={currentFile.url}
              alt={currentFile.name}
              className="max-h-[500px] object-contain"
            />
          </ReactCrop>
        </div>

        {files.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {files.map((f, i) => (
              <button
                key={f.name}
                onClick={() => { setCurrentIndex(i); setCrop(undefined); }}
                className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden
                  ${i === currentIndex ? 'border-blue-500' : 'border-gray-200'}`}
              >
                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div className="w-full lg:w-72 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">比例</label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.label}
                onClick={() => { setAspect(r.value); setCrop(undefined); }}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-colors
                  ${aspect === r.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {completedCrop && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            裁剪区域: {Math.round(completedCrop.width)}×{Math.round(completedCrop.height)}px
          </div>
        )}

        <Button
          onClick={handleCrop}
          disabled={!completedCrop || processing}
          className="w-full"
        >
          {processing ? '处理中...' : `裁剪${files.length > 1 ? ` (${files.length} 张)` : ''}`}
        </Button>

        {hasOutput && (
          <Button variant="secondary" onClick={() => onDownload(outputs)} className="w-full">
            下载结果
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 index.ts — 导出 AtelierTool**

`packages/tools/image-crop/src/index.ts`:
```typescript
import type { AtelierTool } from '@atelier/types';
import manifest from '../manifest.json';
import { ImageCropTool } from './ImageCropTool';
import { processCrop } from './processor';

export const imageCropTool: AtelierTool = {
  manifest: manifest as AtelierTool['manifest'],
  Component: ImageCropTool,
  process: processCrop,
};
```

- [ ] **Step 5: 安装依赖**

Run: `pnpm install`
Expected: 成功安装 react-image-crop 等依赖

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add image-crop tool with react-image-crop UI"
```

---

## Task 8: 平台集成工具 — 注册、动态路由、工具页

**Files:**
- Create: `packages/platform/web/src/lib/register-tools.ts`
- Create: `packages/platform/web/src/components/ToolPageShell.tsx`
- Create: `packages/platform/web/src/app/tool/[id]/page.tsx`
- Modify: `packages/platform/web/src/app/layout.tsx`
- Modify: `packages/platform/web/package.json` (添加 tool 依赖)

- [ ] **Step 1: 注册工具到平台**

`packages/platform/web/src/lib/register-tools.ts`:
```typescript
import { toolRegistry } from './tool-registry';
import { imageCropTool } from '@atelier/tool-image-crop';

export function registerAllTools() {
  toolRegistry.register(imageCropTool);
}
```

- [ ] **Step 2: 在 layout.tsx 中初始化注册**

修改 `packages/platform/web/src/app/layout.tsx`，在 body 内添加初始化组件：

创建 `packages/platform/web/src/components/AppInit.tsx`:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { registerAllTools } from '@/lib/register-tools';

export function AppInit() {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      registerAllTools();
      initialized.current = true;
    }
  }, []);
  return null;
}
```

在 `layout.tsx` 中引入 `<AppInit />` 放在 `<Navbar />` 前面。

- [ ] **Step 3: 实现 ToolPageShell — 工具页布局壳**

`packages/platform/web/src/components/ToolPageShell.tsx`:
```tsx
'use client';

import { useState, useCallback } from 'react';
import { FileDropZone } from '@atelier/ui-kit';
import { toolRegistry } from '@/lib/tool-registry';
import { filesToFileInputs, formatFileSize } from '@/lib/file-utils';
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';

interface ToolPageShellProps {
  toolId: string;
}

export function ToolPageShell({ toolId }: ToolPageShellProps) {
  const tool = toolRegistry.get(toolId);
  const [files, setFiles] = useState<FileInput[]>([]);
  const [outputs, setOutputs] = useState<FileOutput[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = useCallback((rawFiles: File[]) => {
    const inputs = filesToFileInputs(rawFiles);
    setFiles(inputs);
    setOutputs([]);
  }, []);

  const handleProcess = useCallback(
    async (inputFiles: FileInput[], options: ToolOptions) => {
      if (!tool) return;
      setProcessing(true);
      try {
        const results: FileOutput[] = [];
        for (const f of inputFiles) {
          const result = await tool.process(f, options);
          results.push(result);
        }
        setOutputs(results);
      } finally {
        setProcessing(false);
      }
    },
    [tool],
  );

  const handleDownload = useCallback((results: FileOutput[]) => {
    for (const output of results) {
      const a = document.createElement('a');
      a.href = output.url;
      a.download = output.name;
      a.click();
    }
  }, []);

  if (!tool) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg">工具未找到</p>
      </div>
    );
  }

  const { manifest, Component } = tool;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{manifest.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{manifest.name}</h1>
            <p className="text-gray-500 text-sm">{manifest.description}</p>
          </div>
        </div>
      </div>

      {files.length === 0 ? (
        <FileDropZone
          accept={manifest.input.accept}
          multiple={manifest.input.batch}
          onFiles={handleFiles}
          className="bg-white min-h-[300px]"
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">
              {files.length} 个文件 · 共 {formatFileSize(files.reduce((s, f) => s + f.size, 0))}
            </span>
            <button
              onClick={() => { setFiles([]); setOutputs([]); }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              清除文件
            </button>
          </div>
          <Component
            files={files}
            onProcess={handleProcess}
            onDownload={handleDownload}
            processing={processing}
            outputs={outputs}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建工具动态路由页**

`packages/platform/web/src/app/tool/[id]/page.tsx`:
```tsx
'use client';

import { ToolPageShell } from '@/components/ToolPageShell';

export default function ToolPage({ params }: { params: { id: string } }) {
  return <ToolPageShell toolId={params.id} />;
}
```

- [ ] **Step 5: 添加工具包依赖到 web**

修改 `packages/platform/web/package.json`，在 dependencies 中添加：
```json
"@atelier/tool-image-crop": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 6: 验证完整流程**

Run: `cd packages/platform/web && pnpm dev`

验证步骤：
1. 访问 http://localhost:3200 → 看到首页，有裁剪工具卡片
2. 点击「图片裁剪」卡片 → 跳转到 /tool/image-crop
3. 上传一张图片 → 看到裁剪界面
4. 框选区域 → 点击裁剪 → 得到结果
5. 点击下载 → 下载裁剪后的图片
6. 回到首页 → 拖入图片 → 看到推荐工具列表

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrate image-crop tool into platform with dynamic routing"
```

---

## Task 9: 端到端打磨 & Zustand 状态管理

**Files:**
- Create: `packages/platform/web/src/stores/app-store.ts`
- Modify: 多个组件接入 store

- [ ] **Step 1: 创建 Zustand store**

`packages/platform/web/src/stores/app-store.ts`:
```typescript
import { create } from 'zustand';
import type { FileInput } from '@atelier/types';

interface AppState {
  pendingFiles: FileInput[];
  setPendingFiles: (files: FileInput[]) => void;
  clearPendingFiles: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingFiles: [],
  setPendingFiles: (files) => set({ pendingFiles: files }),
  clearPendingFiles: () => set({ pendingFiles: [] }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
```

- [ ] **Step 2: 将 SearchBar 接入 store（实现搜索过滤）**

修改 `SearchBar.tsx` 使用 `useAppStore` 的 searchQuery/setSearchQuery。
修改 `page.tsx` 的 ToolGrid 根据 searchQuery 过滤工具列表。

- [ ] **Step 3: FileDropHero 通过 store 传递文件到工具页**

当用户在首页拖入文件并选择工具后，将文件存入 `pendingFiles`，工具页从 store 读取并自动加载。

- [ ] **Step 4: 全面测试完整流程**

测试清单：
1. [ ] 首页渲染正常（拖放区 + 分类标签 + 工具卡片）
2. [ ] 分类筛选工作正常
3. [ ] 搜索过滤工作正常
4. [ ] 点击工具卡片跳转正常
5. [ ] 工具页上传文件 → 裁剪 → 下载正常
6. [ ] 首页拖入文件 → 显示推荐工具 → 选择跳转正常
7. [ ] 多文件上传 → 可切换预览
8. [ ] 响应式布局在移动端可用

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Zustand store, search filtering, file-first flow integration"
```

---

## Phase 1 完成标准

Phase 1 完成后，平台应具备：
- Monorepo 结构就绪，新包可快速创建
- 平台壳可用（首页 + 导航 + 分类 + 搜索）
- 双向动线：工具优先 + 文件优先
- 首个工具（图片裁剪）完整可用
- 图片引擎具备裁剪/压缩/格式转换底层能力（为 Phase 2 工具准备）

> **延后到 Phase 2+**：首页「钉选工具」和「最近使用」区域（需要持久化支持）、Radix UI 组件（按需引入）、engine-image 单元测试（需配置 jsdom + canvas mock 环境）

## 后续 Phase 计划提示

| Phase | 要点 | 前置 |
|-------|------|------|
| Phase 2 | image-compress + image-format 工具、批量处理流程（预览→确认→审查） | Phase 1 |
| Phase 3 | AI 网关 + AI 抠图工具 + Key 管理（localStorage） | Phase 2 |
| Phase 4 | 工作流引擎（简单模式）+ 预设模板 | Phase 2 |
| Phase 5 | 用户系统 + 本地数据迁移云端 + 部署 | Phase 3 + 4 |

每个 Phase 完成后再编写下一个 Phase 的详细计划。
