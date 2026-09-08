# 富文本模板编辑器 — 开发计划

> 项目代号：my-editor  
> 创建日期：2026-09-08  
> 技术栈：React + TypeScript + Ant Design + Tiptap v2 | NestJS + TypeORM + MySQL | pnpm + Turbo Monorepo

---

## 1. 项目概述

### 1.1 目标

搭建一个基于 Tiptap 的富文本模板编辑器系统：

- **模板设计**：管理员通过富文本编辑器创建模板，在文档中插入"可填写字段"（Slot），并为每个字段配置类型、校验规则、选项等属性
- **模板填写**：用户加载模板后，字段位置渲染为对应的表单控件（输入框、选择框等），填写完成后保存
- **数据存储**：填写数据以 JSON 格式存储，同时服务端渲染完整 HTML 一并存储
- **内容回显**：支持两种方式——动态渲染（模板 + 数据前端组合）和静态 HTML（直接展示服务端预渲染结果）

### 1.2 技术选型

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 前端框架 | React | 18.3 | SPA |
| 构建工具 | Vite | 6.x | 开发体验好，HMR 快 |
| UI 组件库 | Ant Design | 5.x | 表单组件丰富，中文文档完善 |
| 富文本引擎 | Tiptap | 2.x | 基于 ProseMirror，扩展性强 |
| 状态管理 | Zustand | 5.x | 轻量，用于填写会话 store |
| 数据请求 | TanStack Query + Axios | 5.x | 缓存/重试/分页 |
| 后端框架 | NestJS | 11.x | 模块化，TypeScript 原生支持 |
| ORM | TypeORM | 0.3.x | 与 NestJS 集成紧密 |
| 数据库 | MySQL | 8.x | 支持 JSON 列类型 |
| 包管理 | pnpm | 10.x | 磁盘效率高，monorepo 原生支持 |
| 构建编排 | Turbo | 2.x | monorepo 任务编排与缓存 |
| 语言 | TypeScript | 5.6 | 全栈类型安全 |

---

## 2. 核心架构决策

| # | 决策点 | 方案 | 原因 |
|---|---|---|---|
| 1 | Slot 节点类型 | `inline: true, atom: true` | 字段需要在段落内流动（如"尊敬的 `{{姓名}}`"），atom 防止用户编辑节点内部 |
| 2 | Slot 定义位置 | `packages/shared` 中的纯 Tiptap Node | 前端编辑器和后端 HTML 渲染共用同一份 `renderHTML`，保证输出一致性 |
| 3 | 填写值存储 | Zustand vanilla store | Tiptap NodeView 在独立 React root 中挂载，React Context 无法传递进去 |
| 4 | 方案 A（动态回显） | 加载模板 + data JSON，readOnly FillEditor 渲染 | 最大组件复用，所见即所得 |
| 5 | 方案 B（静态回显） | 服务端 `@tiptap/html` generateHTML → 存储 rendered_html | 零 JS 依赖，适合邮件/打印/PDF 导出 |
| 6 | 数据验证 | shared 包纯函数 `validateRecordData`，前后端共用 | 单一真相源，避免规则不一致 |
| 7 | fields_schema 来源 | 服务端从 content JSON 自动提取（非客户端提交） | 安全性 + 数据一致性 |

---

## 3. Monorepo 目录结构

