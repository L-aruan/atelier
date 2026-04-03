# Atelier Phase 5 — 用户系统 + UX 打磨 实施计划

**Goal:** 用户注册/登录上线，钉选工具 + 最近使用，UX 全面打磨，生产构建就绪。

**Architecture:**
- PostgreSQL + Prisma ORM 数据持久化
- 邮箱密码注册 + JWT 会话（bcrypt 哈希，jose JWT）
- 用户偏好（钉选、最近使用）存 PG
- 本地数据迁移上云延后（scope 缩减至登录后的新数据直接存 PG）
- OAuth 延后至 Post-MVP

**Tech Stack (新增):**
- `prisma` + `@prisma/client` — ORM
- `bcryptjs` — 密码哈希
- `jose` — JWT 生成/验证（Edge Runtime 兼容）
- `zod` — 已有（输入校验）

**Spec:** `docs/specs/2026-04-03-mediabox-design.md` §8 Phase 5

**Scope 精简说明：** Phase 5 原计划包含"本地数据迁移上云"和"部署上线"。为保持 MVP 可交付性：
- 本地→云端迁移延后（localStorage Key 和 IndexedDB 工作流保持本地，登录后的新数据直接写 PG）
- 部署配置（Vercel/Docker）由用户按需操作，不在本计划内
- 重点：用户系统 + 钉选/最近 + UX 打磨

---

## 新增/修改文件结构

```
packages/platform/web/
├── prisma/
│   └── schema.prisma              # 新增：Prisma schema
├── src/
│   ├── server/
│   │   ├── db.ts                  # 新增：Prisma client 实例
│   │   ├── auth.ts                # 新增：JWT + 密码验证
│   │   └── routers/
│   │       ├── _app.ts            # 修改：添加 user router
│   │       └── user.ts            # 新增：注册/登录/偏好 API
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx           # 新增：登录页
│   │   └── register/
│   │       └── page.tsx           # 新增：注册页
│   ├── components/
│   │   ├── AuthForm.tsx           # 新增：登录/注册表单组件
│   │   ├── Navbar.tsx             # 修改：显示用户信息/登录按钮
│   │   ├── PinnedTools.tsx        # 新增：钉选工具栏
│   │   ├── RecentTools.tsx        # 新增：最近使用列表
│   │   └── ToolCard.tsx           # 修改：添加钉选按钮（可能在 ui-kit 中）
│   ├── lib/
│   │   └── auth-context.ts        # 新增：用户认证上下文
│   └── stores/
│       └── app-store.ts           # 修改：添加用户相关状态
```

---

## Task 1: PostgreSQL + Prisma Schema

**Files:**
- Create: `packages/platform/web/prisma/schema.prisma`
- Create: `packages/platform/web/src/server/db.ts`

- [ ] **Step 1: 安装 Prisma**

```bash
pnpm --filter @atelier/web add prisma @prisma/client bcryptjs jose
pnpm --filter @atelier/web add -D @types/bcryptjs
```

- [ ] **Step 2: 创建 schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  pinnedTools  PinnedTool[]
  recentTools  RecentTool[]
}

model PinnedTool {
  id       String @id @default(cuid())
  userId   String
  toolId   String
  order    Int    @default(0)
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, toolId])
}

model RecentTool {
  id       String   @id @default(cuid())
  userId   String
  toolId   String
  usedAt   DateTime @default(now())
  count    Int      @default(1)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, toolId])
}
```

- [ ] **Step 3: 创建 db.ts — Prisma 单例**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: 添加 .env 模板**

创建 `.env.example` 包含 `DATABASE_URL=postgresql://...`

- [ ] **Step 5: Commit**

```
feat: add Prisma schema with User, PinnedTool, RecentTool models
```

---

## Task 2: 用户注册/登录 (JWT)

**Files:**
- Create: `packages/platform/web/src/server/auth.ts`
- Create: `packages/platform/web/src/server/routers/user.ts`
- Modify: `packages/platform/web/src/server/routers/_app.ts`
- Create: `packages/platform/web/src/lib/auth-context.tsx`
- Create: `packages/platform/web/src/components/AuthForm.tsx`
- Create: `packages/platform/web/src/app/login/page.tsx`
- Create: `packages/platform/web/src/app/register/page.tsx`
- Modify: `packages/platform/web/src/components/Navbar.tsx`
- Modify: `packages/platform/web/src/components/Providers.tsx`

- [ ] **Step 1: 实现 auth.ts — JWT + 密码工具**

