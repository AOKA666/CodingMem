# PRD：Codex Chat Auto Sync / AI Coding Memory

## 1. 项目背景

我在公司和家里有两台电脑，都会在 VS Code 中使用 Codex 进行 AI 编程聊天。由于聊天记录分散在不同电脑上，导致我经常遇到以下问题：

1. 公司电脑和家里电脑的 Codex 聊天记录不统一。
2. 多设备聊天记录时间线混乱。
3. 有时候忘记让 AI 总结当天进展。
4. 第二天继续开发时，忘记昨天 AI 讨论过什么、解决了什么、还剩什么问题。
5. 很多重要决策、Bug 修复过程、下一步 Todo 都散落在聊天记录里，没有沉淀成项目记忆。

因此，我想开发一个 VS Code 插件 + 后台服务，用来自动采集 Codex 本地聊天记录，上传到后台统一整理，然后每天自动生成 AI 编程日报和项目记忆。

本项目第一版只支持 Codex 本地聊天记录，不需要支持 Cursor、Claude Code、Cline、Copilot 等其他工具。

---

## 2. 项目目标

开发一个系统，包含：

1. VS Code 插件：负责扫描本机 Codex 聊天记录，上传新增记录。
2. 后台 API：负责接收聊天记录、去重、排序、存储。
3. 总结服务：负责按日期、项目、设备整理聊天记录，并生成 Markdown 格式日报。
4. 简单查看页面：用于查看每日总结和原始同步状态。

第一版目标不是做复杂 SaaS，而是先做一个我自己能用的 MVP。

---

## 3. 产品定位

产品名称暂定：

Codex Chat Auto Sync

或者：

AI Coding Memory

核心定位：

自动同步多设备上的 Codex AI 编程聊天记录，并生成每日项目进展总结。

核心价值：

让开发者不用手动总结 AI 编程过程，也不会因为多台电脑使用 Codex 而丢失上下文。

---

## 4. 用户场景

### 场景一：公司电脑开发

用户白天在公司电脑上用 VS Code + Codex 开发项目 A。

插件自动扫描本地 Codex 聊天记录，把新增记录上传到后台。

后台保存：

* 设备：公司电脑
* 项目：项目 A
* 时间：聊天发生时间
* 内容：用户问题与 Codex 回复

### 场景二：家里电脑继续开发

用户晚上回家，在家里电脑上继续用 VS Code + Codex 开发项目 A 或项目 B。

插件同样自动扫描本机 Codex 聊天记录，并上传后台。

后台将两台电脑的聊天记录按真实发生时间合并成统一时间线。

### 场景三：每天自动生成总结

每天晚上或第二天打开 VS Code 时，系统根据当天所有聊天记录生成日报。

日报内容包括：

* 今天做了什么
* AI 帮忙解决了什么问题
* 讨论过哪些文件
* 做了哪些关键决策
* 还有哪些 Bug 或未完成任务
* 明天下一步应该做什么

### 场景四：第二天继续开发

用户打开 VS Code 后，可以查看昨天的 AI 编程日报，也可以复制总结内容给 Codex，让 Codex 快速理解项目上下文。

---

## 5. MVP 范围

### 第一版必须实现

1. VS Code 插件可以配置 Codex sessions 路径。
2. VS Code 插件可以设置后台 API 地址和用户 token。
3. VS Code 插件可以手动点击 Sync Now，同步最近 7 天的 Codex 聊天记录。
4. VS Code 插件启动时自动检查并同步新增聊天记录。
5. VS Code 插件每隔 30 分钟自动同步一次新增聊天记录。
6. 后台 API 可以接收聊天记录。
7. 后台可以根据 message_hash 去重。
8. 后台可以根据 occurred_at 统一排序。
9. 后台可以按日期生成 Markdown 日报。
10. 提供一个简单 Web 页面查看每日总结。
11. 提供接口返回今日总结、指定日期总结。
12. 支持将总结复制为 Markdown。
13. 支持将总结保存到当前项目的 `.ai-memory/daily-summary.md`。

### 第一版不做