```
my-editor/
├── package.json                  # 根配置，turbo scripts
├── pnpm-workspace.yaml           # packages: ["packages/*"]
├── turbo.json                    # Turbo 任务编排
├── tsconfig.base.json            # 共享 TS 基础配置
├── docker-compose.yml            # MySQL 8 本地开发环境
├── .gitignore
├── .npmrc
├── README.md
├── docs/                         # 开发文档
│   ├── development-plan.md       # 本文档
│   ├── architecture.md           # 架构设计详解
│   ├── api-reference.md          # API 接口文档
│   ├── database-design.md        # 数据库设计
│   ├── slot-extension-guide.md   # Slot 扩展开发指南
│   └── getting-started.md        # 快速开始
└── packages/
    ├── shared/                   # @my-editor/shared
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsup.config.ts
    │   └── src/
    │       ├── index.ts          # barrel export
    │       ├── types/
    │       │   ├── field.ts      # FieldType, SlotFieldSchema
    │       │   ├── template.ts   # TemplateDto, CreateTemplateInput
    │       │   ├── record.ts     # RecordDto, CreateRecordInput
    │       │   └── api.ts        # ApiResponse, Paginated, FieldValue
    │       ├── constants/
    │       │   └── index.ts      # SLOT_NODE_TYPE, FIELD_TYPE_META
    │       ├── tiptap/
    │       │   └── TemplateSlotBase.ts  # 同构 Slot 节点
    │       ├── utils/
    │       │   ├── doc.ts        # extractSlotFields, injectValuesIntoDoc
    │       │   ├── validation.ts # validateRecordData
    │       │   └── format.ts     # formatDisplayValue
    │       └── __tests__/
    │           ├── doc.test.ts
    │           └── validation.test.ts
    ├── web/                      # @my-editor/web
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── index.html
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       ├── components/
    │       │   ├── editor/
    │       │   │   ├── extensions/
    │       │   │   │   ├── TemplateSlotDesign.ts
    │       │   │   │   └── TemplateSlotFill.ts
    │       │   │   ├── nodeviews/
    │       │   │   │   ├── SlotDesignNodeView.tsx
    │       │   │   │   └── SlotFillNodeView.tsx
    │       │   │   ├── EditorToolbar.tsx
    │       │   │   ├── DesignEditor.tsx
    │       │   │   └── FillEditor.tsx
    │       │   ├── fields/
    │       │   │   └── FieldRenderer.tsx
    │       │   ├── template/
    │       │   │   ├── SlotConfigDrawer.tsx
    │       │   │   └── SlotListPanel.tsx
    │       │   └── record/
    │       │       ├── DynamicRecordView.tsx
    │       │       └── StaticHtmlView.tsx
    │       ├── pages/
    │       │   ├── TemplateListPage.tsx
    │       │   ├── TemplateEditorPage.tsx
    │       │   ├── TemplateUsePage.tsx
    │       │   ├── RecordListPage.tsx
    │       │   └── RecordDetailPage.tsx
    │       ├── layouts/
    │       │   └── BasicLayout.tsx
    │       ├── hooks/
    │       │   ├── useFillStore.ts
    │       │   ├── useTemplates.ts
    │       │   └── useRecords.ts
    │       ├── services/
    │       │   ├── api.ts
    │       │   ├── template.service.ts
    │       │   ├── record.service.ts
    │       │   └── queryKeys.ts
    │       └── styles/
    │           ├── global.css
    │           └── tpl-slot.css
    └── server/                   # @my-editor/server
        ├── package.json
        ├── tsconfig.json
        ├── nest-cli.json
        ├── .env.example
        └── src/
            ├── main.ts
            ├── app.module.ts
            ├── config/
            │   └── database.config.ts
            ├── common/
            │   ├── interceptors/
            │   │   └── transform.interceptor.ts
            │   ├── filters/
            │   │   └── all-exceptions.filter.ts
            │   └── tiptap/
            │       └── server-extensions.ts
            ├── database/
            │   ├── data-source.ts
            │   ├── migrations/
            │   └── seeds/
            └── modules/
                ├── template/
                │   ├── template.module.ts
                │   ├── template.controller.ts
                │   ├── template.service.ts
                │   ├── entities/
                │   │   ├── template.entity.ts
                │   │   └── template-version.entity.ts
                │   └── dto/
                │       ├── create-template.dto.ts
                │       ├── update-template.dto.ts
                │       └── query-template.dto.ts
                └── record/
                    ├── record.module.ts
                    ├── record.controller.ts
                    ├── record.service.ts
                    ├── entities/
                    │   └── template-record.entity.ts
                    └── dto/
                        ├── create-record.dto.ts
                        └── query-record.dto.ts
```

---

## 4. 数据库设计

### 4.1 ER 关系

```
┌─────────────┐       1:N       ┌──────────────────┐
│  templates  │────────────────▶│ template_records │
└─────────────┘                 └──────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ template_versions│
└──────────────────┘
```

