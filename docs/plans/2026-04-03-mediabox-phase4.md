# Atelier Phase 4 — 工作流引擎 实施计划

**Goal:** 简单模式工作流可用（步骤列表编辑器），预设模板可选，工作流可保存/加载（IndexedDB）。

**Architecture:**
- 工作流 = 有序步骤列表（Step[]），每步引用一个已注册工具 + 该工具的参数配置
- 执行引擎按顺序执行每个步骤，上一步输出作为下一步输入
- 数据模型支持未来扩展为 DAG（但 MVP 只用线性列表）
- 持久化用 IndexedDB（idb-keyval 库），Phase 5 迁移到 PG

**Tech Stack (新增):**
- `idb-keyval` — 极简 IndexedDB 封装

**Spec:** `docs/specs/2026-04-03-mediabox-design.md` §4 工作流, §8 Phase 4

---

## 新增/修改文件结构

```
packages/platform/web/src/
├── lib/
│   ├── workflow-types.ts          # 新增：工作流数据模型
│   ├── workflow-engine.ts         # 新增：工作流执行引擎
│   ├── workflow-store.ts          # 新增：IndexedDB 持久化
│   └── workflow-templates.ts      # 新增：预设模板
├── app/
│   └── workflow/
│       ├── page.tsx               # 新增：工作流列表页
│       └── [id]/
│           └── page.tsx           # 新增：工作流编辑/执行页
├── components/
│   ├── WorkflowEditor.tsx         # 新增：步骤列表编辑器
│   ├── WorkflowStepCard.tsx       # 新增：单个步骤卡片
│   ├── WorkflowToolPicker.tsx     # 新增：工具选择面板
│   ├── WorkflowRunner.tsx         # 新增：工作流执行视图
│   └── Navbar.tsx                 # 修改：激活"工作流"导航链接
```

---

## Task 1: 工作流数据模型

**Files:**
- Create: `packages/platform/web/src/lib/workflow-types.ts`

- [ ] **Step 1: 定义核心类型**

```typescript
export interface WorkflowStep {
  id: string;
  toolId: string;           // 引用 toolRegistry 中的工具 ID
  label: string;            // 用户可编辑的步骤名称
  options: Record<string, unknown>;  // 工具参数
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isTemplate: boolean;      // 预设模板标记
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowExecution {
  workflowId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStepIndex: number;
  totalSteps: number;
  stepResults: StepResult[];
}

export interface StepResult {
  stepId: string;
  toolId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  inputCount: number;
  outputCount: number;
  error?: string;
}
```

- [ ] **Step 2: Commit**

```
feat: add workflow data model types
```

---

## Task 2: 简单模式 UI（步骤列表编辑器）

**Files:**
- Create: `packages/platform/web/src/components/WorkflowEditor.tsx`
- Create: `packages/platform/web/src/components/WorkflowStepCard.tsx`
- Create: `packages/platform/web/src/components/WorkflowToolPicker.tsx`
- Create: `packages/platform/web/src/app/workflow/page.tsx`
- Create: `packages/platform/web/src/app/workflow/[id]/page.tsx`
- Modify: `packages/platform/web/src/components/Navbar.tsx`

- [ ] **Step 1: WorkflowToolPicker — 工具选择面板**

弹出面板，显示所有已注册工具的卡片，用户点击选中一个工具添加为步骤。
只显示支持 batch 的工具（工作流场景都是批量处理）。

- [ ] **Step 2: WorkflowStepCard — 单个步骤卡片**

显示：步骤序号、工具图标+名称、参数配置区域（根据工具类型动态渲染）、删除按钮、上下移动按钮。

参数配置：
- image-crop: 裁剪宽高比选择（暂不支持交互式裁剪，工作流场景用固定比例）
- image-compress: 质量滑块 + 最大体积 + 最大宽高
- image-format: 目标格式选择 + 质量
- ai-remove-bg: Key 选择

- [ ] **Step 3: WorkflowEditor — 步骤列表编辑器**

- 顶部：工作流名称（可编辑）、描述
- 主体：步骤列表（可拖拽排序用按钮上下移动）
- 底部：「+ 添加步骤」按钮 + 「保存」按钮 + 「执行」按钮
- 支持从预设模板创建

