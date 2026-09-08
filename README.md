# My Editor — 富文本模板编辑器

基于 Tiptap 的富文本模板编辑器系统，支持模板设计、字段配置、数据填写和多种渲染方式。

## 技术栈

- **前端：** React 18 + TypeScript + Vite + Ant Design + Tiptap v2
- **后端：** NestJS + TypeORM + MySQL 8
- **工程化：** pnpm + Turbo monorepo

## 快速开始

### 前置要求

- Node.js >= 20
- pnpm >= 9
- Docker（用于本地 MySQL）

### 安装与启动

```bash
# 安装依赖
pnpm install

# 启动 MySQL
docker compose up -d

# 配置环境变量
cp packages/server/.env.example packages/server/.env

# 运行数据库迁移
pnpm --filter @my-editor/server migration:run

# 启动开发服务
pnpm dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 项目结构

```
packages/
├── shared/    # @my-editor/shared — 共享类型、工具函数、Tiptap 基础节点
├── web/       # @my-editor/web — React 前端
└── server/    # @my-editor/server — NestJS 后端
```

## 文档

详见 [docs/development-plan.md](./docs/development-plan.md)

## 常用命令

```bash
pnpm dev          # 启动所有开发服务
pnpm build        # 构建所有包
pnpm test         # 运行测试
pnpm typecheck    # 类型检查
pnpm lint         # 代码检查
```