### 4.2 templates（模板表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| name | VARCHAR(200) | NOT NULL | 模板名称 |
| code | VARCHAR(100) | NOT NULL, UNIQUE | 模板编码（用于 API 查询） |
| description | VARCHAR(500) | NULL | 模板描述 |
| content | JSON | NOT NULL | Tiptap 文档 JSON（完整文档结构） |
| html | LONGTEXT | NULL | 设计模式下的 HTML 快照 |
| fields_schema | JSON | NOT NULL | SlotFieldSchema[] — 所有字段定义 |
| status | ENUM('draft','published','archived') | DEFAULT 'draft' | 模板状态 |
| version | INT | DEFAULT 1 | 当前版本号 |
| created_at | DATETIME(6) | DEFAULT CURRENT_TIMESTAMP(6) | 创建时间 |
| updated_at | DATETIME(6) | ON UPDATE CURRENT_TIMESTAMP(6) | 更新时间 |

**索引：** `idx_templates_code` (code), `idx_templates_status` (status)

### 4.3 template_records（填写记录表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| template_id | BIGINT | NOT NULL, FK → templates.id | 关联模板 |
| template_code | VARCHAR(100) | NOT NULL | 冗余模板编码（快速查询） |
| template_version | INT | NOT NULL | 填写时的模板版本号 |
| data | JSON | NOT NULL | 填写数据 `{ [code]: FieldValue }` |
| rendered_html | LONGTEXT | NOT NULL | 服务端渲染的完整 HTML |
| created_at | DATETIME(6) | DEFAULT CURRENT_TIMESTAMP(6) | 创建时间 |
| updated_at | DATETIME(6) | ON UPDATE CURRENT_TIMESTAMP(6) | 更新时间 |

**索引：** `idx_records_template_id`, `idx_records_template_code`

### 4.4 template_versions（模板版本历史表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| template_id | BIGINT | NOT NULL, FK → templates.id | 模板 ID |
| version | INT | NOT NULL | 版本号 |
| name | VARCHAR(200) | NOT NULL | 快照：模板名称 |
| content | JSON | NOT NULL | 快照：文档 JSON |
| html | LONGTEXT | NULL | 快照：HTML |
| fields_schema | JSON | NOT NULL | 快照：字段定义 |
| created_at | DATETIME(6) | DEFAULT CURRENT_TIMESTAMP(6) | 快照时间 |

**索引：** `uk_template_version` (template_id, version) UNIQUE

### 4.5 字段类型定义（SlotFieldSchema）

```typescript
// 支持的字段类型
type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date';

// 字段 Schema
interface SlotFieldSchema {
  code: string;              // 唯一标识，用于数据绑定
  type: FieldType;           // 字段类型
  label: string;             // 显示名称
  placeholder?: string;      // 占位提示文字
  options?: SlotOption[];    // select/multiselect 的选项
  multiple?: boolean;        // 是否多选（multiselect 时默认 true）
  required?: boolean;        // 是否必填
  maxLength?: number;        // 最大长度（text/textarea）
  min?: number;              // 最小值（number）
  max?: number;              // 最大值（number）
  pattern?: string;          // 正则校验（字符串形式）
  patternMessage?: string;   // 正则校验失败提示
  defaultValue?: FieldValue; // 默认值
}

interface SlotOption {
  label: string;
  value: string | number;
}

type FieldValue = string | number | string[] | null;
```

---

## 5. REST API 设计

### 5.1 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

错误响应：
```json
{
  "code": 400,
  "message": "Validation failed",
  "data": { "errors": { "name": "姓名不能为空" } }
}
```

### 5.2 模板接口

| 方法 | 路径 | 说明 | 请求体/参数 |
|---|---|---|---|
| GET | /api/templates | 分页列表 | `?page=1&pageSize=20&keyword=&status=` |
| POST | /api/templates | 创建模板 | `{ name, code, description?, content, html?, status? }` |
| GET | /api/templates/:id | 模板详情 | — |
| GET | /api/templates/code/:code | 按编码获取 | — |
| PUT | /api/templates/:id | 更新模板 | `{ name?, description?, content?, html?, status? }` |
| DELETE | /api/templates/:id | 删除模板 | — |