1. 不做商业化支付。
2. 不做多用户复杂权限系统。
3. 不做团队协作。
4. 不做 Cursor / Claude Code / Cline / Copilot 支持。
5. 不做浏览器插件。
6. 不做复杂可视化图表。
7. 不做真正后台常驻系统服务。
8. 不要求 VS Code 关闭时仍能上传。
9. 不做实时流式总结。
10. 不做完整代码仓库分析。

---

## 6. 技术栈要求

### VS Code 插件

使用：

* TypeScript
* VS Code Extension API
* Node.js fs/path/crypto
* SecretStorage 保存 token
* workspaceState/globalState 保存配置和同步状态

插件功能包括：

* 命令注册
* 文件扫描
* JSONL 解析
* hash 生成
* API 上传
* Webview 展示状态
* Output Channel 打印日志

### 后台服务

优先使用：

* Next.js
* API Routes 或 Route Handlers
* Supabase PostgreSQL
* OpenAI API 或其他兼容 OpenAI 格式的大模型 API

也可以使用：

* FastAPI
* PostgreSQL

但优先用 Next.js + Supabase，因为部署方便。

### 数据库

使用 Supabase PostgreSQL。

需要提供 SQL migration 文件。

### 部署

第一版可以本地运行，也要支持部署到 Vercel。

---

## 7. 系统架构

整体结构：

```text
VS Code Extension
    ↓
Backend API
    ↓
Supabase PostgreSQL
    ↓
Summary Generator
    ↓
Web Dashboard / VS Code Webview
```

### 数据流

1. 插件启动。
2. 读取配置中的 Codex sessions 路径。
3. 扫描最近 7 天的 JSONL 聊天记录。
4. 解析出 message。
5. 生成 message_hash。
6. 上传到 `/api/sync`.
7. 后台写入 `raw_messages` 表。
8. 后台按日期和项目查询消息。
9. 调用 LLM 生成总结。
10. 保存到 `daily_summaries` 表。
11. 用户在页面或 VS Code 插件中查看总结。

---

## 8. Codex 聊天记录读取规则

第一版默认读取路径：

Windows：

```text
C:\Users\<username>\.codex\sessions
```

macOS / Linux：

```text
~/.codex/sessions
```

但不要写死路径。插件必须允许用户手动设置路径。

配置项：

```json
{
  "codexChatSync.sessionsPath": "",
  "codexChatSync.apiBaseUrl": "",
  "codexChatSync.autoSyncEnabled": true,
  "codexChatSync.syncIntervalMinutes": 30,
  "codexChatSync.scanDays": 7
}
```

插件需要递归扫描 sessions 目录下的文件。

优先支持：

```text
.jsonl
.json
```

如果文件格式无法解析，要跳过并记录日志，不要让插件崩溃。

---

## 9. 聊天记录解析逻辑

Codex sessions 文件可能是 JSONL 格式，也可能是 JSON 格式。

### JSONL 解析

每一行尝试 `JSON.parse`。

如果解析失败，跳过该行，并记录错误。

### 消息字段提取

由于 Codex 本地格式可能变化，所以解析逻辑要尽量兼容。

每条记录尽量提取以下字段：

```ts
type ParsedMessage = {
  source: "codex";
  role: "user" | "assistant" | "system" | "tool" | "unknown";
  content: string;
  occurred_at: string | null;
  session_id: string | null;
  project_path: string | null;
  project_name: string | null;
  file_path: string;
  raw: any;
};
```

字段提取优先级：

### role

尝试从以下字段读取：

```text
role
type
message.role
author.role
```

如果无法判断，设为 `unknown`。

### content

尝试从以下字段读取：

```text
content
text
message.content
message.text
delta
```

如果是数组，需要合并文本内容。

如果没有文本内容，跳过该条。

### occurred_at

尝试从以下字段读取：

```text
timestamp
created_at
createdAt
time
message.timestamp
```

如果没有时间，使用文件修改时间。

如果同一文件多条消息都没有时间，则使用：

```text
文件修改时间 + message index
```

保证同文件内部顺序不乱。

### session_id

