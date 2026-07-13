# Codex 聊天同步 / AI 编程记忆

这是一个 MVP，用于同步多台电脑上的本地 Codex 聊天记录，写入 Supabase 后台，并生成每日 AI 编程日报。

## 功能

- VS Code 插件可配置 Codex sessions 路径、后台 API 地址、同步 Token、自动同步间隔和扫描天数。
- 支持手动执行“立即同步”。
- VS Code 启动时自动同步，并默认每 30 分钟同步一次。
- 递归扫描最近 7 天的 `.jsonl` / `.json` session 文件。
- parser 会兼容 Codex 本地格式变化，单条解析失败不会中断整体同步。
- 上传前会脱敏常见密钥，并用 hash 代替完整本地路径。
- Next.js 后台提供 `/api/sync`，使用 Bearer Token 鉴权，并按 `message_hash` 去重。
- Supabase 表统一使用 `codingMem_` 前缀。
- 使用 MiniMax-M3 生成 Markdown 日报。
- `/summaries` 页面可查看日报、复制 Markdown、重新生成日报、修改当日项目名。
- VS Code 可把今日日报保存到当前项目的 `.ai-memory/daily-summary.md`。

## 本地开发

```bash
npm install
copy .env.example apps\web\.env.local
npm run dev:web
```

后台页面地址：

```text
http://localhost:3000/summaries
```

## Supabase 配置

1. 创建 Supabase 项目。
2. 在 Supabase SQL Editor 中执行 `supabase/migrations/001_init.sql`。
3. 把 Project URL 填入 `NEXT_PUBLIC_SUPABASE_URL`。
4. 把 Service Role Key 填入 `SUPABASE_SERVICE_ROLE_KEY`。

当前会创建三张表：

```text
codingMem_devices
codingMem_raw_messages
codingMem_daily_summaries
```

## 环境变量

在 `apps/web/.env.local` 中配置：

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SYNC_API_TOKEN=
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_MODEL=MiniMax-M3
```

说明：

- `SYNC_API_TOKEN` 是你自己设置的同步口令，VS Code 插件、Hermes 定时上传和后台必须一致。
- `MINIMAX_API_KEY` 是 MiniMax Token Plan 的订阅 Key。
- `MINIMAX_MODEL` 默认使用 `MiniMax-M3`。

## Hermes 工作助手定时总结

后续如果不再通过 Codex / VS Code 插件同步原始消息，可以让 Hermes 的“工作助手”每天定时生成总结，并直接上传到后台。

新增接口：

```text
POST /api/summaries/import
Authorization: Bearer <SYNC_API_TOKEN>
Content-Type: application/json
```

请求体：

```json
{
  "date": "2026-07-13",
  "source": "hermes-work-assistant",
  "projects": ["工作助手"],
  "summary": "项目记忆总览\n...\n\n项目：工作助手\n功能变化：...\n问题处理：...\n当前状态：...\n后续注意：..."
}
```

行为规则：

- 只负责写入之后新生成的总结。
- 如果某个日期已经存在总结，接口会返回 `skipped: true`，不会覆盖旧内容。
- 上传前仍会清理 `<think>` 标签和明显推理过程行。
- 总结格式规则不改，仍以后台 `apps/web/lib/summarize.ts` 里的 `SUMMARY_SYSTEM_PROMPT` 为准。
- 可通过 `GET /api/summaries/rules` 查看当前后台使用的总结规则，Hermes 定时任务应照这个规则生成内容。

Hermes cron 提示词应明确要求：只汇总“工作助手”的当天聊天记录；必须使用 `/api/summaries/rules` 返回的规则；生成后调用 `/api/summaries/import` 上传；不要重新生成或覆盖已有日期的总结。

## 运行 VS Code 插件

先编译：

```bash
npm run compile:extension
```

用 VS Code 打开这个目录：

```text
C:\Users\18441\Desktop\CodingMemory\apps\extension
```

按 `F5`，选择“运行扩展”。新窗口打开后，按 `Ctrl + Shift + P`，搜索：

```text
Codex 聊天同步
```

先执行：

```text
Codex 聊天同步：配置
```

需要填写：

- Codex sessions 路径，例如 `C:\Users\18441\.codex\sessions`
- API 地址，例如 `http://localhost:3000`
- 同步 Token，也就是 `.env.local` 里的 `SYNC_API_TOKEN`

## 常用命令

- `Codex 聊天同步：立即同步`
- `Codex 聊天同步：打开面板`
- `Codex 聊天同步：生成今日日报`
- `Codex 聊天同步：保存日报到项目`
- `Codex 聊天同步：配置`
- `Codex 聊天同步：查看日志`

## 修改项目名

打开：

```text
http://localhost:3000/summaries
```

页面会显示所选日期下的项目名。默认项目名来自同步时 VS Code 当前 workspace 的文件夹名。你可以在页面里直接修改项目名并保存。

修改后会更新当日 `codingMem_raw_messages` 里的 `project_name`。如果希望日报正文也使用新项目名，请再点击“重新生成日报”。

## 隐私说明

插件上传前会过滤常见敏感信息，例如 API Key、Bearer Token、password、secret、token、`sk-` 开头的密钥等。

插件不会上传完整本地项目路径或完整 session 文件路径，只上传：

```text
project_name
project_path_hash
file_path_hash
```

## 常见问题

- 找不到 Codex sessions 路径：运行“Codex 聊天同步：配置”，重新填写 sessions 路径。
- 还没有配置 API 地址：填写 `codexChatSync.apiBaseUrl`，本地开发通常是 `http://localhost:3000`。
- 还没有配置同步 Token：运行配置命令，填入和 `SYNC_API_TOKEN` 一样的值。
- 某天没有日报：先执行“立即同步”，再点击“重新生成日报”。
- 日报是占位内容：检查 `MINIMAX_API_KEY` 是否已经配置。
- 日报出现旧的 `<think>` 标签：重新生成日报；接口和页面也会自动清理这类标签。