**业务规则：**
- 创建时 `code` 必须唯一，重复返回 409
- `fields_schema` 由服务端从 `content` 自动提取，客户端无需提交
- 更新时自动 `version + 1`，旧版本存入 `template_versions`
- 删除时如有关联记录，返回 400 拒绝删除

### 5.3 记录接口

| 方法 | 路径 | 说明 | 请求体/参数 |
|---|---|---|---|
| POST | /api/records | 创建记录 | `{ templateCode, data: { [code]: value } }` |
| GET | /api/records | 分页列表 | `?page=1&pageSize=20&templateCode=` |
| GET | /api/records/:id | 记录详情 | — |
| GET | /api/records/:id/full | 记录+模板（方案A） | — |
| DELETE | /api/records/:id | 删除记录 | — |

**创建记录流程：**
1. 根据 `templateCode` 查找模板
2. 调用 `validateRecordData(fieldsSchema, data)` 校验
3. 规范化 data（过滤非法字段，填充 defaultValue）
4. `injectValuesIntoDoc(content, data)` → 带值的文档 JSON
5. `generateHTML(filledDoc, extensions)` → 完整 HTML
6. 持久化 `{ templateId, templateCode, templateVersion, data, renderedHtml }`

---

## 6. 前端页面规划

### 6.1 路由表

| 路由 | 页面组件 | 功能描述 |
|---|---|---|
| `/` | — | 重定向到 /templates |
| `/templates` | TemplateListPage | 模板列表：搜索、状态筛选、新建/编辑/删除/去填写 |
| `/templates/new` | TemplateEditorPage | 新建模板：Tiptap 编辑器 + 字段配置 |
| `/templates/:id/edit` | TemplateEditorPage | 编辑模板 |
| `/templates/:code/use` | TemplateUsePage | 使用模板：填写字段、校验、保存 |
| `/records` | RecordListPage | 记录列表：按模板筛选、查看/删除 |
| `/records/:id` | RecordDetailPage | 记录详情：Tab A 动态渲染 / Tab B 静态 HTML |

### 6.2 页面布局

```
┌─────────────────────────────────────────────────────┐
│  Header: Logo + 面包屑                               │
├────────────┬────────────────────────────────────────┤
│            │                                        │
│   Sider    │           Content Area                 │
│            │                                        │
│  · 模板管理 │                                        │
│  · 填写记录 │                                        │
│            │                                        │
├────────────┴────────────────────────────────────────┤
│  Footer (optional)                                   │
└─────────────────────────────────────────────────────┘
```

### 6.3 模板编辑器页面布局

```
┌──────────────────────────────────────────────────────────────────┐
│ 模板信息栏: [名称输入] [编码输入] [状态选择] [保存按钮]           │
├─────────────────────────────────────────┬────────────────────────┤
│                                         │  字段列表面板           │
│  工具栏: B I U S H1 H2 • 1 " ← → 🎨   │                        │
│  ─────────────────────────────────────  │  ┌──────────────────┐  │
│                                         │  │ {{姓名}} [text]  │  │
│  Tiptap 编辑器区域                       │  │ {{部门}} [select]│  │
│                                         │  │ {{日期}} [date]  │  │
│  尊敬的 {{姓名}} ：                      │  └──────────────────┘  │
│  兹定于 {{日期}} 在 {{地点}} 召开...      │                        │
│                                         │  [+ 插入字段]           │
│                                         │                        │
├─────────────────────────────────────────┴────────────────────────┤
│ 状态栏: 字数统计 | 字段数量 | 最后保存时间                        │
└──────────────────────────────────────────────────────────────────┘
```

### 6.4 模板填写页面布局