优先从内容字段读取：

```text
session_id
sessionId
conversation_id
conversationId
id
```

如果没有，则使用文件名生成 session_id。

### project_path / project_name

优先从消息字段读取：

```text
cwd
workspace
workspacePath
project_path
projectPath
```

如果没有，则使用当前 VS Code workspace 的根目录。

project_name 使用 workspace 文件夹名。

---

## 10. 插件功能需求

### 10.1 命令列表

插件需要注册以下命令：

```text
Codex Chat Sync: Sync Now
Codex Chat Sync: Open Dashboard
Codex Chat Sync: Generate Today Summary
Codex Chat Sync: Save Summary to Workspace
Codex Chat Sync: Configure
Codex Chat Sync: Show Logs
```

### 10.2 Sync Now

用户点击后：

1. 读取配置。
2. 检查 sessionsPath 是否存在。
3. 如果不存在，提示用户配置路径。
4. 扫描最近 N 天文件。
5. 解析消息。
6. 生成 hash。
7. 批量上传。
8. 显示同步结果。

同步结果包括：

```text
Scanned files: 12
Parsed messages: 328
Uploaded messages: 96
Skipped duplicates: 232
Failed messages: 0
```

### 10.3 自动同步

插件激活时：

1. 检查 autoSyncEnabled。
2. 如果开启，立即执行一次 sync。
3. 然后按 syncIntervalMinutes 设置定时器。
4. 默认 30 分钟同步一次。

注意：

VS Code 关闭时插件不会运行，所以不要承诺真正的后台定时上传。

### 10.4 补传逻辑

每次同步时，不只扫描当天，而是扫描最近 scanDays 天，默认 7 天。

这样可以解决：

* 公司电脑当天没开机
* 家里电脑第二天才打开
* 上一次上传失败
* 网络异常

### 10.5 本地同步状态

插件本地保存：

```ts
type SyncState = {
  lastSyncAt: string;
  lastSuccessSyncAt: string;
  uploadedMessageHashes: string[];
};
```

注意：

即使本地保存 hash，后台仍然必须做唯一索引去重。

### 10.6 日志

插件需要创建 Output Channel：

```text
Codex Chat Sync
```

所有同步、解析、上传错误都写入日志。

不要把敏感内容完整打印到日志。

---

## 11. 后台 API 需求

### 11.1 POST /api/sync

用于接收插件上传的聊天记录。

请求体：

```json
{
  "device": {
    "device_id": "string",
    "device_name": "Company PC",
    "os": "win32"
  },
  "workspace": {
    "project_name": "crm-tool",
    "project_path_hash": "sha256"
  },
  "messages": [
    {
      "source": "codex",
      "session_id": "string",
      "message_hash": "sha256",
      "role": "user",
      "content": "message content",
      "occurred_at": "2026-07-04T10:30:00.000Z",
      "file_path_hash": "sha256",
      "raw": {}
    }
  ]
}
```

返回：

```json
{
  "ok": true,
  "received": 120,
  "inserted": 45,
  "duplicates": 75
}
```

### 11.2 GET /api/summaries/today

返回今天总结。

### 11.3 GET /api/summaries?date=YYYY-MM-DD

返回指定日期总结。

### 11.4 POST /api/summaries/generate

生成指定日期总结。

请求体：

```json
{
  "date": "2026-07-04"
}
```

返回：

```json
{
  "ok": true,
  "summary": "markdown content"
}
```

### 11.5 GET /api/sync/status

返回最近同步状态。

---

## 12. 数据库设计

### devices 表

```sql
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  device_id text not null unique,
  device_name text,
  os text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### raw_messages 表

```sql
create table if not exists raw_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  device_id text not null,
  source text not null default 'codex',
  project_name text,
  project_path_hash text,
  session_id text,
  message_hash text not null unique,
  role text,
  content text not null,
  raw_json jsonb,
  occurred_at timestamptz not null,
  uploaded_at timestamptz default now()
);
```

索引：

```sql
create index if not exists idx_raw_messages_occurred_at on raw_messages(occurred_at);
create index if not exists idx_raw_messages_project_name on raw_messages(project_name);
create index if not exists idx_raw_messages_device_id on raw_messages(device_id);
create index if not exists idx_raw_messages_session_id on raw_messages(session_id);
```

### daily_summaries 表

```sql
create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default',
  date date not null,
  summary_markdown text not null,
  projects_json jsonb,
  todos_json jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);