- [ ] **Step 4: 创建页面路由**

`/workflow` — 工作流列表页（已保存 + 模板）
`/workflow/[id]` — 编辑/执行页
`/workflow/new` — 新建（使用 WorkflowEditor 空状态）

- [ ] **Step 5: 修改 Navbar 激活工作流链接**

```tsx
<Link href="/workflow" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
  工作流
</Link>
```

- [ ] **Step 6: Commit**

```
feat: add workflow editor UI with step list and tool picker
```

---

## Task 3: 工作流执行引擎

**Files:**
- Create: `packages/platform/web/src/lib/workflow-engine.ts`
- Create: `packages/platform/web/src/components/WorkflowRunner.tsx`

- [ ] **Step 1: 实现 workflow-engine.ts**

```typescript
import type { FileInput, FileOutput, ToolOptions } from '@atelier/types';
import type { Workflow, WorkflowExecution, StepResult } from './workflow-types';
import { toolRegistry } from './tool-registry';

export async function executeWorkflow(
  workflow: Workflow,
  initialFiles: FileInput[],
  onProgress: (execution: WorkflowExecution) => void,
): Promise<FileOutput[]> {
  // 按步骤顺序执行
  // 每步输出转为下一步输入
  // 实时推送进度
}
```

关键逻辑：
1. 初始文件作为第一步输入
2. 每步处理完，输出的 FileOutput 转为下一步的 FileInput（Blob→File 转换）
3. 某步失败不中断，标记错误，跳过该文件继续
4. 最终返回最后一步的输出

- [ ] **Step 2: 实现 WorkflowRunner — 执行视图**

UI 包含：
- 步骤进度列表（每步显示 pending/running/success/failed）
- 当前处理的文件名
- 整体进度条
- 完成后显示结果（复用 BatchReview 组件）

- [ ] **Step 3: 集成到 workflow/[id]/page.tsx**

编辑完点「执行」→ 上传文件 → WorkflowRunner 接管 → 显示结果

- [ ] **Step 4: Commit**

```
feat: add workflow execution engine with step-by-step processing
```

---

## Task 4: 预设模板 + IndexedDB 保存/加载

**Files:**
- Create: `packages/platform/web/src/lib/workflow-templates.ts`
- Create: `packages/platform/web/src/lib/workflow-store.ts`

- [ ] **Step 1: 安装 idb-keyval**

```bash
pnpm --filter @atelier/web add idb-keyval
```

- [ ] **Step 2: 实现 workflow-store.ts**

```typescript
import { get, set, del, keys } from 'idb-keyval';
import type { Workflow } from './workflow-types';

const PREFIX = 'workflow:';

export async function saveWorkflow(workflow: Workflow): Promise<void> { ... }
export async function loadWorkflow(id: string): Promise<Workflow | null> { ... }
export async function deleteWorkflow(id: string): Promise<void> { ... }
export async function listWorkflows(): Promise<Workflow[]> { ... }
```

- [ ] **Step 3: 实现 workflow-templates.ts**

预设模板：
1. 电商商品图批处理：裁剪(1:1) → 压缩(quality=0.85, maxSizeMB=0.5)
2. 自媒体封面制作：裁剪(16:9) → 格式转换(WebP)
3. 图片批量压缩：压缩(quality=0.8, maxSizeMB=1) → 格式转换(WebP)

- [ ] **Step 4: 集成到 workflow 页面**

模板显示在列表页顶部，用户点击模板可直接创建工作流副本编辑。

- [ ] **Step 5: Commit**

```
feat: add workflow templates and IndexedDB persistence
```

---

## Task 5: 集成测试 + 构建验证

- [ ] **Step 1: pnpm install + build 验证**
- [ ] **Step 2: Commit**

```
chore: Phase 4 integration polish
```

---

## Phase 4 完成标准

- 工作流列表页可访问 `/workflow`
- 可新建工作流，添加/删除/排序步骤
- 每个步骤可选工具并配置参数
- 执行工作流：上传文件 → 按步执行 → 显示进度 → 结果审查
- 3 个预设模板可选
- 工作流可保存到 IndexedDB、加载、删除
- 导航栏「工作流」链接可用
- 生产构建通过