```
┌──────────────────────────────────────────────────────────────────┐
│ 模板名称: 请假申请单  |  版本: v3  |  状态: published            │
├─────────────────────────────────────────┬────────────────────────┤
│                                         │  快速导航              │
│  Tiptap 文档（readOnly 区域 + 可交互字段）│                        │
│                                         │  ● 姓名 (必填)         │
│  尊敬的 [____姓名____] ：               │  ○ 部门               │
│  本人因 [____事由____] ，               │  ○ 开始日期            │
│  申请自 [__开始日期__] 起               │  ○ 结束日期            │
│  至 [__结束日期__] 止...                │                        │
│                                         │                        │
├─────────────────────────────────────────┴────────────────────────┤
│ 操作栏: ⚠️ 2个字段未填写  |  [重置]  [保存提交]                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. 分阶段实施计划

### Phase 1: 项目脚手架 ⏱️ 预计 1 天

**任务清单：**
- [ ] 初始化 git 仓库
- [ ] 创建根 `package.json`（private: true，turbo scripts）
- [ ] 创建 `pnpm-workspace.yaml`
- [ ] 创建 `turbo.json`（build/dev/lint/test/typecheck 任务配置）
- [ ] 创建 `tsconfig.base.json`（strict 模式，paths 映射）
- [ ] 创建 `docker-compose.yml`（MySQL 8，端口 3306）
- [ ] 创建 `.gitignore`、`.npmrc`
- [ ] 搭建 `packages/shared` 骨架（package.json, tsconfig, tsup.config, src/index.ts）
- [ ] 搭建 `packages/web` 骨架（Vite + React + TS，配置 proxy）
- [ ] 搭建 `packages/server` 骨架（NestJS 最小启动，health endpoint）
- [ ] 创建 `README.md`（快速开始指南）

**验收标准：**
- `pnpm install` 无错误
- `pnpm build` 三个包均构建成功
- `pnpm dev` 同时启动前端 (5173) 和后端 (3000)
- 访问 `http://localhost:3000/api/health` 返回 `{ status: "ok" }`

---

### Phase 2: Shared 类型包 ⏱️ 预计 1 天

**任务清单：**
- [ ] 定义 `src/types/field.ts`（FieldType, SlotOption, SlotFieldSchema）
- [ ] 定义 `src/types/template.ts`（TemplateDto, CreateTemplateInput, UpdateTemplateInput）
- [ ] 定义 `src/types/record.ts`（RecordDto, CreateRecordInput, RecordFullDto）
- [ ] 定义 `src/types/api.ts`（ApiResponse, Paginated, FieldValue, TiptapDoc）
- [ ] 定义 `src/constants/index.ts`（SLOT_NODE_TYPE, FIELD_TYPE_META, TEMPLATE_STATUS）
- [ ] 实现 `src/tiptap/TemplateSlotBase.ts`（同构 Node：attrs, parseHTML, renderHTML）
- [ ] 实现 `src/utils/doc.ts`（extractSlotFields, injectValuesIntoDoc）
- [ ] 实现 `src/utils/validation.ts`（validateRecordData）
- [ ] 实现 `src/utils/format.ts`（formatDisplayValue）
- [ ] 编写单元测试（vitest）
- [ ] 配置 barrel export（src/index.ts）

**验收标准：**
- `pnpm --filter @my-editor/shared build` 成功
- `pnpm --filter @my-editor/shared test` 全部通过
- web 和 server 包能正常 import 类型和工具函数

---

### Phase 3: 后端数据库 ⏱️ 预计 0.5 天

**任务清单：**
- [ ] 配置 `.env` + `database.config.ts`
- [ ] 创建 `data-source.ts`（TypeORM CLI 使用）
- [ ] 实现 `template.entity.ts`
- [ ] 实现 `template-record.entity.ts`
- [ ] 实现 `template-version.entity.ts`
- [ ] 生成初始迁移脚本
- [ ] 创建 seed 脚本（示例模板："请假申请单"）
- [ ] 配置 package.json scripts（migration:generate/run/revert, seed）

**验收标准：**
- `docker compose up -d` MySQL 启动
- `pnpm --filter server migration:run` 成功建表
- `pnpm --filter server seed` 插入示例数据
- 数据库客户端可看到 3 张表 + 示例记录

---

### Phase 4: 后端模板 API ⏱️ 预计 1 天

