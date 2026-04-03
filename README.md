# Atelier

> 媒体工具聚合平台 — 为电商运营、自媒体创作者、中小企业设计团队打造

Atelier 聚合互联网上优秀的媒体处理工具，提供统一的中文化体验和增值功能，包括工作流串联、批量处理和文件管理。

## 特性

- **浏览器端处理** — 图片裁剪、压缩、格式转换等轻量任务直接在浏览器完成，零服务器成本
- **批量处理** — 多文件上传 → 预览确认 → 全量执行 → 结果审查 → 一键下载
- **工作流引擎** — 将多个工具串成流水线，预设模板一键复用
- **AI 增强** — 支持 AI 去背景等能力，可使用自有 API Key 或平台通用 Key
- **插件化架构** — 每个工具独立为 npm 包，通过 Manifest 声明能力，快速集成

## 已有工具

| 工具 | 类别 | 运行环境 | 说明 |
|------|------|----------|------|
| 图片裁剪 | 图片 | 浏览器 | 自由裁剪、按比例裁剪、批量裁剪 |
| 图片压缩 | 图片 | 浏览器 | 质量控制、尺寸限制 |
| 格式转换 | 图片 | 浏览器 | JPEG / PNG / WebP 互转 |
| AI 去背景 | AI | 服务端 | 基于 remove.bg API |
| 文件整理 | 实用工具 | 浏览器 | 按文件名或类型自动归类整理，打包下载 |
| 文档格式刷 | 文档 | 服务端 | 将模板 Word 文档的格式应用到目标文档，一键统一格式 |

## 演示 (Demos)

### 1. 文件整理工具
自动按照文件名或文件类型对散乱的文件进行归类，并打包下载：

> 💡 **提示**：[将你录制的文件整理动图命名为 `file-organizer-demo.gif` 并放置在 `docs/assets/` 目录下即可在此处显示]
![文件整理演示](./docs/assets/file-organizer-demo.gif)

### 2. 文档格式刷
一键将目标 Word 文档的页面设置、字体、段落格式、页眉页脚统一为模板文档的样式：

> 💡 **提示**：[将你录制的格式刷动图命名为 `doc-format-brush-demo.gif` 并放置在 `docs/assets/` 目录下即可在此处显示]
![文档格式刷演示](./docs/assets/doc-format-brush-demo.gif)

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) · React 18 · Tailwind CSS |
| 状态管理 | Zustand |
| API | tRPC (端到端类型安全) |
| 数据库 | PostgreSQL · Prisma ORM |
| 客户端处理 | Canvas API · browser-image-compression |
| Monorepo | pnpm workspaces · Turborepo |

## 项目结构

```
atelier/
├── packages/
│   ├── tools/                  # 工具插件
│   │   ├── image-crop/         # 图片裁剪
│   │   ├── image-compress/     # 图片压缩
│   │   ├── image-format/       # 格式转换
│   │   └── ai-remove-bg/       # AI 去背景
│   ├── engines/                # 共享处理引擎
│   │   ├── engine-image/       # 图片处理引擎
│   │   └── engine-ai/          # AI API 网关客户端
│   ├── platform/
│   │   └── web/                # Next.js Web 平台
│   ├── shared/
│   │   └── types/              # 共享类型定义
│   └── ui-kit/                 # 通用 UI 组件
├── docs/                       # 设计文档与里程碑计划
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/L-aruan/atelier.git
cd atelier

# 安装依赖
pnpm install

# 配置环境变量
cp packages/platform/web/.env.example packages/platform/web/.env
# 编辑 .env 填入 DATABASE_URL 和 JWT_SECRET

# 生成 Prisma 客户端
pnpm --filter @atelier/web exec prisma generate

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3200 即可使用。

### 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建所有包
pnpm lint         # 代码检查
pnpm clean        # 清理构建产物
```

## 添加新工具

每个工具是独立的 npm 包，遵循统一接口：

1. 在 `packages/tools/` 下创建目录
2. 编写 `manifest.json` 声明工具能力（输入类型、运行环境、分类等）
3. 实现 `processor.ts`（处理逻辑）和 React 组件（UI）
4. 在 `packages/platform/web/src/lib/register-tools.ts` 中注册

```typescript
// 工具需实现的标准接口
interface AtelierTool {
  manifest: ToolManifest
  Component: React.FC<ToolProps>
  process(input: FileInput, options: ToolOptions): Promise<FileOutput>
}
```

## API Key 配置

AI 工具支持两种 Key 来源：

- **自有 Key**：在 设置 → API Key 管理 中添加（支持 remove.bg、OpenAI、OpenRouter 等）
- **平台 Key**：零配置使用低成本模型（需平台端配置）

## License

MIT