```

---

## 13. 总结生成规则

日报必须输出 Markdown。

格式如下：

```markdown
# AI Coding Daily Summary - YYYY-MM-DD

## 1. 今日总览

用 3-5 句话总结今天整体做了什么。

## 2. 按项目整理

### 项目 A

#### 今日进展
- ...

#### 关键讨论
- ...

#### 涉及文件
- ...

#### 已解决问题
- ...

#### 未解决问题
- ...

#### 下一步 Todo
- ...

### 项目 B

同上。

## 3. 关键技术决策

- ...

## 4. Bug / 风险 / 阻塞点

- ...

## 5. 明天建议继续做什么

- ...

## 6. 可复制给 AI 的上下文

下面这段内容要适合第二天直接发给 Codex：

「这是昨天的项目上下文总结：……」
```

总结时要求：

1. 不要逐条复述聊天。
2. 提炼成项目进展。
3. 把多设备聊天按 occurred_at 合并。
4. 优先保留任务、决策、Bug、文件名、代码改动意图。
5. 如果内容太多，按项目分组。
6. 如果信息不足，要明确写“聊天记录中没有足够信息判断”。

---

## 14. LLM Prompt

后台生成总结时使用以下 Prompt：

```text
你是一个 AI 编程项目经理助手。

用户每天会在不同电脑上使用 Codex 进行 AI 编程聊天。下面是某一天的聊天记录，已经按真实发生时间排序。

你的任务不是简单总结聊天，而是把这些聊天记录整理成“AI 编程日报”和“项目记忆”。

请重点提炼：
1. 今天做了什么
2. 哪些项目被讨论
3. 每个项目的当前进展
4. AI 帮忙解决了哪些问题
5. 涉及了哪些文件、模块、功能
6. 做了哪些关键技术决策
7. 还有哪些 Bug、风险、阻塞点
8. 明天应该继续做什么
9. 最后一段生成“可直接复制给 Codex 的上下文”，方便用户第二天继续开发

要求：
- 使用中文输出。
- 使用 Markdown。
- 不要逐条复述聊天。
- 不要编造聊天记录中没有的信息。
- 如果某些信息不明确，请写“不明确”。
- 按项目分组。
- 保留重要文件名、函数名、错误信息、技术栈信息。
- 输出要简洁但有用。
```

---

## 15. 隐私与安全需求

聊天记录可能包含敏感信息，因此第一版必须做基本脱敏。

### 插件上传前脱敏

需要过滤：

```text
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
JWT
password
secret
token
Authorization: Bearer
sk-
```

将疑似密钥替换为：

```text
[REDACTED_SECRET]
```

### 路径隐私

不要直接上传完整本地路径，例如：

```text
C:\Users\18441\Desktop\project
```

只上传：

```text
project_name
project_path_hash
```

### 日志隐私

插件日志不要完整打印聊天内容。

只打印：

```text
message_hash
role
content length
occurred_at
```

---

## 16. VS Code Webview 页面

插件内提供一个简单 Dashboard。

内容包括：

```text
Codex Chat Sync

Status:
- Auto Sync: Enabled
- Last Sync: 2026-07-04 21:30
- Last Result: Uploaded 45 new messages
- Device: Home PC
- Sessions Path: C:\Users\xxx\.codex\sessions