**任务清单：**
- [ ] 创建 `TemplateModule`
- [ ] 实现 `CreateTemplateDto` + `UpdateTemplateDto`（class-validator）
- [ ] 实现 `QueryTemplateDto`（分页 + 筛选）
- [ ] 实现 `TemplateService`（CRUD + code 唯一校验 + fields_schema 提取 + 版本管理）
- [ ] 实现 `TemplateController`（6 个端点）
- [ ] 创建全局 `TransformInterceptor`（统一响应格式）
- [ ] 创建全局 `AllExceptionsFilter`
- [ ] 注册全局 `ValidationPipe`（whitelist + transform）
- [ ] 配置 CORS

**验收标准：**
- POST 创建模板 → 201，fields_schema 自动生成
- POST 重复 code → 409
- GET 列表 → 分页正确，不含 content 字段
- PUT 更新 → version 自增，旧版本存入 template_versions
- DELETE 有记录的模板 → 400 拒绝

---

### Phase 5: 后端记录 API ⏱️ 预计 1 天

**任务清单：**
- [ ] 创建 `RecordModule`
- [ ] 实现 `CreateRecordDto` + `QueryRecordDto`
- [ ] 实现 `server-extensions.ts`（与前端一致的 Tiptap 扩展集）
- [ ] 实现 `RecordService`（创建流程：校验 → 注入 → 渲染 → 持久化）
- [ ] 实现 `RecordController`（5 个端点）
- [ ] 编写 e2e 测试

**验收标准：**
- POST 缺少必填字段 → 400 + 字段级错误信息
- POST 合法数据 → 201，rendered_html 中包含填写值
- GET /records/:id/full → 返回 record + template
- 渲染的 HTML 中 slot 节点显示为 `tpl-slot--filled` 样式

---

### Phase 6: 前端路由与布局 ⏱️ 预计 0.5 天

**任务清单：**
- [ ] 安装前端依赖（antd, react-router-dom, @tanstack/react-query, axios 等）
- [ ] 配置 Vite proxy（/api → localhost:3000）
- [ ] 创建 `BasicLayout.tsx`（Ant Design Layout + Sider 菜单）
- [ ] 配置 React Router 路由表
- [ ] 创建 axios 实例 + 响应拦截器
- [ ] 创建 template.service.ts / record.service.ts
- [ ] 创建 TanStack Query hooks
- [ ] 创建全局样式 + tpl-slot.css
- [ ] 创建页面占位组件

**验收标准：**
- 所有路由可导航，页面占位显示
- Sider 菜单高亮与路由同步
- API 请求通过 Vite proxy 正确到达后端

---

### Phase 7: Tiptap 编辑器 + Slot 扩展 ⏱️ 预计 2 天

**任务清单：**
- [ ] 实现 `TemplateSlotDesign.ts`（设计模式扩展 + ReactNodeViewRenderer）
- [ ] 实现 `SlotDesignNodeView.tsx`（Tag chip 展示，点击编辑/删除）
- [ ] 实现 `TemplateSlotFill.ts`（填写模式扩展 + store 桥接）
- [ ] 实现 `SlotFillNodeView.tsx`（渲染表单控件，stopEvent/ignoreMutation）
- [ ] 实现 `FieldRenderer.tsx`（6 种字段类型对应 antd 控件）
- [ ] 实现 `useFillStore.ts`（zustand vanilla store 工厂）
- [ ] 实现 `EditorToolbar.tsx`（格式化按钮 + 插入字段按钮）
- [ ] 实现 `DesignEditor.tsx`（设计模式编辑器组件）
- [ ] 实现 `FillEditor.tsx`（填写模式编辑器组件）
- [ ] 手动测试验证

**验收标准：**
- 设计模式：可插入 Slot chip，chip 不可从内部编辑（atom）
- 填写模式：Slot 渲染为对应控件，输入值正确同步到 store
- antd Select 下拉/DatePicker 弹窗不与 ProseMirror 事件冲突
- 切换 readOnly 模式控件正确禁用

---

### Phase 8: 模板编辑器页面 ⏱️ 预计 1.5 天

