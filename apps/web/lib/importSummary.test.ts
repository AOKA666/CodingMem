import assert from "node:assert/strict";
import test from "node:test";
import { buildImportedSummaryRow, shouldCreateImportedSummary } from "./importSummary.ts";

test("buildImportedSummaryRow preserves the existing summary format and strips thinking text", () => {
  const row = buildImportedSummaryRow({
    date: "2026-07-13",
    summary: "<think>hidden</think>\n项目记忆总览\n工作助手完成了当天事项梳理。\n\n项目：工作助手\n功能变化：记录中没有足够信息判断。",
    source: "hermes-work-assistant",
    projects: ["工作助手"]
  });

  assert.equal(row.user_id, "default");
  assert.equal(row.date, "2026-07-13");
  assert.equal(row.summary_markdown.startsWith("项目记忆总览"), true);
  assert.equal(row.summary_markdown.includes("<think>"), false);
  assert.deepEqual(row.projects_json, ["工作助手"]);
  assert.deepEqual(row.todos_json, []);
  assert.equal(row.source, "hermes-work-assistant");
});

test("buildImportedSummaryRow rejects invalid dates and empty summaries", () => {
  assert.throws(
    () => buildImportedSummaryRow({ date: "2026/07/13", summary: "项目记忆总览", source: "hermes-work-assistant" }),
    /date 必须是 YYYY-MM-DD 格式/
  );
  assert.throws(
    () => buildImportedSummaryRow({ date: "2026-07-13", summary: "<think>only hidden</think>", source: "hermes-work-assistant" }),
    /summary 不能为空/
  );
});

test("shouldCreateImportedSummary never overwrites an existing daily summary", () => {
  assert.equal(shouldCreateImportedSummary(null), true);
  assert.equal(shouldCreateImportedSummary({ summary_markdown: "已经存在的总结" }), false);
});