Actions:
[Sync Now]
[Generate Today Summary]
[Open Today Summary]
[Save Summary to Workspace]
[Open Logs]
```

不需要做复杂 UI，简单可用即可。

---

## 17. Web Dashboard 页面

后台提供一个简单页面：

```text
/summaries
```

功能：

1. 显示日期列表。
2. 点击日期查看总结。
3. 支持复制 Markdown。
4. 支持重新生成总结。
5. 显示当天消息数量、项目数量、设备数量。

页面样式简单即可。

---

## 18. 保存总结到项目

插件命令：

```text
Codex Chat Sync: Save Summary to Workspace
```

执行逻辑：

1. 调用 `/api/summaries/today`。
2. 获取 Markdown。
3. 在当前 workspace 根目录创建：

```text
.ai-memory/
```

4. 写入：

```text
.ai-memory/daily-summary.md
```

5. 如果已存在，则覆盖。
6. 写入成功后提示用户。

后续可以扩展为：

```text
.ai-memory/2026-07-04.md
.ai-memory/latest.md
```

但第一版只需要 `daily-summary.md`。

---

## 19. 错误处理

### 插件侧

必须处理：

1. sessionsPath 不存在。
2. 没有配置 API 地址。
3. 没有配置 token。
4. 文件读取失败。
5. JSON 解析失败。
6. 网络请求失败。
7. 后台返回错误。
8. 当前没有 workspace。
9. 总结为空。

错误提示要清晰，例如：

```text
Codex sessions path not found. Please configure it first.
```

### 后台侧

必须处理：

1. 请求体为空。
2. messages 不是数组。
3. message_hash 缺失。
4. content 为空。
5. occurred_at 无效。
6. 数据库写入失败。
7. LLM API 调用失败。
8. 当天没有聊天记录。

---

## 20. 开发目录结构建议

建议使用 monorepo：

```text
codex-chat-auto-sync/
├── apps/
│   ├── extension/
│   │   ├── src/
│   │   │   ├── extension.ts
│   │   │   ├── sync.ts
│   │   │   ├── parser.ts
│   │   │   ├── redactor.ts
│   │   │   ├── apiClient.ts
│   │   │   ├── dashboard.ts
│   │   │   └── utils.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   ├── sync/route.ts
│       │   │   ├── summaries/route.ts
│       │   │   └── summaries/generate/route.ts
│       │   ├── summaries/page.tsx
│       │   └── page.tsx
│       ├── lib/
│       │   ├── supabase.ts
│       │   ├── summarize.ts
│       │   └── auth.ts
│       └── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_init.sql
│
├── package.json
└── README.md
```

---

## 21. 环境变量

Web 后台需要：

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
SYNC_API_TOKEN=
OPENAI_BASE_URL=
OPENAI_MODEL=
```

说明：

* `SYNC_API_TOKEN` 用于插件上传鉴权。
* 第一版可以只用一个固定 token，不做用户系统。
* 插件端保存这个 token。

---

## 22. 鉴权方式

第一版使用简单 Bearer Token。

插件请求 Header：

```http
Authorization: Bearer <SYNC_API_TOKEN>
```

后台校验：

```ts
const auth = request.headers.get("authorization");
if (auth !== `Bearer ${process.env.SYNC_API_TOKEN}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

---

## 23. 验收标准

### 插件验收

1. 可以在 VS Code 中安装并启动插件。
2. 可以配置 Codex sessions 路径。
3. 可以配置 API Base URL。
4. 可以配置 token。
5. 点击 Sync Now 后可以扫描本地 Codex sessions 文件。
6. 可以解析 JSONL 文件。
7. 可以上传消息到后台。
8. 自动同步可以正常运行。
9. Output Channel 有可读日志。
10. 可以把今日总结保存到 `.ai-memory/daily-summary.md`。

### 后台验收

1. `/api/sync` 可以接收消息。
2. 重复上传同一消息不会重复入库。
3. `raw_messages` 表中能看到上传记录。
4. 可以按日期查询消息。
5. 可以生成当天总结。
6. 总结保存到 `daily_summaries` 表。
7. `/summaries` 页面可以查看总结。
8. 重新生成总结不会插入重复总结，而是更新已有总结。

### 业务验收

1. 公司电脑和家里电脑上传的记录可以合并。
2. 合并时按 occurred_at 排序，而不是 uploaded_at。
3. 同一天多个项目可以分组总结。
4. 日报能提炼出 Todo、Bug、决策、项目进展。
5. 第二天可以复制日报内容继续喂给 Codex。