**任务清单：**
- [ ] 实现 `TemplateEditorPage.tsx`（左侧编辑器 + 右侧面板）
- [ ] 实现 `SlotConfigDrawer.tsx`（字段配置抽屉表单）
- [ ] 实现 `SlotListPanel.tsx`（字段列表 + 定位 + 编辑/删除）
- [ ] 模板元信息表单（name, code, description, status）
- [ ] 保存逻辑（构建 payload → POST/PUT）
- [ ] 编辑模式加载（GET → setContent + 表单赋值）
- [ ] 完善 `TemplateListPage.tsx`（Table + 搜索 + 状态筛选 + 操作按钮）
- [ ] 客户端 code 唯一性提示

**验收标准：**
- 创建模板：插入 3 种不同类型字段，配置属性，保存成功
- 编辑模板：加载后所有字段配置完整，修改后 version 递增
- 字段面板：实时同步文档中的 Slot，点击可定位
- 列表页：搜索/筛选/分页正常，操作按钮路由正确

---

### Phase 9: 模板填写页面 ⏱️ 预计 1 天

**任务清单：**
- [ ] 实现 `TemplateUsePage.tsx`
- [ ] 加载模板（useTemplateByCode）+ 创建 fill store
- [ ] 渲染 FillEditor（可交互模式）
- [ ] 右侧锚点导航（字段列表，点击滚动定位）
- [ ] 底部操作栏（校验状态 Badge / 重置 / 保存按钮）
- [ ] 校验逻辑（validateAll → touch 所有字段 → 滚动到第一个错误）
- [ ] 保存逻辑（POST /records → 成功跳转）
- [ ] 模板状态提示（draft 模板显示警告）

**验收标准：**
- 必填字段未填时保存被阻止，显示红色错误提示
- 点击右侧导航可滚动到对应字段
- 保存成功后跳转到记录详情页
- 重置按钮恢复所有字段为默认值

---

### Phase 10: 记录展示页面 ⏱️ 预计 1 天

**任务清单：**
- [ ] 实现 `RecordListPage.tsx`（Table + templateCode 筛选）
- [ ] 实现 `RecordDetailPage.tsx`（Tabs 切换两种渲染方式）
- [ ] 实现 `DynamicRecordView.tsx`（readOnly FillEditor + prefilled store）
- [ ] 实现 `StaticHtmlView.tsx`（DOMPurify + dangerouslySetInnerHTML）
- [ ] HTML 源码查看模式（toggle）
- [ ] 复制 HTML 按钮
- [ ] data JSON 折叠展示

**验收标准：**
- 方案 A 和方案 B 渲染结果视觉一致
- 静态 HTML 中无 React/Tiptap 运行时依赖
- DOMPurify 正确过滤潜在 XSS
- 复制按钮将 HTML 写入剪贴板

---

### Phase 11: 测试 + 文档 ⏱️ 预计 1 天

**任务清单：**
- [ ] shared 单元测试：extractSlotFields, injectValuesIntoDoc, validateRecordData
- [ ] server e2e 测试：模板 CRUD, 记录创建（含校验失败场景）, HTML 渲染正确性
- [ ] web 组件测试：FieldRenderer 各类型渲染, useFillStore 校验流程
- [ ] 编写 `docs/architecture.md`
- [ ] 编写 `docs/getting-started.md`
- [ ] 编写 `docs/api-reference.md`
- [ ] 编写 `docs/database-design.md`
- [ ] 编写 `docs/slot-extension-guide.md`
- [ ] 更新 README.md

**验收标准：**
- `pnpm test` 全部通过
- 文档覆盖所有核心概念，新开发者可按文档独立跑通项目

---

## 8. 关键技术注意事项

### 8.1 React Context 无法传入 Tiptap NodeView

**问题：** Tiptap v2 的 `ReactNodeViewRenderer` 将每个 NodeView 挂载到独立的 React root 中，应用层的 Context/Provider 无法传递进去。

**解决方案：** 使用 extension options + zustand vanilla store 作为桥接：
```typescript
// 创建 store（页面级）
const store = createFillStore(fieldsSchema);

// 通过 extension configure 传入
TemplateSlotFill.configure({ store })

// NodeView 中读取
const value = useStore(store, s => s.values[code]);
```

### 8.2 getHTML() 不反映 NodeView 内容

