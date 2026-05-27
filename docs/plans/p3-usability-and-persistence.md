# P3 可用性提升 + 数据持久化

Updated: 2026-05-27

## Context

Atelier 工具链已基本完整（12 个工具 + 6 个工作流模板），但存在三个核心问题：
1. AI 工具缺少提示词模板，用户不知道怎么写 prompt
2. 执行记录完全丢失，用户无法复盘
3. 工作流/API Key 仅存浏览器，换设备就没了

## 目标

分三个模块实施，每个模块独立可用。

---

## 模块 1：AI 工具可用性提升

### 1a. AI 场景合成 — 支持自定义背景上传

**文件**: `packages/tools/ai-scene-compose/src/AiSceneComposeTool.tsx`

在现有 6 个预设场景之外，新增"上传背景图"选项。用户上传自己的背景图，跳过 AI 生成背景步骤，直接与抠图结果合成。

**修改**:
- 场景模板新增第 7 个选项"自定义背景"
- 选择后显示文件上传区域
- processor.ts 新增分支：如果有自定义背景，跳过 callGenerateImage，直接用上传的图

### 1b. AI 文案 — 提示词/品类模板

**文件**: `packages/tools/ai-copy-gen/src/AiCopyGenTool.tsx`

在"商品名称"和"核心卖点"输入框下方，新增品类快捷模板。点击自动填充示例内容，降低使用门槛。

**预设模板**:
- 服装：`连衣裙女款2024春夏` / `桑蚕丝面料、收腰显瘦、通勤百搭`
- 食品：`手工曲奇饼干礼盒` / `0添加防腐剂、黄油原味、送礼首选`
- 数码：`无线蓝牙耳机降噪版` / `40dB主动降噪、续航36小时、IPX5防水`
- 家居：`北欧简约台灯` / `三档调光、护眼LED、实木底座`
- 美妆：`持妆哑光口红` / `不沾杯、12色可选、滋润不拔干`

### 1c. AI 文案 — 品牌语气预设

**文件**: `packages/tools/ai-copy-gen/src/AiCopyGenTool.tsx` + `processor.ts`

在"文案风格"选择旁新增"品牌语气"输入框（可选），用户可输入品牌调性描述（如"年轻、活泼、用网络流行语"），传入 system prompt 增强一致性。

---

## 模块 2：执行记录持久化

### 2a. Prisma 新增 WorkflowRun 模型

**文件**: `packages/platform/web/prisma/schema.prisma`

```prisma
model WorkflowRun {
  id            String   @id @default(cuid())
  userId        String
  workflowId    String
  workflowName  String
  totalFiles    Int
  successCount  Int
  failCount     Int
  skippedCount  Int
  duration      Int      // 毫秒
  status        String   // 'completed' | 'failed' | 'partial'
  stepDetails   String   // JSON string of StepResult[]
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 2b. tRPC 新增 execution 路由

**文件**: `packages/platform/web/src/server/routers/execution.ts`（新建）

- `execution.record` — 记录一次执行结果
- `execution.list` — 查询当前用户的执行记录（分页）
- `execution.get` — 查询单条记录详情

### 2c. WorkflowRunner 执行完后记录

**文件**: `packages/platform/web/src/components/WorkflowRunner.tsx`

在 workflow 执行完成（成功/失败/部分成功）后，调用 `execution.record` 保存结果。

### 2d. 首页新增"执行记录"入口

**文件**: `packages/platform/web/src/app/page.tsx`

在首页核心场景下方新增"最近执行"区域，展示最近 5 条执行记录。

---

## 模块 3：工作流 + API Key 入库

### 3a. Prisma 新增 UserWorkflow 和 UserApiKey 模型

**文件**: `packages/platform/web/prisma/schema.prisma`

```prisma
model UserWorkflow {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String
  steps       String   // JSON string of WorkflowStep[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserApiKey {
  id        String   @id @default(cuid())
  userId    String
  provider  String
  key       String
  label     String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
}
```

### 3b. tRPC 新增 workflow + apiKey 路由

**文件**: `packages/platform/web/src/server/routers/user.ts`（扩展）

- `user.saveWorkflow` / `user.listWorkflows` / `user.deleteWorkflow`
- `user.saveApiKey` / `user.listApiKeys` / `user.deleteApiKey`

### 3c. 登录后同步

**文件**: `packages/platform/web/src/lib/auth-context.tsx`

登录成功后，将 IndexedDB 中的工作流和 localStorage 中的 API Key 同步到数据库。下次登录从数据库恢复。

---

## 实施顺序

1. 模块 1（AI 可用性）— 改现有组件，无新增依赖，最快见效
2. 模块 2（执行记录）— 新增 Prisma model + tRPC 路由
3. 模块 3（数据入库）— 依赖模块 2 的 Prisma 基础设施

## 文件清单

| 操作 | 文件 | 模块 |
|------|------|------|
| 修改 | `packages/tools/ai-scene-compose/src/AiSceneComposeTool.tsx` | 1a |
| 修改 | `packages/tools/ai-scene-compose/src/processor.ts` | 1a |
| 修改 | `packages/tools/ai-copy-gen/src/AiCopyGenTool.tsx` | 1b, 1c |
| 修改 | `packages/tools/ai-copy-gen/src/processor.ts` | 1c |
| 修改 | `packages/platform/web/prisma/schema.prisma` | 2a, 3a |
| 新建 | `packages/platform/web/src/server/routers/execution.ts` | 2b |
| 修改 | `packages/platform/web/src/server/routers/_app.ts` | 2b |
| 修改 | `packages/platform/web/src/components/WorkflowRunner.tsx` | 2c |
| 修改 | `packages/platform/web/src/app/page.tsx` | 2d |
| 修改 | `packages/platform/web/src/server/routers/user.ts` | 3b |
| 修改 | `packages/platform/web/src/lib/auth-context.tsx` | 3c |

## 验证

- [x] `pnpm --filter @atelier/web exec prisma db push`
- [x] `pnpm --filter @atelier/web exec tsc --noEmit`
- [x] `pnpm lint`

## 进度

### 模块 1：AI 工具可用性提升

- [x] 1a. AI 场景合成 — 支持自定义背景上传
  - 新增"自定义背景"场景选项
  - 支持上传 JPG/PNG/WebP 背景图
  - 跳过 AI 生成背景，直接使用上传的图进行合成
- [x] 1b. AI 文案 — 提示词/品类模板
  - 新增 5 个品类快捷模板（服装/食品/数码/家居/美妆）
  - 点击自动填充示例商品名称和卖点
- [x] 1c. AI 文案 — 品牌语气预设
  - 新增"品牌语气"输入框（可选）
  - 传入 system prompt 增强文案一致性

### 模块 2：执行记录持久化

- [x] 2a. Prisma 新增 WorkflowRun 模型
- [x] 2b. tRPC 新增 execution 路由（record/list/get）
- [x] 2c. WorkflowRunner 执行完后记录结果
- [x] 2d. 首页新增"最近执行"区域

### 模块 3：工作流 + API Key 入库

- [x] 3a. Prisma 新增 UserWorkflow 和 UserApiKey 模型
- [x] 3b. tRPC 新增 workflow + apiKey 路由（CRUD）
- [ ] 3c. 登录后同步（待实现）