```typescript
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'atelier-dev-secret');

export async function hashPassword(password: string): Promise<string> { ... }
export async function verifyPassword(password: string, hash: string): Promise<boolean> { ... }
export async function createToken(userId: string): Promise<string> { ... }
export async function verifyToken(token: string): Promise<{ userId: string } | null> { ... }
```

- [ ] **Step 2: 实现 user router — 注册/登录/获取用户信息**

```typescript
export const userRouter = router({
  register: publicProcedure.input(z.object({ email, password, name? })).mutation(...),
  login: publicProcedure.input(z.object({ email, password })).mutation(...),
  me: publicProcedure.query(...),  // 从 JWT cookie 获取当前用户
  logout: publicProcedure.mutation(...),
});
```

- [ ] **Step 3: 创建 auth-context.tsx — 客户端认证状态**

React Context 管理当前用户信息，提供 login/logout/register 方法。
通过 tRPC 的 user.me 查询初始化。

- [ ] **Step 4: 创建 AuthForm — 登录/注册表单组件**

通用表单：邮箱、密码、姓名（注册时）。
成功后跳转首页。

- [ ] **Step 5: 创建登录/注册页面**

- [ ] **Step 6: 修改 Navbar — 显示用户信息或登录按钮**

未登录：显示「登录」链接
已登录：显示用户名 + 退出按钮

- [ ] **Step 7: 修改 Providers — 包裹 AuthProvider**

- [ ] **Step 8: Commit**

```
feat: add user registration and login with JWT authentication
```

---

## Task 3: 钉选工具 + 最近使用

**Files:**
- Modify: `packages/platform/web/src/server/routers/user.ts`
- Create: `packages/platform/web/src/components/PinnedTools.tsx`
- Create: `packages/platform/web/src/components/RecentTools.tsx`
- Modify: `packages/platform/web/src/app/page.tsx`
- Modify: `packages/platform/web/src/stores/app-store.ts`

- [ ] **Step 1: 添加钉选/最近使用 API**

在 user router 添加：
- `pinTool(toolId)` — 钉选
- `unpinTool(toolId)` — 取消钉选
- `getPinnedTools()` — 获取钉选列表
- `recordToolUse(toolId)` — 记录使用
- `getRecentTools(limit)` — 获取最近使用

未登录用户使用 localStorage 本地存储（不依赖数据库）。

- [ ] **Step 2: 实现 PinnedTools 组件**

显示在首页拖放区下方，钉选的工具快捷入口。

- [ ] **Step 3: 实现 RecentTools 组件**

显示最近使用的工具列表，包含使用次数和时间。

- [ ] **Step 4: 集成到首页**

在 FileDropHero 下方依次显示 PinnedTools 和 RecentTools（已登录或本地有数据时显示）。

- [ ] **Step 5: 在 ToolPageShell 中记录使用**

每次进入工具页时调用 recordToolUse。

- [ ] **Step 6: Commit**

```
feat: add pinned tools and recent usage tracking
```

---

## Task 4: UX 打磨

**Files:** 多个组件微调

- [ ] **Step 1: 加载状态**

为以下场景添加 loading skeleton / spinner：
- 首页工具列表加载
- 工作流列表加载
- 工具页组件加载

- [ ] **Step 2: 错误提示**

添加统一的 toast 通知组件，用于：
- 处理成功/失败提示
- API 调用错误提示
- 文件格式不支持提示

- [ ] **Step 3: 空状态**

为以下场景添加友好的空状态：
- 搜索无结果
- 没有工作流
- 没有最近使用
- 没有钉选工具

- [ ] **Step 4: 响应式适配**

确保在移动端（< 768px）布局合理：
- Navbar 折叠为汉堡菜单
- 工具卡片网格适配
- 工作流编辑器竖向布局

- [ ] **Step 5: Commit**

```
feat: add loading states, error toasts, empty states, and responsive layout
```

---

## Task 5: 集成测试 + 构建验证

- [ ] **Step 1: 生成 Prisma Client（不需要实际数据库连接）**

```bash
pnpm --filter @atelier/web exec prisma generate
```

- [ ] **Step 2: pnpm build 验证**

- [ ] **Step 3: Commit**

```
chore: Phase 5 integration polish
```

---

## Phase 5 完成标准

- Prisma schema 定义完成（User, PinnedTool, RecentTool）
- 用户注册/登录 API 可用（email + JWT）
- 登录/注册页面可用
- 导航栏显示用户状态
- 钉选工具功能可用（首页快捷入口）
- 最近使用记录可用
- 加载状态、错误提示、空状态、响应式布局就绪
- 生产构建通过