---

## 24. 开发步骤

请按以下顺序开发：

### Step 1：创建 monorepo

创建：

```text
apps/extension
apps/web
supabase/migrations
```

初始化 TypeScript、Next.js、VS Code Extension 项目。

### Step 2：实现数据库 migration

创建 `devices`、`raw_messages`、`daily_summaries` 三张表。

### Step 3：实现后台 `/api/sync`

完成：

* Bearer Token 鉴权
* 请求体验证
* devices upsert
* raw_messages 批量 insert
* message_hash 去重
* 返回 inserted / duplicates 数量

### Step 4：实现插件配置项

在 VS Code 插件 package.json 中增加配置项：

```json
codexChatSync.sessionsPath
codexChatSync.apiBaseUrl
codexChatSync.autoSyncEnabled
codexChatSync.syncIntervalMinutes
codexChatSync.scanDays
```

### Step 5：实现 Codex sessions 扫描

递归扫描 sessionsPath 下最近 N 天的 `.jsonl` 和 `.json` 文件。

### Step 6：实现 parser

解析 JSONL / JSON。

提取：

* role
* content
* occurred_at
* session_id
* raw

### Step 7：实现 redactor

上传前过滤敏感信息。

### Step 8：实现上传逻辑

批量 POST 到 `/api/sync`。

### Step 9：实现 Sync Now 命令

在 VS Code Command Palette 中可以执行同步。

### Step 10：实现自动同步

插件 activate 后自动同步一次，并设置 interval。

### Step 11：实现总结生成 API

实现：

```text
POST /api/summaries/generate
GET /api/summaries/today
GET /api/summaries?date=YYYY-MM-DD
```

### Step 12：实现 Web Dashboard

实现 `/summaries` 页面。

### Step 13：实现插件 Webview

展示同步状态和按钮。

### Step 14：实现保存总结到 workspace

将今日总结写入：

```text
.ai-memory/daily-summary.md
```

### Step 15：写 README

说明：

* 如何安装插件
* 如何配置 Codex sessions path
* 如何运行 web 后台
* 如何配置 Supabase
* 如何生成总结

---

## 25. README 必须包含

README 需要包含：

```text
1. 项目介绍
2. 功能列表
3. 本地开发步骤
4. Supabase 配置
5. 环境变量配置
6. VS Code 插件运行方式
7. Codex sessions 路径配置
8. 常见问题
9. 隐私说明
```

---

## 26. 注意事项

1. 不要假设 Codex sessions 格式永远固定。
2. parser 要宽松，不能因为一条记录失败导致整个同步失败。
3. 后台必须根据 message_hash 去重。
4. 时间线必须根据 occurred_at 排序。
5. 不要上传完整本地路径。
6. 不要在日志里打印完整聊天内容。
7. 插件不能依赖 VS Code 关闭后继续运行。
8. 第一版不要做复杂登录系统。
9. 第一版不要做多用户 SaaS。
10. 优先保证我自己能用。

---

## 27. 最终交付物

请最终交付：

1. 可运行的 VS Code 插件。
2. 可运行的 Next.js 后台。
3. Supabase migration SQL。
4. README。
5. 示例 `.env.example`。
6. 插件配置说明。
7. 一个可用的 `/summaries` 页面。
8. 能成功把总结保存到 `.ai-memory/daily-summary.md`。

---

## 28. 最小成功标准

本项目完成后，我应该能够做到：

1. 在公司电脑安装插件。
2. 配置 Codex sessions path、API URL、token。
3. 点击 Sync Now，上传公司电脑的 Codex 聊天记录。
4. 在家里电脑安装插件。
5. 配置同一个 API URL 和 token。
6. 点击 Sync Now，上传家里电脑的 Codex 聊天记录。
7. 后台能把两台电脑的聊天记录按真实时间合并。
8. 点击 Generate Today Summary。
9. 页面能看到当天 AI 编程日报。
10. 在 VS Code 里把日报保存到当前项目的 `.ai-memory/daily-summary.md`。