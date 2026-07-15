# PROJECT

- 项目名称：CodeMem
- 项目目标：汇总 AI 编程活动并生成每日项目记忆；早期兼容 VSCode/Codex 原始聊天记录，后续以 Hermes 每日汇总为主
- 当前阶段：MVP
- GitHub：https://github.com/AOKA666/CodingMem.git
- 线上地址：待补充
- 本地路径：`/root/.hermes/workspaces/gongzuozhushou/CodeMem`

# TODO

- [x] 移除记忆版本列表，默认展示当天最新项目记忆
- [x] 顶部日期筛选改为最长 31 天的范围
- [x] 使用每日项目记忆补齐未及时同步的原始时间线

# DECISIONS

- 本地档案名称使用 CodeMem，关联远程仓库 CodingMem
- 早期数据来自 VSCode/Codex 原始聊天记录；后续以 Hermes 汇总聊天并发送到后端的每日项目记忆为主
- 时间线合并原始记录与每日项目记忆，项目记忆负责补齐尚未同步的日期

# LOG

- 2026-07-15：克隆 CodingMem 仓库并创建项目档案；涉及文件：`PROJECT.md`；验证结果：仓库位于 `main` 分支并与 `origin/main` 同步
- 2026-07-15：移除记忆版本列表，新增最长 31 天日期范围筛选，并让每日项目记忆补齐时间线；涉及文件：`apps/web/app/summaries/page.tsx`、`apps/web/app/summaries/DateRangeFilter.tsx`、`apps/web/app/globals.css`、`apps/web/lib/dashboardRange.ts`、`apps/web/lib/dashboardRange.test.ts`、`apps/web/lib/summaryTimeline.ts`、`apps/web/lib/projectIdentity.ts`；验证结果：8 项测试通过、生产构建通过、临时预览验证通过