**问题：** 调用 `editor.getHTML()` 时，输出由 Node spec 的 `renderHTML` 决定，而非 React NodeView 的 DOM。

**解决方案：** 填写后的 HTML 必须由服务端生成：
1. `injectValuesIntoDoc(doc, data)` — 将 value 写入节点 attrs
2. `generateHTML(filledDoc, extensions)` — 使用 `@tiptap/html` 在服务端渲染
3. `renderHTML` 中根据 `attrs.value` 输出填写内容

### 8.3 NodeView 事件冲突

**问题：** antd 的 Select 下拉框、DatePicker 弹窗等组件的键盘/鼠标事件会被 ProseMirror 拦截。

**解决方案：** 在 Fill NodeView 中配置：
```typescript
stopEvent: () => true,        // 阻止事件冒泡到 ProseMirror
ignoreMutation: () => true,   // React 管理此 DOM 子树
```

### 8.4 前后端扩展集同步

**问题：** 服务端 `generateHTML` 使用的扩展集必须与前端编辑器一致，否则 HTML 输出不匹配。

**解决方案：** 
- `TemplateSlotBase` 定义在 shared 包，前后端共用
- 服务端 `server-extensions.ts` 导入 shared 的基础节点
- 文档级扩展（StarterKit, Underline 等）配置保持同步

### 8.5 日期值序列化

**问题：** dayjs 对象不可 JSON 序列化。

**解决方案：** 统一将日期值格式化为 `'YYYY-MM-DD'` 字符串后再存入 data，读取时用 `dayjs(value)` 还原。

---

## 9. 开发环境搭建

### 9.1 前置要求

- Node.js >= 20
- pnpm >= 9
- Docker（用于本地 MySQL）
- MySQL 8.x（或通过 docker-compose 启动）

### 9.2 快速开始

```bash
# 克隆项目
git clone <repo-url> && cd my-editor

# 安装依赖
pnpm install

# 启动 MySQL
docker compose up -d

# 配置环境变量
cp packages/server/.env.example packages/server/.env
# 编辑 .env 填入数据库连接信息

# 运行数据库迁移
pnpm --filter server migration:run

# 填充示例数据（可选）
pnpm --filter server seed

# 启动开发服务
pnpm dev
# 前端: http://localhost:5173
# 后端: http://localhost:3000
```

### 9.3 环境变量（packages/server/.env）

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=my_editor
```

---

## 10. 时间估算

| 阶段 | 预计工时 | 依赖 |
|---|---|---|
| Phase 1: 项目脚手架 | 1 天 | — |
| Phase 2: Shared 类型包 | 1 天 | Phase 1 |
| Phase 3: 后端数据库 | 0.5 天 | Phase 1 |
| Phase 4: 后端模板 API | 1 天 | Phase 2, 3 |
| Phase 5: 后端记录 API | 1 天 | Phase 2, 4 |
| Phase 6: 前端路由与布局 | 0.5 天 | Phase 1 |
| Phase 7: Tiptap 编辑器 + Slot | 2 天 | Phase 2, 6 |
| Phase 8: 模板编辑器页面 | 1.5 天 | Phase 4, 7 |
| Phase 9: 模板填写页面 | 1 天 | Phase 5, 7 |
| Phase 10: 记录展示页面 | 1 天 | Phase 9 |
| Phase 11: 测试 + 文档 | 1 天 | All |
| **总计** | **~11.5 天** | |

**可并行路径：**
- Phase 3-5（后端）与 Phase 6-7（前端）可并行开发
- 实际串行最短路径约 8 天

---

## 11. 后续扩展方向（不在当前范围内）

- [ ] 用户认证与权限（RBAC：管理员 / 编辑者 / 查看者）
- [ ] 模板分类与标签
- [ ] 字段联动（A 字段值变化影响 B 字段选项）
- [ ] 协同编辑（基于 Tiptap Collaboration + Hocuspocus）
- [ ] 模板导入/导出（JSON / HTML）
- [ ] 图片/附件上传字段类型
- [ ] 表格内嵌字段（复杂布局）
- [ ] 记录审批流程
- [ ] PDF 导出
